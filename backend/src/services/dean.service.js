const { eq, and, sql, asc, desc } = require("drizzle-orm");
const { db, schema } = require("../db");
const AppError = require("../errors/AppError");
const withTransaction = require("../utils/withTransaction");
const ar = require("../translations/ar");
const { findPostprocessor } = require("./instance-postprocessors");

const DEAN_WITH = {
  workflow: { columns: { id: true, title: true } },
  stage: {
    columns: { id: true, stageOrder: true, title: true, isMultiApproval: true },
  },
  student: true,
  department: { columns: { id: true, name: true } },
  user: {
    columns: {
      id: true,
      firstName: true,
      lastName: true,
      profilePicture: true,
    },
  },
  professors: {
    with: {
      user: {
        columns: {
          id: true,
          firstName: true,
          lastName: true,
          profilePicture: true,
          academicDegreeAndInstitution: true,
        },
      },
    },
  },
  documents: {
    columns: { id: true, stageOrder: true, templateId: true },
    with: { template: { columns: { id: true, title: true } } },
  },
  deanReviewedBy: {
    columns: { id: true, firstName: true, lastName: true },
  },
};

class DeanService {
  // Instances that reached the dean's inbox: completed but not yet reviewed,
  // plus any already-executed/rejected instances for full history browsing.
  static async listCompletedInstances(query = {}) {
    const includeExecuted = query.include === "all";

    const rows = await db.query.workflowInstances.findMany({
      where: includeExecuted
        ? sql`${schema.workflowInstances.status} IN ('completed','executed','rejected')`
        : eq(schema.workflowInstances.status, "completed"),
      with: DEAN_WITH,
      orderBy: [desc(schema.workflowInstances.updatedAt)],
    });
    return rows;
  }

  static async countPending() {
    const rows = await db
      .select({ n: sql`COUNT(*)` })
      .from(schema.workflowInstances)
      .where(eq(schema.workflowInstances.status, "completed"));
    return Number(rows[0]?.n || 0);
  }

  static async getInstance(instanceId) {
    const instance = await db.query.workflowInstances.findFirst({
      where: eq(schema.workflowInstances.id, Number(instanceId)),
      with: DEAN_WITH,
    });
    if (!instance) throw new AppError(ar.instance.notFound, 404);

    // Group docs by stageOrder so the FE can render them next to the stage.
    const docsByStage = new Map();
    for (const d of instance.documents || []) {
      const list = docsByStage.get(d.stageOrder) || [];
      list.push(d);
      docsByStage.set(d.stageOrder, list);
    }

    const workflow = await db.query.workflows.findFirst({
      where: eq(schema.workflows.id, instance.workflowId),
      with: {
        stages: {
          orderBy: [asc(schema.stages.stageOrder)],
        },
      },
    });

    const stageBlocks = (workflow?.stages || []).map((s) => ({
      id: s.id,
      title: s.title,
      stageOrder: s.stageOrder,
      role: s.role,
      isMultiApproval: !!s.isMultiApproval,
      documents: (docsByStage.get(s.stageOrder) || []).map((d) => ({
        id: d.id,
        templateId: d.templateId,
        name: d.template?.title || null,
      })),
    }));

    return { instance, stageBlocks };
  }

  static async executeInstance(instanceId, dean) {
    return await withTransaction(async (tx) => {
      const instance = await tx.query.workflowInstances.findFirst({
        where: eq(schema.workflowInstances.id, Number(instanceId)),
        with: {
          professors: true,
          workflow: { columns: { title: true } },
        },
      });
      if (!instance) throw new AppError(ar.instance.notFound, 404);
      if (instance.status !== "completed") {
        throw new AppError(ar.dean.instanceNotCompleted, 400);
      }

      const post = findPostprocessor(instance.workflow?.title);
      if (post) await post.execute(instance, tx);

      const [updated] = await tx
        .update(schema.workflowInstances)
        .set({
          status: "executed",
          deanReviewedById: dean.id,
          deanReviewedAt: new Date(),
          deanRejectionReason: null,
        })
        .where(eq(schema.workflowInstances.id, instance.id))
        .returning();
      return updated;
    });
  }

  static async rejectInstance(instanceId, dean, rejectionReason) {
    if (!rejectionReason || !String(rejectionReason).trim()) {
      throw new AppError(ar.request.rejectionReasonRequired, 400);
    }
    return await withTransaction(async (tx) => {
      const instance = await tx.query.workflowInstances.findFirst({
        where: eq(schema.workflowInstances.id, Number(instanceId)),
      });
      if (!instance) throw new AppError(ar.instance.notFound, 404);
      if (instance.status !== "completed") {
        throw new AppError(ar.dean.instanceNotCompleted, 400);
      }

      const [updated] = await tx
        .update(schema.workflowInstances)
        .set({
          status: "rejected",
          deanReviewedById: dean.id,
          deanReviewedAt: new Date(),
          deanRejectionReason: rejectionReason,
        })
        .where(eq(schema.workflowInstances.id, instance.id))
        .returning();
      return updated;
    });
  }
}

module.exports = DeanService;
