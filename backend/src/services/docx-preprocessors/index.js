const supervisionRequest = require("./supervision-request");

const registry = [supervisionRequest];

function findPreprocessor(template) {
  if (!template) return null;
  for (const p of registry) {
    if (p.matches(template)) return p;
  }
  return null;
}

module.exports = { registry, findPreprocessor };
