const express = require("express");

const requestController = require("../controllers/request.controller");
const { authenticate, authorizeRoles } = require("../middleware/auth");

const requestRouter = express.Router();

requestRouter.post(
  "/",
  authenticate,
  authorizeRoles([
    "professor",
    "department_manager",
    "administrator",
    "reviewer",
    "director",
  ]),
  requestController.createRequest,
);

requestRouter.get(
  "/",
  authenticate,
  authorizeRoles(["administrator"]),
  requestController.getAllRequests,
);

requestRouter.get(
  "/:id",
  authenticate,
  authorizeRoles([
    "professor",
    "department_manager",
    "administrator",
    "reviewer",
    "director",
  ]),
  requestController.getRequest,
);

requestRouter.patch(
  "/:id",
  authenticate,
  authorizeRoles([
    "professor",
    "department_manager",
    "administrator",
    "reviewer",
    "director",
  ]),
  requestController.updateRequest,
);

requestRouter.delete(
  "/:id",
  authenticate,
  authorizeRoles([
    "professor",
    "department_manager",
    "administrator",
    "reviewer",
    "director",
  ]),
  requestController.deleteRequest,
);

module.exports = requestRouter;
