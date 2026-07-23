const { eq, and, inArray, desc, sql, asc } = require("drizzle-orm");
const { PDFDocument } = require("pdf-lib");
const { db, schema } = require("../db");
const AppError = require("../errors/AppError");
const withTransaction = require("../utils/withTransaction");
const DocumentService = require("./document.service");
const ar = require("../translations/ar");

const AFFAIRS_WITH = {
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
  documents: {
    columns: { id: true, stageOrder: true, templateId: true },
    with: { template: { columns: { id: true, title: true } } },
  },
  printedBy: { columns: { id: true, firstName: true, lastName: true } },
  approvedBy: { columns: { id: true, firstName: true, lastName: true } },
};

const AFFAIRS_STATUSES = ["completed", "printed", "approved", "rejected"];

// Marks any of the given ids that are still `completed` as `printed`.
// Runs in its own transaction so a failed print stream doesn't roll it back
// and (more importantly) so a successful print always records the transition.
async function autoMarkPrinted(instanceIds, user) {
  const ids = (instanceIds || []).map((n) => Number(n)).filter(Boolean);
  if (!ids.length) return { printed: [] };
  return await withTransaction(async (tx) => {
    const rows = await tx.query.workflowInstances.findMany({
      where: inArray(schema.workflowInstances.id, ids),
      columns: { id: true, status: true },
    });
    const eligible = rows
      .filter((r) => r.status === "completed")
      .map((r) => r.id);
    if (!eligible.length) return { printed: [] };
    await tx
      .update(schema.workflowInstances)
      .set({
        status: "printed",
        printedById: user.id,
        printedAt: new Date(),
      })
      .where(inArray(schema.workflowInstances.id, eligible));
    return { printed: eligible };
  });
}

class AffairsService {
  static async list({ status, workflowId } = {}) {
    const filters = [
      inArray(schema.workflowInstances.status, AFFAIRS_STATUSES),
    ];
    if (status) {
      if (!AFFAIRS_STATUSES.includes(status)) {
        throw new AppError(ar.affairs.invalidStatus, 400);
      }
      filters.length = 0;
      filters.push(eq(schema.workflowInstances.status, status));
    }
    if (workflowId) {
      filters.push(eq(schema.workflowInstances.workflowId, Number(workflowId)));
    }
    return db.query.workflowInstances.findMany({
      where: and(...filters),
      with: AFFAIRS_WITH,
      orderBy: [desc(schema.workflowInstances.updatedAt)],
    });
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
      with: AFFAIRS_WITH,
    });
    if (!instance) throw new AppError(ar.instance.notFound, 404);

    const workflow = await db.query.workflows.findFirst({
      where: eq(schema.workflows.id, instance.workflowId),
      with: { stages: { orderBy: [asc(schema.stages.stageOrder)] } },
    });

    const docsByStage = new Map();
    for (const d of instance.documents || []) {
      const list = docsByStage.get(d.stageOrder) || [];
      list.push(d);
      docsByStage.set(d.stageOrder, list);
    }
    const stageBlocks = (workflow?.stages || []).map((s) => ({
      id: s.id,
      title: s.title,
      stageOrder: s.stageOrder,
      role: s.role,
      documents: (docsByStage.get(s.stageOrder) || []).map((d) => ({
        id: d.id,
        templateId: d.templateId,
        name: d.template?.title || null,
      })),
    }));
    return { instance, stageBlocks };
  }

  // Build one merged PDF for ONE instance and return it as a Buffer,
  // then auto-mark the instance as printed if it was still `completed`.
  static async buildInstanceMergedPdf(instanceId, user) {
    const inst = await db.query.workflowInstances.findFirst({
      where: eq(schema.workflowInstances.id, Number(instanceId)),
      with: {
        student: true,
        workflow: { columns: { title: true } },
        documents: {
          columns: { id: true, stageOrder: true, templateId: true },
        },
      },
    });
    if (!inst) throw new AppError(ar.instance.notFound, 404);

    const merged = await PDFDocument.create();
    const sorted = (inst.documents || [])
      .slice()
      .sort((a, b) => a.stageOrder - b.stageOrder);

    for (const d of sorted) {
      try {
        const { pdfBuffer } = await DocumentService.getDocumentPdf(
          { id: user.id, role: user.role },
          d.id,
        );
        const src = await PDFDocument.load(pdfBuffer);
        const pages = await merged.copyPages(src, src.getPageIndices());
        pages.forEach((p) => merged.addPage(p));
      } catch (_e) {
        // Skip a broken document, keep merging the rest.
      }
    }

    const bytes = await merged.save();
    const filename = (
      (inst.workflow?.title || "instance") +
      "-" +
      (inst.student?.name || inst.studentId || inst.id) +
      `-${inst.id}.pdf`
    ).replace(/[\\/:*?"<>|]+/g, "_");

    // The buffer is fully in memory — safe to record the print now.
    await autoMarkPrinted([inst.id], user);

    return { buffer: Buffer.from(bytes), filename };
  }

  // Build ONE merged PDF that concatenates every document of every selected
  // instance and stream it inline for printing. Auto-marks all eligible
  // instances as printed BEFORE streaming so the transition is durable even
  // if the client aborts mid-stream.
  static async buildBulkMergedPdf(instanceIds, user, res) {
    const ids = (instanceIds || []).map((n) => Number(n)).filter(Boolean);
    if (!ids.length) throw new AppError(ar.affairs.selectAtLeastOne, 400);

    const instances = await db.query.workflowInstances.findMany({
      where: inArray(schema.workflowInstances.id, ids),
      with: {
        student: true,
        workflow: { columns: { title: true } },
        documents: {
          columns: { id: true, stageOrder: true, templateId: true },
        },
      },
      orderBy: [asc(schema.workflowInstances.id)],
    });
    if (!instances.length) throw new AppError(ar.instance.notFound, 404);

    const merged = await PDFDocument.create();

    for (const inst of instances) {
      const sorted = (inst.documents || [])
        .slice()
        .sort((a, b) => a.stageOrder - b.stageOrder);
      for (const d of sorted) {
        try {
          const { pdfBuffer } = await DocumentService.getDocumentPdf(
            { id: user.id, role: user.role },
            d.id,
          );
          const src = await PDFDocument.load(pdfBuffer);
          const pages = await merged.copyPages(src, src.getPageIndices());
          pages.forEach((p) => merged.addPage(p));
        } catch (_e) {
          // Skip broken doc.
        }
      }
    }

    const bytes = await merged.save();
    const filename = `affairs-bundle-${Date.now()}.pdf`;

    // Record the print transition before streaming out.
    await autoMarkPrinted(
      instances.map((i) => i.id),
      user,
    );

    res.setHeader("Content-Type", "application/pdf");
    res.setHeader(
      "Content-Disposition",
      `inline; filename="${filename}"; filename*=UTF-8''${encodeURIComponent(
        filename,
      )}`,
    );
    res.setHeader("Content-Length", bytes.length);
    res.setHeader("Access-Control-Expose-Headers", "Content-Disposition");
    res.send(Buffer.from(bytes));
  }
}

module.exports = AffairsService;
