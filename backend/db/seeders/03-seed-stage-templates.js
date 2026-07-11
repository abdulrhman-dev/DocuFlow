const { eq, and } = require("drizzle-orm");
const { db, schema } = require("../../src/db");

module.exports = {
  async up({ reset = false } = {}) {
    if (reset) await db.delete(schema.conditions);

    const firstStages = await db.query.stages.findMany({
      where: eq(schema.stages.stageOrder, 1),
      columns: { id: true, workflowId: true },
    });
    const templates = await db.query.templates.findMany({
      columns: { id: true, title: true },
    });
    if (!firstStages.length || !templates.length) return;

    const supervisionTemplate = templates.find(
      (t) => t.title === "Request for Supervision",
    );
    const thesisTemplate = templates.find(
      (t) => t.title === "طلب تحديد الإشراف على رسالة الماجستير",
    );

    const desired = [];
    const targetWorkflowTitles = ["Thesis Registration", "تحديد الاشراف"];
    for (const title of targetWorkflowTitles) {
      const wf = await db.query.workflows.findFirst({
        where: eq(schema.workflows.title, title),
        columns: { id: true },
      });
      if (!wf || !thesisTemplate) continue;
      const stage = firstStages.find((x) => x.workflowId === wf.id);
      if (!stage) continue;
      desired.push({ stageId: stage.id, templateId: thesisTemplate.id });
    }

    for (const row of desired) {
      const existing = await db.query.conditions.findFirst({
        where: and(
          eq(schema.conditions.stageId, row.stageId),
          eq(schema.conditions.templateId, row.templateId),
        ),
      });
      if (!existing) await db.insert(schema.conditions).values(row);
    }
  },
};
