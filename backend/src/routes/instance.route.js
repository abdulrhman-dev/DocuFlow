const express = require("express");

const instanceController = require("../controllers/instance.controller");
const { authenticate, authorizeRoles } = require("../middleware/auth");

const instanceRouter = express.Router();

instanceRouter.post(
  "/",
  authenticate,
  authorizeRoles([
    "professor",
    "department_manager",
    "administrator",
    "reviewer",
    "director",
  ]),
  instanceController.createInstance,
);

instanceRouter.get(
  "/",
  authenticate,
  authorizeRoles(["administrator"]),
  instanceController.getAllInstances,
);

instanceRouter.get(
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
  instanceController.getInstance,
);

module.exports = instanceRouter;
