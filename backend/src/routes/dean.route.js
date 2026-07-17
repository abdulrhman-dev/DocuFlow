const express = require("express");
const deanController = require("../controllers/dean.controller");
const { authenticate, authorizeRoles } = require("../middleware/auth");

const deanRouter = express.Router();

deanRouter.get(
  "/instance",
  authenticate,
  authorizeRoles(["dean"]),
  deanController.listCompletedInstances,
);

deanRouter.get(
  "/instance/pending-count",
  authenticate,
  authorizeRoles(["dean"]),
  deanController.countPending,
);

deanRouter.get(
  "/instance/:id",
  authenticate,
  authorizeRoles(["dean"]),
  deanController.getInstance,
);

deanRouter.post(
  "/instance/:id/execute",
  authenticate,
  authorizeRoles(["dean"]),
  deanController.executeInstance,
);

deanRouter.post(
  "/instance/:id/reject",
  authenticate,
  authorizeRoles(["dean"]),
  deanController.rejectInstance,
);

module.exports = deanRouter;
