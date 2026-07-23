const { eq, and, ne, inArray, asc, sql } = require("drizzle-orm");
const { db, schema } = require("../db");
const AppError = require("../errors/AppError");
const DrizzleQueryBuilder = require("../utils/DrizzleQueryBuilder");
const withTransaction = require("../utils/withTransaction");
const DocumentService = require("./document.service");
const ar = require("../translations/ar");
const { findPrefiller } = require("./document-prefillers");

function computeRequestStatus(assignments) {
  if (!assignments || assignments.length === 0) return "draft";
  if (assignments.some((a) => a.status === "rejected")) return "rejected";
  if (assignments.every((a) => a.status === "approved")) return "approved";
  return "pending";
}

function attachDerived(request) {
  if (!request) return request;
  const plain = { ...request };
  plain.status = computeRequestStatus(plain.assignments);
  const pending = (plain.assignments || []).find((a) => a.status === "pending");
  plain.assignedToUserId = pending ? pending.assignedToUserId : null;
  return plain;
}

class RequestService {
  static ALLOWED_SORT_FIELDS = ["createdAt"];

  static _withDefault = {
    instance: {
      with: {
        student: true,
        workflow: { columns: { title: true } },
        documents: {
          columns: { id: true, stageOrder: true, templateId: true },
          with: { template: { columns: { title: true } } },
        },
      },
    },
    stage: { columns: { stageOrder: true } },
    user: {
      columns: { firstName: true, lastName: true, profilePicture: true },
    },
    assignments: {
      columns: {
        requestId: true,
        assignedToUserId: true,
        status: true,
        rejectionReason: true,
        isExtended: true,
        year: true,
        month: true,
        createdAt: true,
        updatedAt: true,
      },
      with: {
        assignee: {
          columns: {
            id: true,
            firstName: true,
            lastName: true,
            profilePicture: true,
            role: true,
          },
        },
      },
    },
  };

  static _transformRequest(request) {
    if (!request) return request;
    const plain = attachDerived(request);

    const requestStageOrder = plain.stage?.stageOrder ?? 0;
    const allInstanceDocs = plain.instance?.documents || [];
    plain.documents = allInstanceDocs
      .filter((d) => d.stageOrder <= requestStageOrder)
      .map((d) => ({
        id: d.id,
        stageOrder: d.stageOrder,
        templateId: d.templateId,
        name: d.template?.title || null,
      }));

    // ---- Recipients summary --------------------------------------------------
    const rawAssignments = Array.isArray(plain.assignments)
      ? plain.assignments
      : [];
    plain.recipients = rawAssignments.map((a) => ({
      userId: a.assignedToUserId,
      firstName: a.assignee?.firstName || null,
      lastName: a.assignee?.lastName || null,
      profilePicture: a.assignee?.profilePicture || null,
      role: a.assignee?.role || null,
      status: a.status,
      rejectionReason: a.rejectionReason || null,
      year: a.year ?? null,
      month: a.month ?? null,
    }));
    plain.recipientsSummary = {
      total: rawAssignments.length,
      approved: rawAssignments.filter((a) => a.status === "approved").length,
      rejected: rawAssignments.filter((a) => a.status === "rejected").length,
      pending: rawAssignments.filter((a) => a.status === "pending").length,
      responded: rawAssignments.filter((a) => a.status !== "pending").length,
    };
    // Do not leak the inner joined `assignee` blob back to the client.
    delete plain.assignments;
    // -------------------------------------------------------------------------

    plain.workflowTitle = plain.instance?.workflow?.title || null;
    plain.student = plain.instance?.student || null;

    delete plain.instance;
    return plain;
  }

  static async _fetchRequests(query, extraCondition) {
    const DEFAULT_SORT = "-createdAt";
    const q = { ...(query || {}) };
    const searchSort = q.sort ? q.sort.replace("-", "") : DEFAULT_SORT;
    if (!this.ALLOWED_SORT_FIELDS.includes(searchSort)) q.sort = DEFAULT_SORT;

    const statusFilter = q.status;
    delete q.status;

    const builder = new DrizzleQueryBuilder(q, schema.requests);
    builder.filter().sort().attributes();
    if (extraCondition) builder.andWhere(extraCondition);

    if (statusFilter) {
      if (statusFilter === "draft") {
        builder.andWhere(
          sql`NOT EXISTS (
            SELECT 1 FROM "RequestAssignments" ra
            WHERE ra."requestId" = ${schema.requests.id}
          )`,
        );
      } else {
        builder.andWhere(
          sql`EXISTS (
            SELECT 1 FROM "RequestAssignments" ra
            WHERE ra."requestId" = ${schema.requests.id}
              AND ra."status" = ${statusFilter}
          )`,
        );
      }
    }

    const opts = builder.get();
    opts.with = this._withDefault;

    const rows = await db.query.requests.findMany(opts);
    return rows.map((r) => this._transformRequest(r));
  }

