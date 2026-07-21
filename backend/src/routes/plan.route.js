const express = require("express");
const planController = require("../controllers/plan.controller");
const { authenticate } = require("../middleware/auth");

const planRouter = express.Router();

planRouter.get("/", authenticate, planController.getFullPlan);
planRouter.get(
  "/for-department",
  authenticate,
  planController.getPlanForDepartment,
);

module.exports = planRouter;
