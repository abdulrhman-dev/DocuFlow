const express = require("express");
const { authenticate, authorizeRoles } = require("../middleware/auth");
const upload = require("../middleware/uploads/approval");
const ctrl = require("../controllers/director.controller");

const router = express.Router();
const ROLE = authorizeRoles(["director"]);

router.get("/instance", authenticate, ROLE, ctrl.search);
router.get("/instance/pending-count", authenticate, ROLE, ctrl.countPending);
router.get("/instance/:id", authenticate, ROLE, ctrl.getInstance);
router.post(
  "/instance/approve",
  authenticate,
  ROLE,
  upload.single("approvalFile"),
  ctrl.approve,
);
router.post("/instance/reject", authenticate, ROLE, ctrl.reject);

module.exports = router;
