const { eq, and, asc } = require("drizzle-orm");
const { db, schema } = require("../../src/db");

const ONLY_WORKFLOW_TITLE = "تحديد الاشراف";

module.exports = {
  async up({ reset = false } = {}) {
    if (reset) {
      await db.delete(schema.requestAssignments);
      await db.delete(schema.instanceProfessors);
      await db.delete(schema.accesses);
      await db.delete(schema.documents);
      await db.delete(schema.requests);
      await db.delete(schema.workflowInstances);
    }

    const workflow = await db.query.workflows.findFirst({
      where: eq(schema.workflows.title, ONLY_WORKFLOW_TITLE),
      with: {
        stages: {
          where: eq(schema.stages.stageOrder, 1),
          with: { conditions: { with: { template: true } } },
          orderBy: [asc(schema.stages.stageOrder)],
        },
      },
    });
    if (!workflow) return;

    const professors = await db.query.users.findMany({
      where: eq(schema.users.role, "professor"),
    });
    const students = await db.query.students.findMany({
      columns: { code: true },
    });
    if (!professors.length || !students.length) return;

    const professorsByDept = new Map();
    for (const p of professors) {
      const arr = professorsByDept.get(p.departmentId) || [];
      arr.push(p);
      professorsByDept.set(p.departmentId, arr);
    }

    const firstStage = workflow.stages[0];
    if (!firstStage) return;

    let studentCursor = 0;
    for (let i = 0; i < Math.min(3, professors.length); i++) {
      const professor = professors[i];
      const student = students[studentCursor % students.length];
      studentCursor++;

      const existing = await db.query.workflowInstances.findFirst({
        where: and(
          eq(schema.workflowInstances.workflowId, workflow.id),
          eq(schema.workflowInstances.userId, professor.id),
          eq(schema.workflowInstances.studentId, student.code),
        ),
      });
      if (existing) continue;

      const [instance] = await db
        .insert(schema.workflowInstances)
        .values({
          workflowId: workflow.id,
          stageId: firstStage.id,
          userId: professor.id,
          departmentId: professor.departmentId,
          studentId: student.code,
          status: "in_progress",
        })
        .returning();

      // Multi-approval professors (peers, exclude self)
      const peers = (professorsByDept.get(professor.departmentId) || [])
        .filter((p) => p.id !== professor.id)
        .slice(0, 2);
      if (peers.length) {
        await db
          .insert(schema.instanceProfessors)
          .values(
            peers.map((p) => ({ instanceId: instance.id, userId: p.id })),
          );
      }

      const [request] = await db
        .insert(schema.requests)
        .values({
          instanceId: instance.id,
          stageId: firstStage.id,
          userId: professor.id,
          note: `طلب تجريبي لسير عمل ${workflow.title}`,
        })
        .returning();

      await db.insert(schema.accesses).values({
        requestId: request.id,
        userId: professor.id,
        accessLevel: "edit",
      });

      const templatesForStage = (firstStage.conditions || [])
        .map((c) => c.template)
        .filter(Boolean);
      if (templatesForStage.length) {
        await db.insert(schema.documents).values(
          templatesForStage.map((t) => ({
            instanceId: instance.id,
            stageOrder: firstStage.stageOrder,
            templateId: t.id,
            data: null,
          })),
        );
      }
    }
  },
};
