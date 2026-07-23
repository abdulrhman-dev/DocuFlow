const { eq, notInArray } = require("drizzle-orm");
const { db, schema } = require("../../src/db");

function templatesData() {
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
      nationalId: {
        type: "string",
        title: "الرقم القومي / جواز السفر",
      },
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
      plan: {
        type: "object",
        title: "توافق الموضوع مع الخطة البحثية",
        properties: {
          axisCode: { type: "string", title: "المحور" },
          goalCode: { type: "string", title: "الهدف" },
        },
        required: ["axisCode", "goalCode"],
      },
      planSpecialization: { type: "string", title: "التخصص" },
      planResearchField: { type: "string", title: "المجال البحثى" },
      supervisors: {
        type: "array",
        title: "أسماء المشرفين",
        minItems: 1,
        items: {
          type: "object",
          properties: {
            name: { type: "string", title: "الاسم" },
            degreeAndInstitution: { type: "string", title: "الدرجة - الجهة" },
          },
          required: ["name", "degreeAndInstitution"],
        },
      },
      editSupervisors: {
        type: "array",
        title: "تعديل الإشراف",
        items: {
          type: "object",
          properties: {
            name: { type: "string", title: "الاسم" },
            degreeAndInstitution: { type: "string", title: "الدرجة - الجهة" },
            action: {
              type: "string",
              title: "إضافة / حذف",
              enum: ["add", "remove"],
            },
          },
        },
      },
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
      "plan",
    ],
  };

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
        type: "Control",
        scope: "#/properties/nationalId",
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
          {
            type: "Control",
            scope: "#/properties/creditHours",
            options: { readonly: true },
          },
          {
            type: "Control",
            scope: "#/properties/gpa",
            options: { readonly: true },
          },
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
        elements: [
          {
            type: "Control",
            scope: "#/properties/plan",
            options: { customRenderer: "planPicker" },
          },
          {
            type: "HorizontalLayout",
            elements: [
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
      title: "طلب تحديد الإشراف على رسالة الماجستير",
      description: "نموذج طلب تحديد الإشراف على رسالة الماجستير",
      schema: supervisionSchema,
      uiSchema: supervisionUiSchema,
      fileUrl: "public/templates/supervision-request.docx",
    },
  ];
}

const KEEP_TITLES = templatesData().map((t) => t.title);

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

    // Prune legacy templates. Note: conditions that reference them will need to
    // be gone first — that's handled by 03-seed-stage-templates.js pruning too.
    // If FK is not cascading, run: DELETE FROM "Conditions" WHERE "templateId" IN (...);
    await db
      .delete(schema.templates)
      .where(notInArray(schema.templates.title, KEEP_TITLES));
  },
};
