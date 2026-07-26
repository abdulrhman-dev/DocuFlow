const {
  eq,
  and,
  inArray,
  desc,
  sql,
  or,
  ilike,
  asc,
  exists,
} = require("drizzle-orm");
const { db, schema } = require("../db");
const AppError = require("../errors/AppError");
const withTransaction = require("../utils/withTransaction");
const ar = require("../translations/ar");
const { findPostprocessor } = require("./instance-postprocessors");

const DIRECTOR_WITH = {
  workflow: { columns: { id: true, title: true } },
  stage: { columns: { id: true, stageOrder: true, title: true } },
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
  printedBy: { columns: { id: true, firstName: true, lastName: true } },
  approvedBy: { columns: { id: true, firstName: true, lastName: true } },
};

class DirectorService {
  // Search only "printed" (waiting director) instances.
  static async search({ q = "" } = {}) {
    if (!q || !q.trim()) {
      return db.query.workflowInstances.findMany({
        where: eq(schema.workflowInstances.status, "printed"),
        with: DIRECTOR_WITH,
        orderBy: [desc(schema.workflowInstances.updatedAt)],
      });
    }

    const like = `%${q.trim()}%`;

    const matchingIds = await db
      .select({ id: schema.workflowInstances.id })
      .from(schema.workflowInstances)
      .leftJoin(
        schema.students,
        eq(schema.students.code, schema.workflowInstances.studentId),
      )
      .leftJoin(
        schema.workflows,
        eq(schema.workflows.id, schema.workflowInstances.workflowId),
      )
      .where(
        and(
          eq(schema.workflowInstances.status, "printed"),
          or(
            ilike(schema.students.name, like),
            ilike(schema.students.code, like),
            ilike(schema.workflows.title, like),
          ),
        ),
      );

    return db.query.workflowInstances.findMany({
      where: inArray(
        schema.workflowInstances.id,
        matchingIds.map((r) => r.id),
      ),
      with: DIRECTOR_WITH,
      orderBy: [desc(schema.workflowInstances.updatedAt)],
    });
  }

  static async countPending() {
    const rows = await db
      .select({ n: sql`COUNT(*)` })
      .from(schema.workflowInstances)
      .where(eq(schema.workflowInstances.status, "printed"));
    return Number(rows[0]?.n || 0);
  }

  static async getInstance(instanceId) {
    const instance = await db.query.workflowInstances.findFirst({
      where: eq(schema.workflowInstances.id, Number(instanceId)),
      with: DIRECTOR_WITH,
    });
    if (!instance) throw new AppError(ar.instance.notFound, 404);
    return instance;
  }

  static async approve(instanceIds, approvalFile, director) {
    const ids = (instanceIds || []).map((n) => Number(n)).filter(Boolean);
    if (!ids.length) throw new AppError(ar.director.selectAtLeastOne, 400);
    if (!approvalFile)
      throw new AppError(ar.director.approvalFileRequired, 400);

    return await withTransaction(async (tx) => {
      const rows = await tx.query.workflowInstances.findMany({
        where: inArray(schema.workflowInstances.id, ids),
        with: {
          professors: true,
          workflow: { columns: { title: true } },
        },
      });
      const approvable = rows.filter((r) => r.status === "printed");
      if (!approvable.length) {
        throw new AppError(ar.director.nothingApprovable, 400);
      }

      for (const inst of approvable) {
        const post = findPostprocessor(inst.workflow?.title);
        if (post) await post.execute(inst, tx);
      }

      await tx
        .update(schema.workflowInstances)
        .set({
          status: "approved",
          approvedById: director.id,
          approvedAt: new Date(),
          approvalFile,
          rejectionReason: null,
        })
        .where(
          inArray(
            schema.workflowInstances.id,
            approvable.map((r) => r.id),
          ),
        );

      return { approved: approvable.map((r) => r.id), approvalFile };
    });
  }

  static async reject(instanceIds, rejectionReason, director) {
    const ids = (instanceIds || []).map((n) => Number(n)).filter(Boolean);
    if (!ids.length) throw new AppError(ar.director.selectAtLeastOne, 400);
    if (!rejectionReason || !String(rejectionReason).trim()) {
      throw new AppError(ar.request.rejectionReasonRequired, 400);
    }
    return await withTransaction(async (tx) => {
      const rows = await tx.query.workflowInstances.findMany({
        where: inArray(schema.workflowInstances.id, ids),
        columns: { id: true, status: true },
      });
      const rejectable = rows
        .filter((r) => r.status === "printed")
        .map((r) => r.id);
      if (!rejectable.length)
        throw new AppError(ar.director.nothingApprovable, 400);

      await tx
        .update(schema.workflowInstances)
        .set({
          status: "rejected",
          approvedById: director.id,
          approvedAt: new Date(),
          rejectionReason,
        })
        .where(inArray(schema.workflowInstances.id, rejectable));

      return { rejected: rejectable };
    });
  }
}

module.exports = DirectorService;
