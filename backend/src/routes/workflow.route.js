const express = require("express");

const workflowController = require("../controllers/workflow.controller");
const { authenticate, authorizeRoles } = require("../middleware/auth");

const workflowRouter = express.Router();

workflowRouter.post(
  "/",
  authenticate,
  authorizeRoles(["administrator"]),
  workflowController.createWorkflow,
);

workflowRouter.get(
  "/",
  authenticate,
  authorizeRoles([
    "professor",
    "department_manager",
    "administrator",
    "dean",
    "reviewer",
    "director",
  ]),
  workflowController.getAll,
);

workflowRouter.get(
  "/:id",
  authenticate,
  authorizeRoles([
    "professor",
    "department_manager",
    "administrator",
    "dean",
    "reviewer",
    "director",
  ]),
  workflowController.getWorkflow,
);

module.exports = workflowRouter;