  static getAllRequests(query) {
    return this._fetchRequests(query);
  }

  static getUserSentRequests(userId, query) {
    const q = { ...(query || {}) };
    const hasStatusFilter = !!q.status;
    const condition = eq(schema.requests.userId, userId);
    if (!hasStatusFilter) {
      return this._fetchRequests(
        q,
        and(
          condition,
          sql`EXISTS (
            SELECT 1 FROM "RequestAssignments" ra
            WHERE ra."requestId" = ${schema.requests.id}
          )`,
        ),
      );
    }
    return this._fetchRequests(q, condition);
  }

  static getUserIncomingRequests(userId, query) {
    return this._fetchRequests(
      query,
      sql`EXISTS (
        SELECT 1 FROM "RequestAssignments" ra
        WHERE ra."requestId" = ${schema.requests.id}
          AND ra."assignedToUserId" = ${userId}
      )`,
    );
  }

  static async getRequest(requestId, query, user) {
    const builder = new DrizzleQueryBuilder(query, schema.requests);
    const opts = builder.attributes().get();
    opts.where = eq(schema.requests.id, Number(requestId));
    opts.with = this._withDefault;

    const request = await db.query.requests.findFirst(opts);
    if (!request) throw new AppError(ar.request.notFound, 404);

    const access = await db.query.accesses.findFirst({
      where: and(
        eq(schema.accesses.requestId, request.id),
        eq(schema.accesses.userId, user.id),
      ),
      columns: { accessLevel: true },
    });

    if (!access?.accessLevel && user.role !== "administrator") {
      throw new AppError(ar.request.noPermission, 403);
    }

    return this._transformRequest(request);
  }

