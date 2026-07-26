const { eq, and, notInArray } = require("drizzle-orm");
const { db, schema } = require("../../src/db");

// Only one workflow now — everything in Arabic.
const workflowsData = [
  {
    title: "تحديد الاشراف",
    description: "تحديد الإشراف على رسائل الماجستير",
    stages: [
      {
        title: "طلب تحديد الاشراف",
        role: "professor",
        description: "تقديم طلب تحديد الإشراف",
        stageOrder: 1,
      },
      {
        title: "موافقة المشرفين",
        role: "professor",
        description: "موافقة كل المشرفين المشاركين",
        stageOrder: 2,
        isMultiApproval: true,
      },
      {
        title: "مراجعة القسم",
        role: "department_manager",
        description: "مراجعة رئيس القسم",
        stageOrder: 3,
      },
      {
        title: "مراجعة الشئون",
        role: "administrator",
        description: "مراجعة شئون الدراسات العليا",
        stageOrder: 4,
      },
      {
        title: "مراجعة لجنة الدراسات العليا",
        role: "reviewer",
        description: "مراجعة لجنة الدراسات العليا",
        stageOrder: 5,
      },
      {
        title: "مراجعة مجلس الكلية",
        role: "director",
        description: "مراجعة مجلس الكلية",
        stageOrder: 6,
      },
    ],
  },
];

const KEEP_TITLES = workflowsData.map((w) => w.title);

async function upsertWorkflow(wf) {
  const existing = await db.query.workflows.findFirst({
    where: eq(schema.workflows.title, wf.title),
  });

  let workflow;
  if (existing) {
    if (existing.description !== wf.description) {
      await db
        .update(schema.workflows)
        .set({ description: wf.description })
        .where(eq(schema.workflows.id, existing.id));
    }
    workflow = existing;
  } else {
    [workflow] = await db
      .insert(schema.workflows)
      .values({ title: wf.title, description: wf.description })
      .returning();
  }

  const desiredOrders = wf.stages.map((s) => s.stageOrder);

  for (const s of wf.stages) {
    const stage = await db.query.stages.findFirst({
      where: and(
        eq(schema.stages.workflowId, workflow.id),
        eq(schema.stages.stageOrder, s.stageOrder),
      ),
    });
    const desired = {
      title: s.title,
      description: s.description,
      role: s.role,
      isMultiApproval: !!s.isMultiApproval,
    };
    if (!stage) {
      await db.insert(schema.stages).values({
        ...desired,
        stageOrder: s.stageOrder,
        workflowId: workflow.id,
      });
    } else if (
      stage.title !== desired.title ||
      stage.description !== desired.description ||
      stage.role !== desired.role ||
      stage.isMultiApproval !== desired.isMultiApproval
    ) {
      await db
        .update(schema.stages)
        .set(desired)
        .where(eq(schema.stages.id, stage.id));
    }
  }

  // Drop any stray stages on this workflow that are no longer in the definition.
  await db
    .delete(schema.stages)
    .where(
      and(
        eq(schema.stages.workflowId, workflow.id),
        notInArray(schema.stages.stageOrder, desiredOrders),
      ),
    );
}

async function pruneUnwantedWorkflows() {
  const all = await db.query.workflows.findMany({
    columns: { id: true, title: true },
  });
  const doomed = all.filter((w) => !KEEP_TITLES.includes(w.title));
  for (const w of doomed) {
    // Cascade removes instances/stages via FKs if they were set with ON DELETE CASCADE.
    // If not, this delete may fail — in that case the DB has active data referencing
    // legacy workflows, and you should clear those manually.
    await db.delete(schema.workflows).where(eq(schema.workflows.id, w.id));
  }
}

module.exports = {
  async up({ reset = false } = {}) {
    if (reset) {
      await db.delete(schema.stages);
      await db.delete(schema.workflows);
    }
    for (const wf of workflowsData) await upsertWorkflow(wf);
    await pruneUnwantedWorkflows();
  },
};
