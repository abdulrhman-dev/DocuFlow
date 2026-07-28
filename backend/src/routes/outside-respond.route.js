const express = require("express");
const ctrl = require("../controllers/outside-respond.controller");

const router = express.Router();

router.get("/:token", ctrl.view);
router.post("/:token/respond", ctrl.respond);
router.get("/:token/document/:documentId/pdf", ctrl.viewDocument);

module.exports = router;
