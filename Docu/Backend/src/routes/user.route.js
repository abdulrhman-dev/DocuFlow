const express = require("express");
const userController = require("../controllers/user.controller");
const { authenticate, authorizeRoles } = require("../middleware/auth");

const userRouter = express.Router();

userRouter.get(
  "/",
  authenticate,
  authorizeRoles([
    "administrator",
    "professor",
    "department_manager",
    "reviewer",
    "director",
  ]),
  userController.searchUsers,
);

userRouter.get(
  "/:id",
  authenticate,
  authorizeRoles([
    "administrator",
    "professor",
    "department_manager",
    "reviewer",
    "director",
  ]),
  userController.getUser,
);

module.exports = userRouter;
