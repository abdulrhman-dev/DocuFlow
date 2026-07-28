const express = require("express");
const { authenticate, authorizeRoles } = require("../middleware/auth");
const ctrl = require("../controllers/outside-supervisor.controller");

const router = express.Router();
const ROLE = authorizeRoles([
  "professor",
  "department_manager",
  "administrator",
  "reviewer",
  "director",
]);

router.get("/", authenticate, ROLE, ctrl.lookup);
router.get("/validate-email", authenticate, ROLE, ctrl.validateEmail);
router.post("/", authenticate, ROLE, ctrl.upsert);

module.exports = router;
