const { eq, and } = require("drizzle-orm");
const { db, schema } = require("../../src/db");

// Full workflow definitions (single source of truth)
const workflowsData = [
  {
    title: "Research Proposal Approval",
    description: "Workflow for approving research proposals",
    stages: [
      {
        title: "Initial Submission",
        role: "professor",
        description: "Submit proposal",
        stageOrder: 1,
      },
      {
        title: "Department Review",
        role: "department_manager",
        description: "Review proposal",
        stageOrder: 2,
      },
    ],
  },
  {
    title: "Internship Approval",
    description: "Approval process for internship plans",
    stages: [
      {
        title: "Plan Submission",
        role: "professor",
        description: "Submit internship plan",
        stageOrder: 1,
      },
      {
        title: "Manager Review",
        role: "department_manager",
        description: "Review the plan",
        stageOrder: 2,
      },
      {
        title: "Admin Final Approval",
        role: "administrator",
        description: "Final sign-off",
        stageOrder: 3,
      },
    ],
  },
  {
    title: "Thesis Registration",
    description: "Register final year thesis topic",
    stages: [
      {
        title: "Topic Proposal",
        role: "professor",
        description: "Suggest a thesis topic",
        stageOrder: 1,
      },
      {
        title: "Committee Review",
        role: "professor",
        description: "Included professors approve",
        stageOrder: 2,
        isMultiApproval: true,
      },
      {
        title: "Manager Approval",
        role: "department_manager",
        description: "Review topic suitability",
        stageOrder: 3,
      },
      {
        title: "Admin Record Entry",
        role: "administrator",
        description: "Record thesis officially",
        stageOrder: 4,
      },
      {
        title: "Student Notification",
        role: "professor",
        description: "Notify student",
        stageOrder: 5,
      },
    ],
  },
  {
    title: "Equipment Loan Request",
    description: "Request for borrowing lab equipment",
    stages: [
      {
        title: "Request Submission",
        role: "professor",
        description: "Submit equipment request",
        stageOrder: 1,
      },
      {
        title: "Manager Authorization",
        role: "department_manager",
        description: "Authorize request",
        stageOrder: 2,
      },
    ],
  },
  {
    title: "Course Feedback Review",
    description: "Workflow for reviewing student course feedback",
    stages: [
      {
        title: "Initial Report by Prof",
        role: "professor",
        description: "Upload feedback summary",
        stageOrder: 1,
      },
      {
        title: "Manager Discussion",
        role: "department_manager",
        description: "Review concerns",
        stageOrder: 2,
      },
      {
        title: "Admin Action",
        role: "administrator",
        description: "Take necessary steps",
        stageOrder: 3,
      },
    ],
  },
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
    ],
  },
];

async function upsertWorkflow(wf) {
  const existing = await db.query.workflows.findFirst({
    where: eq(schema.workflows.title, wf.title),
  });

  let workflow;
  if (existing) {
    // Keep description in sync in case it changed
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
}

module.exports = {
  async up({ reset = false } = {}) {
    if (reset) {
      await db.delete(schema.stages);
      await db.delete(schema.workflows);
    }
    for (const wf of workflowsData) await upsertWorkflow(wf);
  },
};
