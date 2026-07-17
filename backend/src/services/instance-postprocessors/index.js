const supervisionPostprocessor = require("./supervision-request");

const registry = [supervisionPostprocessor];

function findPostprocessor(workflowTitle) {
  if (!workflowTitle) return null;
  for (const p of registry) if (p.matches(workflowTitle)) return p;
  return null;
}

module.exports = { registry, findPostprocessor };