  // ---------------------------------------------------------------------------
  // Resolve assignees for the next stage AFTER `currentStageOrder`.
  //
  // Rules:
  //   - If the next stage doesn't exist → return { nextStage: null, assignees: [] }
  //   - If the next stage is multi-approval and the instance has included
  //     professors → return them all as assignees.
  //   - If the next stage is multi-approval but the instance has NO included
  //     professors → SKIP that stage entirely, and re-run resolution starting
  //     from the stage after it. This is where the "skip empty special stage"
  //     rule lives.
  //   - Otherwise resolve a single assignee based on role (existing behaviour).
  //
  // Returns { nextStage, assignees }.
  // ---------------------------------------------------------------------------
  static async _resolveNextStageAndAssignees(instance, currentStageOrder, tx) {
    let cursor = currentStageOrder;
    // Bound the loop by number of stages in the workflow — cannot exceed it.
    while (true) {
      const nextStage = await tx.query.stages.findFirst({
        where: and(
          eq(schema.stages.workflowId, instance.workflowId),
          eq(schema.stages.stageOrder, cursor + 1),
        ),
      });

      if (!nextStage) return { nextStage: null, assignees: [] };

      if (nextStage.isMultiApproval) {
        const included = await tx.query.instanceProfessors.findMany({
          where: eq(schema.instanceProfessors.instanceId, instance.id),
          columns: { userId: true },
        });
        if (included.length === 0) {
          // Skip: the special stage is a no-op when no professors were included.
          cursor = nextStage.stageOrder;
          continue;
        }
        return {
          nextStage,
          assignees: included.map((r) => r.userId),
        };
      }

      // Regular single-assignee resolution
      if (nextStage.role === "department_manager") {
        const dep = await tx.query.departments.findFirst({
          where: eq(schema.departments.id, instance.departmentId),
          with: { manager: { columns: { id: true } } },
        });
        return {
          nextStage,
          assignees: dep?.manager ? [dep.manager.id] : [instance.userId],
        };
      }
      if (nextStage.role === "administrator") {
        const dep = await tx.query.departments.findFirst({
          where: eq(schema.departments.id, instance.departmentId),
          with: { affairsEmployee: { columns: { id: true } } },
        });
        return {
          nextStage,
          assignees: dep?.affairsEmployee
            ? [dep.affairsEmployee.id]
            : [instance.userId],
        };
      }

      if (nextStage.role === "reviewer" || nextStage.role === "director") {
        // College-wide singleton roles. Pick the (first) user carrying that role.
        const roleUser = await tx.query.users.findFirst({
          where: eq(schema.users.role, nextStage.role),
          columns: { id: true },
          orderBy: (u, { asc }) => [asc(u.id)],
        });
        return {
          nextStage,
          assignees: roleUser ? [roleUser.id] : [instance.userId],
        };
      }

      // professor: back to the instance creator
      return { nextStage, assignees: [instance.userId] };
    }
  }
  static async createRequest(instanceId, note, userId, transaction) {
    const cb = async (tx) => {
      const instance = await tx.query.workflowInstances.findFirst({
        where: eq(schema.workflowInstances.id, Number(instanceId)),
        with: {
          student: true,
          department: true,
          professors: {
            with: {
              user: {
                columns: {
                  id: true,
                  firstName: true,
                  lastName: true,
                  academicDegreeAndInstitution: true,
                },
              },
            },
          },
          stage: {
            with: {
              conditions: { with: { template: true } },
            },
          },
        },
      });
      if (!instance) throw new AppError(ar.instance.notFound, 404);

      // Load the creator (needed for prefill supervisor list)
      const creatorUser = await tx.query.users.findFirst({
        where: eq(schema.users.id, userId),
        columns: {
          id: true,
          firstName: true,
          lastName: true,
          academicDegreeAndInstitution: true,
        },
      });

      const currentStageOrder = instance.stage.stageOrder;

      const [request] = await tx
        .insert(schema.requests)
        .values({
          instanceId,
          stageId: instance.stageId,
          note,
          userId,
        })
        .returning();

      // Creator gets edit access on the request
      await tx.insert(schema.accesses).values({
        requestId: request.id,
        userId,
        accessLevel: "edit",
      });

      // Documents for this stage — one per attached template. Idempotent per
      // (instanceId, stageOrder, templateId).
      const templates = (instance.stage.conditions || [])
        .map((c) => c.template)
        .filter(Boolean);

      if (templates.length > 0) {
        const templateIds = templates.map((t) => t.id);
        const existing = await tx.query.documents.findMany({
          where: and(
            eq(schema.documents.instanceId, instance.id),
            eq(schema.documents.stageOrder, currentStageOrder),
            inArray(schema.documents.templateId, templateIds),
          ),
          columns: { templateId: true },
        });
        const existingSet = new Set(existing.map((d) => d.templateId));

        const toInsert = [];
        for (const tpl of templates) {
          if (existingSet.has(tpl.id)) continue;
          const prefiller = findPrefiller(tpl);
          const initialData = prefiller
            ? prefiller.buildInitialData({ instance, creatorUser })
            : null;
          toInsert.push({
            templateId: tpl.id,
            data: initialData,
            instanceId: instance.id,
            stageOrder: currentStageOrder,
          });
        }
        if (toInsert.length) {
          await tx.insert(schema.documents).values(toInsert);
        }
      }

      const instanceDocs = await tx.query.documents.findMany({
        where: eq(schema.documents.instanceId, instance.id),
        columns: { id: true, stageOrder: true, templateId: true },
        with: { template: { columns: { title: true } } },
      });
      request.documents = instanceDocs
        .filter((d) => d.stageOrder <= currentStageOrder)
        .map((d) => ({
          id: d.id,
          stageOrder: d.stageOrder,
          templateId: d.templateId,
          name: d.template?.title || null,
        }));
      request.assignments = [];
      return attachDerived(request);
    };

    if (transaction) return await cb(transaction);
    return await withTransaction(cb);
  }

  static async getRequestById(requestId) {
    const request = await db.query.requests.findFirst({
      where: eq(schema.requests.id, Number(requestId)),
      with: { assignments: true },
    });
    if (!request) throw new AppError(ar.request.notFound, 404);
    return attachDerived(request);
  }

