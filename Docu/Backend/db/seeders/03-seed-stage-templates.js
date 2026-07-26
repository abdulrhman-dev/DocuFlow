const { eq, and } = require("drizzle-orm");
const { db, schema } = require("../../src/db");

module.exports = {
  async up({ reset = false } = {}) {
    if (reset) await db.delete(schema.conditions);

    const supervisionTemplate = await db.query.templates.findFirst({
      where: eq(
        schema.templates.title,
        "طلب تحديد الإشراف على رسالة الماجستير",
      ),
      columns: { id: true },
    });
    const workflow = await db.query.workflows.findFirst({
      where: eq(schema.workflows.title, "تحديد الاشراف"),
      columns: { id: true },
    });
    if (!supervisionTemplate || !workflow) {
      // Nothing to wire yet — clear stray conditions and exit.
      await db.delete(schema.conditions);
      return;
    }
    const stage1 = await db.query.stages.findFirst({
      where: and(
        eq(schema.stages.workflowId, workflow.id),
        eq(schema.stages.stageOrder, 1),
      ),
      columns: { id: true },
    });
    if (!stage1) {
      await db.delete(schema.conditions);
      return;
    }

    // Wipe everything and (re)insert the single mapping we want.
    await db.delete(schema.conditions);
    await db.insert(schema.conditions).values({
      stageId: stage1.id,
      templateId: supervisionTemplate.id,
    });
  },
};
