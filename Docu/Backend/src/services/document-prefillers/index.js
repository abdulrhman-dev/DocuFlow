const supervisionPrefiller = require("./supervision-request");

const registry = [supervisionPrefiller];

/**
 * Find a prefiller for a template row. If none matches we return null,
 * meaning "don't pre-fill; the document starts empty".
 */
function findPrefiller(template) {
  if (!template) return null;
  for (const p of registry) if (p.matches(template)) return p;
  return null;
}

module.exports = { registry, findPrefiller };
