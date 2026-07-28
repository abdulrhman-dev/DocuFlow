const { eq, and, gte, lte } = require("drizzle-orm");
const { db, schema } = require("../db");
const AppError = require("../errors/AppError");
const DocxService = require("./docx.service");
const { ajv } = require("../utils/ajv");
const optionalize = require("../utils/optionalize");
const ar = require("../translations/ar");
const { collectReadonlyViolations } = require("../utils/readonlyEnforcer");
const { buildSignaturesForDocument } = require("./document-signatures");
const { isEligibleForDepartment } = require("./research-plan");
const { stampPrintFooter } = require("./pdf-footer");

async function resolveDocumentAccess(document, user) {
  // Pull every access row the user has on requests of this instance
  const rows = await db
    .select({
      accessLevel: schema.accesses.accessLevel,
      stageOrder: schema.stages.stageOrder,
    })
    .from(schema.accesses)
    .innerJoin(
      schema.requests,
      eq(schema.requests.id, schema.accesses.requestId),
    )
    .innerJoin(schema.stages, eq(schema.stages.id, schema.requests.stageId))
    .where(
      and(
        eq(schema.requests.instanceId, document.instanceId),
        eq(schema.accesses.userId, user.id),
      ),
    );

  let bestForView = null;
  let editForThisStage = false;

  for (const row of rows) {
    // View permission: any access row for a request with stageOrder >= document's
    if (row.stageOrder >= document.stageOrder) {
      // Pick the strongest access level (edit > respond > read)
      const rank = { edit: 3, respond: 2, read: 1 };
      if (!bestForView || rank[row.accessLevel] > rank[bestForView]) {
        bestForView = row.accessLevel;
      }
    }
    // Edit permission: only when the user has 'edit' access at the document's stage
    if (row.accessLevel === "edit" && row.stageOrder === document.stageOrder) {
      editForThisStage = true;
    }
  }

  return { view: bestForView, canEdit: editForThisStage };
}

class DocumentService {
  static async getDocumentById(user, documentId) {
    const document = await db.query.documents.findFirst({
      where: eq(schema.documents.id, Number(documentId)),
      with: {
        template: { columns: { schema: true, uiSchema: true } },
        instance: { columns: { id: true, departmentId: true } },
      },
    });
    if (!document) throw new AppError(ar.document.notFound, 404);

    if (user.role !== "administrator" && user.role !== "director") {
      const { view } = await resolveDocumentAccess(document, user);
      if (!view) throw new AppError(ar.document.noPermissionToView, 403);
    }

    document.template.schema = optionalize(document.template.schema);
    return document;
  }

  static async validateDocumentData(document, optional) {
    const template = await db.query.templates.findFirst({
      where: eq(schema.templates.id, document.templateId),
    });
    if (!template || !template.schema) {
      throw new AppError(ar.document.schemaNotFound, 400);
    }
    const schemaJson = optional
      ? optionalize(template.schema)
      : template.schema;
    const validate = ajv.compile(schemaJson);
    if (!validate(document.data)) {
      const errors = validate.errors.map(
        (err) => `${err.instancePath} ${err.message}`,
      );
      throw new AppError(ar.document.invalidData(errors.join(", ")), 400);
    }
  }

  static async validateDocumentsData(documents, optional) {
    await Promise.all(
      documents.map((d) => DocumentService.validateDocumentData(d, optional)),
    );
  }

  static async updateDocument(userId, documentId, data) {
    const document = await db.query.documents.findFirst({
      where: eq(schema.documents.id, Number(documentId)),
      with: { template: { columns: { uiSchema: true } } },
    });
    if (!document) throw new AppError(ar.document.notFound, 404);
    if (!document.instanceId) {
      throw new AppError(ar.document.invalidStateMissingRequestId, 400);
    }

    const { canEdit } = await resolveDocumentAccess(document, { id: userId });
    if (!canEdit) throw new AppError(ar.document.noPermissionToUpdate, 403);

    // Enforce readonly declared in the template's uiSchema
    const violations = collectReadonlyViolations(
      document.template?.uiSchema,
      document.data,
      data,
    );
    if (violations.length) {
      throw new AppError(
        ar.document.readonlyViolation(violations.join(", ")),
        400,
      );
    }

    // If the template has a `plan` field, cross-check that the chosen
    // axis/goal is eligible for the instance's department.
    if (data && data.plan && (data.plan.axisCode || data.plan.goalCode)) {
      // const inst = await db.query.workflowInstances.findFirst({
      //   where: eq(schema.workflowInstances.id, document.instanceId),
      //   with: { department: { columns: { name: true } } },
      // });
      const deptName = data?.plan?.deptName || null;
      console.log("DEPT: ", deptName);

      if (
        !isEligibleForDepartment(
          deptName,
          data.plan.axisCode,
          data.plan.goalCode,
        )
      ) {
        throw new AppError(ar.document.planNotEligible, 400);
      }
    }

    document.data = data;
    await DocumentService.validateDocumentData(document, true);

    const [updated] = await db
      .update(schema.documents)
      .set({ data })
      .where(eq(schema.documents.id, document.id))
      .returning();

    return updated;
  }

  static async getDocumentPdf(user, documentId, opts = {}) {
    const document = await db.query.documents.findFirst({
      where: eq(schema.documents.id, Number(documentId)),
      with: { template: { columns: { fileUrl: true, title: true } } },
    });
    if (!document) throw new AppError(ar.document.notFound, 404);

    if (user.role !== "administrator" && user.role !== "director") {
      const { view } = await resolveDocumentAccess(document, user);
      if (!view) throw new AppError(ar.document.noPermissionToView, 403);
    }

    if (!document.template?.fileUrl) {
      throw new AppError(ar.document.templateFileUrlNotFound, 404);
    }

    let signatures = [];
    signatures = await buildSignaturesForDocument(document);

    const mergedData = {
      ...(document.data || {}),
      signatures,
    };

    let pdfBuffer = await DocxService.fillAndConvertToPdf(
      document.template,
      mergedData,
    );

    // Only stamp the print footer when the caller explicitly asked for the
    // print variant. The regular view path (Modal preview) NEVER stamps.
    if (opts.print) {
      const userName =
        [user?.firstName, user?.lastName].filter(Boolean).join(" ") ||
        user?.email ||
        `#${user?.id}`;

      // Load the instance + student + workflow so the right-hand footer
      // column can render "#<id> <workflow>" / "<studentName> - <code>".
      let instanceInfo = null;
      if (document.instanceId) {
        const inst = await db.query.workflowInstances.findFirst({
          where: eq(schema.workflowInstances.id, document.instanceId),
          columns: { id: true, studentId: true },
          with: {
            workflow: { columns: { title: true } },
            student: { columns: { code: true, name: true } },
          },
        });
        if (inst) {
          instanceInfo = {
            instanceId: inst.id,
            workflowTitle: inst.workflow?.title || "",
            studentName: inst.student?.name || "",
            studentCode: inst.student?.code || inst.studentId || "",
          };
        }
      }

      pdfBuffer = await stampPrintFooter(pdfBuffer, {
        userName,
        printedAt: opts.printedAt || new Date(),
        instanceInfo,
      });
    }

    return { pdfBuffer, template: document.template };
  }
}

module.exports = DocumentService;
