const express = require("express");
const { authenticate, authorizeRoles } = require("../middleware/auth");
const ctrl = require("../controllers/affairs.controller");

const router = express.Router();
const ROLE = authorizeRoles(["administrator"]);

router.get("/instance", authenticate, ROLE, ctrl.list);
router.get("/instance/pending-count", authenticate, ROLE, ctrl.countPending);
router.get("/instance/bulk-pdf", authenticate, ROLE, ctrl.bulkPdf);
router.get("/instance/:id/pdf", authenticate, ROLE, ctrl.instancePdf);
router.get("/instance/:id", authenticate, ROLE, ctrl.getInstance);

module.exports = router;