  static async updateMyRequest(
    request,
    status,
    note,
    _assignedTo,
    transaction,
  ) {
    const cb = async (tx) => {
      const allowedStatuses = ["pending", "draft"];
      if (!allowedStatuses.includes(status)) {
        throw new AppError(ar.request.invalidStatus(status), 400);
      }

      if (note && note !== request.note) {
        await tx
          .update(schema.requests)
          .set({ note })
          .where(eq(schema.requests.id, request.id));
        request.note = note;
      }

      if (status === "pending") {
        const fullInstance = await tx.query.workflowInstances.findFirst({
          where: eq(schema.workflowInstances.id, request.instanceId),
          with: { stage: true },
        });
        if (!fullInstance) throw new AppError(ar.instance.notFound, 404);

        const { assignees } =
          await RequestService._resolveNextStageAndAssignees(
            fullInstance,
            fullInstance.stage.stageOrder,
            tx,
          );
        if (assignees.length === 0) {
          throw new AppError(ar.request.cannotSendNoAssignments, 400);
        }

        // Validate documents produced at the CURRENT stage of this instance
        const documents = await tx.query.documents.findMany({
          where: and(
            eq(schema.documents.instanceId, request.instanceId),
            eq(schema.documents.stageOrder, fullInstance.stage.stageOrder),
          ),
        });
        await DocumentService.validateDocumentsData(documents, false);

        for (const assigneeId of assignees) {
          const existing = await tx.query.requestAssignments.findFirst({
            where: and(
              eq(schema.requestAssignments.requestId, request.id),
              eq(schema.requestAssignments.assignedToUserId, assigneeId),
            ),
          });
          if (existing) continue;

          await tx.insert(schema.requestAssignments).values({
            requestId: request.id,
            assignedToUserId: assigneeId,
            status: "pending",
          });

          const existingAccess = await tx.query.accesses.findFirst({
            where: and(
              eq(schema.accesses.requestId, request.id),
              eq(schema.accesses.userId, assigneeId),
            ),
          });
          if (existingAccess) {
            await tx
              .update(schema.accesses)
              .set({ accessLevel: "respond" })
              .where(
                and(
                  eq(schema.accesses.requestId, request.id),
                  eq(schema.accesses.userId, assigneeId),
                ),
              );
          } else {
            await tx.insert(schema.accesses).values({
              requestId: request.id,
              userId: assigneeId,
              accessLevel: "respond",
            });
          }
        }

        await tx
          .update(schema.accesses)
          .set({ accessLevel: "read" })
          .where(
            and(
              eq(schema.accesses.requestId, request.id),
              eq(schema.accesses.userId, request.userId),
            ),
          );

        if (!request.sentAt) {
          await tx
            .update(schema.requests)
            .set({ sentAt: new Date() })
            .where(eq(schema.requests.id, request.id));
        }
      }

      const updated = await tx.query.requests.findFirst({
        where: eq(schema.requests.id, request.id),
        with: { assignments: true },
      });
      return attachDerived(updated);
    };

    if (transaction) return await cb(transaction);
    return await withTransaction(cb);
  }

  static async advanceInstance(instanceId, transaction) {
    const cb = async (tx) => {
      const instance = await tx.query.workflowInstances.findFirst({
        where: eq(schema.workflowInstances.id, Number(instanceId)),
        with: { stage: true },
      });
      if (!instance) throw new AppError(ar.instance.notFound, 404);

      const { nextStage, assignees } =
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

        // If there is yet another stage after nextStage, create the next request now
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
          await RequestService.createRequest(
            instance.id,
            "",
            instance.userId,
            tx,
          );
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

      return await tx.query.workflowInstances.findFirst({
        where: eq(schema.workflowInstances.id, instance.id),
        with: { stage: true },
      });
    };

    if (transaction) return await cb(transaction);
    return await withTransaction(cb);
  }

