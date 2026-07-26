const express = require("express");
const { authenticate, authorizeRoles } = require("../middleware/auth");

const documentController = require("../controllers/document.controller");

const doucmentRouter = express.Router();

const VIEW_ROLES = [
  "professor",
  "department_manager",
  "administrator",
  "reviewer",
  "director",
];

doucmentRouter.get(
  "/:id",
  authenticate,
  authorizeRoles(VIEW_ROLES),
  documentController.getDocument,
);

doucmentRouter.get(
  "/:id/pdf",
  authenticate,
  authorizeRoles(VIEW_ROLES),
  documentController.getDocumentPdf,
);

doucmentRouter.patch(
  "/:id",
  authenticate,
  authorizeRoles([
    "professor",
    "department_manager",
    "administrator",
    "reviewer",
    "director",
  ]),
  documentController.updateDocument,
);

module.exports = doucmentRouter;
