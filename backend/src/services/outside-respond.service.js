const { eq, and } = require("drizzle-orm");
const { db, schema } = require("../db");
const AppError = require("../errors/AppError");
const ar = require("../translations/ar");
const withTransaction = require("../utils/withTransaction");
const RequestService = require("./request.service");
const { verifyOutsideAssignmentToken } = require("./outside-token");
const { findPostprocessor } = require("./instance-postprocessors");

function computeStatus(assignments, outsideAssignments) {
  const all = [...(assignments || []), ...(outsideAssignments || [])];
  if (all.length === 0) return "draft";
  if (all.some((a) => a.status === "rejected")) return "rejected";
  if (all.every((a) => a.status === "approved")) return "approved";
  return "pending";
}

class OutsideRespondService {
  /**
   * Hydrate the whole "respond view" — mirrors RequestService.getRequest but
   * without login: the token itself proves the outside supervisor's identity.
   */
  static async getByToken(token) {
    let payload;
    try {
      payload = verifyOutsideAssignmentToken(token);
    } catch (_e) {
      throw new AppError(ar.outside.linkInvalid, 401);
    }

    const supervisor = await db.query.outsideSupervisors.findFirst({
      where: eq(schema.outsideSupervisors.email, payload.email),
    });
    if (!supervisor) throw new AppError(ar.outside.notFound, 404);

    const assignment = await db.query.outsideRequestAssignments.findFirst({
      where: and(
        eq(schema.outsideRequestAssignments.requestId, payload.requestId),
        eq(schema.outsideRequestAssignments.outsideEmail, payload.email),
      ),
    });
    if (!assignment) throw new AppError(ar.outside.notFound, 404);

    const request = await db.query.requests.findFirst({
      where: eq(schema.requests.id, payload.requestId),
      with: RequestService._withDefault,
    });
    if (!request) throw new AppError(ar.request.notFound, 404);

    const view = RequestService._transformRequest(request);
    view.myOutsideAssignment = {
      status: assignment.status,
      rejectionReason: assignment.rejectionReason,
      respondedAt: assignment.respondedAt,
    };
    view.viewer = {
      email: supervisor.email,
      firstName: supervisor.firstName,
      lastName: supervisor.lastName,
      isIndustrial: supervisor.isIndustrial,
    };
    return view;
  }

  /**
   * Respond by token (approve/reject). No login. Never returns 401 unless
   * the token itself is invalid.
   */
  static async respondByToken(token, { newStatus, rejectionReason }) {
    let payload;
    try {
      payload = verifyOutsideAssignmentToken(token);
    } catch (_e) {
      throw new AppError(ar.outside.linkInvalid, 401);
    }
    const allowed = ["approved", "rejected"];
    if (!allowed.includes(newStatus)) {
      throw new AppError(ar.request.invalidResponseStatus, 400);
    }
    if (newStatus === "rejected" && !rejectionReason) {
      throw new AppError(ar.request.rejectionReasonRequired, 400);
    }

    return await withTransaction(async (tx) => {
      const assignment = await tx.query.outsideRequestAssignments.findFirst({
        where: and(
          eq(schema.outsideRequestAssignments.requestId, payload.requestId),
          eq(schema.outsideRequestAssignments.outsideEmail, payload.email),
        ),
      });
      if (!assignment) throw new AppError(ar.outside.notFound, 404);
      if (assignment.status !== "pending") {
        throw new AppError(ar.outside.alreadyResponded, 400);
      }

      await tx
        .update(schema.outsideRequestAssignments)
        .set({
          status: newStatus,
          rejectionReason: newStatus === "rejected" ? rejectionReason : null,
          respondedAt: new Date(),
        })
        .where(
          and(
            eq(schema.outsideRequestAssignments.requestId, payload.requestId),
            eq(schema.outsideRequestAssignments.outsideEmail, payload.email),
          ),
        );

      // Recompute request-level status using BOTH tables.
      const allA = await tx.query.requestAssignments.findMany({
        where: eq(schema.requestAssignments.requestId, payload.requestId),
      });
      const allO = await tx.query.outsideRequestAssignments.findMany({
        where: eq(
          schema.outsideRequestAssignments.requestId,
          payload.requestId,
        ),
      });
      const effective = computeStatus(allA, allO);

      // Reuse the same "advance instance / create next request" logic that
      // internal responses use. We do it inline here because respondToRequest
      // requires a logged-in User object.
      if (effective === "approved") {
        const req = await tx.query.requests.findFirst({
          where: eq(schema.requests.id, payload.requestId),
          columns: { id: true, instanceId: true, userId: true },
        });
        const instance = await tx.query.workflowInstances.findFirst({
          where: eq(schema.workflowInstances.id, req.instanceId),
          with: { stage: true },
        });
        const { nextStage } =
          await RequestService._resolveNextStageAndAssignees(
            instance,
            instance.stage.stageOrder,
            tx,
          );
        if (nextStage) {
          await tx
            .update(schema.workflowInstances)
            .set({ stageId: nextStage.id })
            .where(eq(schema.workflowInstances.id, instance.id));

          const reloaded = await tx.query.workflowInstances.findFirst({
            where: eq(schema.workflowInstances.id, instance.id),
            with: { stage: true },
          });
          const { nextStage: afterNext } =
            await RequestService._resolveNextStageAndAssignees(
              reloaded,
              reloaded.stage.stageOrder,
              tx,
            );
          if (afterNext) {
            if (nextStage.isMultiApproval) {
              const created = await RequestService.createRequest(
                instance.id,
                "",
                instance.userId,
                tx,
              );
              await RequestService.updateMyRequest(
                created,
                "pending",
                "",
                null,
                tx,
              );
            } else {
              await RequestService.createRequest(
                instance.id,
                "",
                instance.userId,
                tx,
              );
            }
          } else {
            await tx
              .update(schema.workflowInstances)
              .set({ status: "completed" })
              .where(eq(schema.workflowInstances.id, instance.id));
          }
        } else {
          await tx
            .update(schema.workflowInstances)
            .set({ status: "completed" })
            .where(eq(schema.workflowInstances.id, instance.id));
        }
      } else if (effective === "rejected") {
        const req = await tx.query.requests.findFirst({
          where: eq(schema.requests.id, payload.requestId),
          columns: { id: true, instanceId: true },
        });
        const instance = await tx.query.workflowInstances.findFirst({
          where: eq(schema.workflowInstances.id, req.instanceId),
          with: { stage: true },
        });
        let failedAtStageId = null;
        if (instance) {
          const { nextStage } =
            await RequestService._resolveNextStageAndAssignees(
              instance,
              instance.stage.stageOrder,
              tx,
            );
          failedAtStageId = nextStage?.id || instance.stage.id;
        }
        await tx
          .update(schema.workflowInstances)
          .set({ status: "rejected", rejectedAtStageId: failedAtStageId })
          .where(eq(schema.workflowInstances.id, req.instanceId));
      }

      return { ok: true, status: newStatus };
    });
  }
}

module.exports = OutsideRespondService;