  static async respondToRequest(
    request,
    newStatus,
    rejectionReason,
    user,
    transaction,
    extra = {},
  ) {
    const cb = async (tx) => {
      const allowedStatuses = ["approved", "rejected"];
      if (!allowedStatuses.includes(newStatus)) {
        throw new AppError(ar.request.invalidResponseStatus, 400);
      }
      if (newStatus === "rejected" && !rejectionReason) {
        throw new AppError(ar.request.rejectionReasonRequired, 400);
      }

      // ---- year / month: required only for department_manager -----------------
      let yearVal = null;
      let monthVal = null;
      let extendedVal = null;

      if (user.role === "department_manager") {
        const rawYear = extra?.year;
        const rawMonth = extra?.month;
        if (rawYear === undefined || rawYear === null || rawYear === "") {
          throw new AppError(ar.request.yearRequired, 400);
        }
        if (rawMonth === undefined || rawMonth === null || rawMonth === "") {
          throw new AppError(ar.request.monthRequired, 400);
        }
        yearVal = Number.parseInt(rawYear, 10);
        monthVal = Number.parseInt(rawMonth, 10);
        if (!Number.isInteger(yearVal) || yearVal < 1900 || yearVal > 3000) {
          throw new AppError(ar.request.yearRequired, 400);
        }
        if (!Number.isInteger(monthVal) || monthVal < 1 || monthVal > 12) {
          throw new AppError(ar.request.monthOutOfRange, 400);
        }

        if (monthVal === 8) {
          throw new AppError(ar.request.invalidMonth, 400);
        }
      } else {
        // Non-managers must not smuggle these values in.
        if (extra?.year !== undefined || extra?.month !== undefined) {
          yearVal = null;
          monthVal = null;
        }

        extendedVal = !!extra?.isExtended;
      }
      // -------------------------------------------------------------------------

      const assignment = await tx.query.requestAssignments.findFirst({
        where: and(
          eq(schema.requestAssignments.requestId, request.id),
          eq(schema.requestAssignments.assignedToUserId, user.id),
        ),
      });
      if (!assignment) throw new AppError(ar.request.notAssignedToUser, 403);
      if (assignment.status !== "pending") {
        throw new AppError(ar.request.alreadyResponded, 400);
      }

      await tx
        .update(schema.requestAssignments)
        .set({
          status: newStatus,
          rejectionReason: newStatus === "rejected" ? rejectionReason : null,
          year: yearVal,
          month: monthVal,
          isExtended: extendedVal,
        })
        .where(
          and(
            eq(schema.requestAssignments.requestId, request.id),
            eq(schema.requestAssignments.assignedToUserId, user.id),
          ),
        );

      const allAssignments = await tx.query.requestAssignments.findMany({
        where: eq(schema.requestAssignments.requestId, request.id),
      });
      const effectiveStatus = computeRequestStatus(allAssignments);

      if (effectiveStatus === "approved") {
        // Advance one stage, using the same skip-empty-multi-approval rules.
        const instance = await tx.query.workflowInstances.findFirst({
          where: eq(schema.workflowInstances.id, request.instanceId),
          with: { stage: true },
        });
        if (!instance) throw new AppError(ar.instance.notFound, 404);

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
              await RequestService.createRequest(instance.id, "", user.id, tx);
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
      } else if (effectiveStatus === "rejected") {
        const instance = await tx.query.workflowInstances.findFirst({
          where: eq(schema.workflowInstances.id, request.instanceId),
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
          .set({
            status: "rejected",
            rejectedAtStageId: failedAtStageId,
          })
          .where(eq(schema.workflowInstances.id, request.instanceId));
      }

      const updated = await tx.query.requests.findFirst({
        where: eq(schema.requests.id, request.id),
        with: { assignments: true },
      });

      const liveInstance = await tx.query.workflowInstances.findFirst({
        where: eq(schema.workflowInstances.id, request.instanceId),
        columns: {
          id: true,
          status: true,
          stageId: true,
          workflowId: true,
        },
      });

      let newDraft = null;
      if (liveInstance && liveInstance.status !== "rejected") {
        newDraft = await tx.query.requests.findFirst({
          where: and(
            eq(schema.requests.instanceId, request.instanceId),
            ne(schema.requests.id, request.id),
          ),
          columns: { id: true, userId: true, instanceId: true, sentAt: true },
          orderBy: (r, { desc }) => [desc(r.createdAt)],
        });
        if (newDraft && newDraft.sentAt) {
          // It's not a draft — ignore.
          newDraft = null;
        }
      }

      const result = attachDerived(updated);
      result.instanceStatus = liveInstance?.status || null;
      if (newDraft) {
        result.nextDraft = {
          requestId: newDraft.id,
          instanceId: newDraft.instanceId,
          workflowId: liveInstance.workflowId,
          userId: newDraft.userId,
        };
      } else {
        result.nextDraft = null;
      }
      return result;
    };

    if (transaction) return await cb(transaction);
    return await withTransaction(cb);
  }

  static async deleteRequest(requestId, user, transaction) {
    const cb = async (tx) => {
      const request = await tx.query.requests.findFirst({
        where: eq(schema.requests.id, Number(requestId)),
        with: { assignments: true },
      });
      if (!request) throw new AppError(ar.request.notFound, 404);

      // Only the request's owner can delete it, and only while it's still a
      // draft (i.e. no assignments have been created yet).
      const isOwner = request.userId === user.id;
      const isAdmin = user.role === "administrator";
      const isDraft = !request.assignments || request.assignments.length === 0;

      if (!isAdmin && !isOwner) {
        throw new AppError(ar.request.noPermissionToDelete, 403);
      }
      if (!isAdmin && !isDraft) {
        throw new AppError(ar.request.cannotDeleteNonDraft, 400);
      }

      // Accesses + RequestAssignments cascade automatically via FK constraints.
      // Documents live on the instance, not the request — leave them alone.
      await tx
        .delete(schema.requests)
        .where(eq(schema.requests.id, request.id));
      return { id: request.id };
    };

    if (transaction) return await cb(transaction);
    return await withTransaction(cb);
  }
}

module.exports = RequestService;
