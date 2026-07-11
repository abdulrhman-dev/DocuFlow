const { eq } = require("drizzle-orm");
const { db, schema } = require("../../src/db");

function templatesData() {
  // (unchanged JSON schemas / uiSchemas — kept inline so this file is
  // self-contained; edit here to update templates in place.)
  const schemaJson = {
    type: "object",
    properties: {
      studentName: { type: "string", title: "Student Name" },
      registrationDate: {
        type: "string",
        format: "date",
        title: "Registration Date",
      },
      creditHours: { type: "number", title: "Credit Hours" },
      gpa: { type: "number", title: "GPA" },
    },
    required: ["studentName", "registrationDate", "creditHours", "gpa"],
  };
  const uiSchemaOriginal = {
    type: "VerticalLayout",
    elements: [
      { type: "Control", scope: "#/properties/studentName" },
      { type: "Control", scope: "#/properties/registrationDate" },
      {
        type: "HorizontalLayout",
        elements: [
          { type: "Control", scope: "#/properties/creditHours" },
          { type: "Control", scope: "#/properties/gpa" },
        ],
      },
    ],
  };

  // ---- Supervision template (with backend-driven read-only fields) ----
  const supervisionSchema = {
    type: "object",
    properties: {
      department: { type: "string", title: "القسم", minLength: 1 },
      requestType: {
        type: "string",
        title: "نوع الطلب",
        enum: ["new", "edit"],
        default: "new",
      },
      studentName: { type: "string", title: "اسم الطالب", minLength: 1 },
      registrationDate: {
        type: "string",
        format: "date",
        title: "تاريخ القيد",
      },
      creditHours: {
        type: "number",
        title: "عدد الساعات المعتمدة",
        minimum: 0,
      },
      gpa: { type: "number", title: "التقدير (GPA)", minimum: 0, maximum: 4 },
      researchSubject: {
        type: "string",
        title: "موضوع البحث المقترح",
        minLength: 1,
      },

      // Alignment with state / department research plan
      planAxis: { type: "string", title: "المحور" },
      planGoal: { type: "string", title: "الهدف" },
      planSpecialization: { type: "string", title: "التخصص" },
      planResearchField: { type: "string", title: "المجال البحثى" },

      // Up to 4 supervisors
      supervisors: {
        type: "array",
        title: "أسماء المشرفين",
        minItems: 1,
        maxItems: 4,
        items: {
          type: "object",
          properties: {
            name: { type: "string", title: "الاسم" },
            degreeAndInstitution: {
              type: "string",
              title: "الدرجة - الجهة",
            },
          },
          required: ["name", "degreeAndInstitution"],
        },
      },

      // Only relevant when requestType === 'edit'
      editSupervisors: {
        type: "array",
        title: "تعديل الإشراف",
        maxItems: 2,
        items: {
          type: "object",
          properties: {
            name: { type: "string", title: "الاسم" },
            degreeAndInstitution: {
              type: "string",
              title: "الدرجة - الجهة",
            },
            action: {
              type: "string",
              title: "إضافة / حذف",
              enum: ["add", "remove"],
            },
          },
        },
      },

      // Up to 4 signatures
      signatures: {
        type: "array",
        title: "التوقيعات",
        default: [],
        items: {
          type: "object",
          properties: {
            name: { type: "string", title: "الاسم" },
            signature: { type: "string", title: "التوقيع" },
          },
        },
      },
    },
    required: [
      "department",
      "requestType",
      "studentName",
      "registrationDate",
      "creditHours",
      "gpa",
      "researchSubject",
      "supervisors",
    ],
  };

  // JSONForms uiSchema — mirrors the docx layout visually.
  const supervisionUiSchema = {
    type: "VerticalLayout",
    elements: [
      {
        type: "Control",
        scope: "#/properties/department",
        options: { readonly: true },
      },
      {
        type: "Control",
        scope: "#/properties/requestType",
        options: { format: "radio" },
      },
      {
        type: "Control",
        scope: "#/properties/studentName",
        options: { readonly: true },
      },
      {
        type: "HorizontalLayout",
        elements: [
          {
            type: "Control",
            scope: "#/properties/registrationDate",
            options: { readonly: true },
          },
          { type: "Control", scope: "#/properties/creditHours" },
          { type: "Control", scope: "#/properties/gpa" },
        ],
      },
      {
        type: "Group",
        label: "أسماء المشرفين",
        elements: [
          {
            type: "Control",
            scope: "#/properties/supervisors",
            options: {
              readonly: true,
              detail: {
                type: "HorizontalLayout",
                elements: [
                  {
                    type: "Control",
                    scope: "#/properties/name",
                    options: { readonly: true },
                  },
                  {
                    type: "Control",
                    scope: "#/properties/degreeAndInstitution",
                    options: { readonly: true },
                  },
                ],
              },
            },
          },
        ],
      },
      {
        type: "Control",
        scope: "#/properties/researchSubject",
        options: { multi: true },
      },
      {
        type: "Group",
        label: "توافق الموضوع مع الخطة البحثية",
        elements: [
          {
            type: "HorizontalLayout",
            elements: [
              { type: "Control", scope: "#/properties/planAxis" },
              { type: "Control", scope: "#/properties/planGoal" },
              { type: "Control", scope: "#/properties/planSpecialization" },
              { type: "Control", scope: "#/properties/planResearchField" },
            ],
          },
        ],
      },
      {
        type: "Group",
        label: "في حالة تعديل الإشراف",
        rule: {
          effect: "SHOW",
          condition: {
            scope: "#/properties/requestType",
            schema: { const: "edit" },
          },
        },
        elements: [
          {
            type: "Control",
            scope: "#/properties/editSupervisors",
            options: {
              detail: {
                type: "HorizontalLayout",
                elements: [
                  { type: "Control", scope: "#/properties/name" },
                  {
                    type: "Control",
                    scope: "#/properties/degreeAndInstitution",
                  },
                  {
                    type: "Control",
                    scope: "#/properties/action",
                    options: { format: "radio" },
                  },
                ],
              },
            },
          },
        ],
      },
    ],
  };
  return [
    {
      title: "Request for Supervision",
      description:
        "Template for requesting supervision for final year projects",
      schema: schemaJson,
      uiSchema: uiSchemaOriginal,
      fileUrl: "public/templates/template_tmp.docx",
    },
    {
      title: "Research Proposal Template",
      description: "Template for research proposal submissions",
      schema: {
        type: "object",
        properties: {
          proposalTitle: { type: "string", title: "Proposal Title" },
          researchArea: { type: "string", title: "Research Area" },
          duration: { type: "number", title: "Duration (months)" },
          budget: { type: "number", title: "Budget" },
        },
        required: ["proposalTitle", "researchArea", "duration"],
      },
      uiSchema: {
        type: "VerticalLayout",
        elements: [
          { type: "Control", scope: "#/properties/proposalTitle" },
          { type: "Control", scope: "#/properties/researchArea" },
          { type: "Control", scope: "#/properties/duration" },
          { type: "Control", scope: "#/properties/budget" },
        ],
      },
      fileUrl: "public/templates/template_tmp.docx",
    },
    {
      title: "طلب تحديد الإشراف على رسالة الماجستير",
      description: "...",
      schema: supervisionSchema,
      uiSchema: supervisionUiSchema,
      fileUrl: "public/templates/supervision-request.docx",
    },
  ];
}

module.exports = {
  async up({ reset = false } = {}) {
    if (reset) await db.delete(schema.templates);

    for (const tpl of templatesData()) {
      const existing = await db.query.templates.findFirst({
        where: eq(schema.templates.title, tpl.title),
      });
      if (!existing) {
        await db.insert(schema.templates).values(tpl);
      } else {
        // Keep schema, uiSchema, description, fileUrl in sync.
        await db
          .update(schema.templates)
          .set({
            description: tpl.description,
            schema: tpl.schema,
            uiSchema: tpl.uiSchema,
            fileUrl: tpl.fileUrl,
          })
          .where(eq(schema.templates.id, existing.id));
      }
    }
  },
};
