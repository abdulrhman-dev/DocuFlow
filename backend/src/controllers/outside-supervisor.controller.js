const asyncDec = require("../utils/asyncDec");
const OutsideSupervisorService = require("../services/outside-supervisor.service");
const { validateOutsideEmail } = require("../utils/outsideEmailValidation");

// GET /outside-supervisor?email=foo@bar
async function lookup(req, res) {
  const email = String(req.query.email || "")
    .trim()
    .toLowerCase();
  if (!email)
    return res.json({ status: "success", data: { supervisor: null } });
  const row = await OutsideSupervisorService.getByEmail(email);
  res.json({ status: "success", data: { supervisor: row || null } });
}

// POST /outside-supervisor  (upsert; internal-user auth required)
async function upsert(req, res) {
  const result = await OutsideSupervisorService.upsert(req.body, {
    force: !!req.body.force,
  });
  res.json({ status: "success", data: result });
}

// GET /outside-supervisor/validate-email?email=foo&isIndustrial=true
async function validateEmail(req, res) {
  const email = String(req.query.email || "")
    .trim()
    .toLowerCase();
  const isIndustrial = req.query.isIndustrial === "true";
  res.json({
    status: "success",
    data: {
      ok: validateOutsideEmail(email, isIndustrial),
      email,
      isIndustrial,
    },
  });
}

module.exports = {
  lookup: asyncDec(lookup),
  upsert: asyncDec(upsert),
  validateEmail: asyncDec(validateEmail),
};
