// Simple RFC-ish check.
const BASIC_EMAIL = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

/**
 * Rules:
 *   - `isIndustrial=true` → any well-formed email allowed.
 *   - `isIndustrial=false` → must end with ".edu" or ".edu.eg" (case-insensitive).
 */
function validateOutsideEmail(email, isIndustrial) {
  if (typeof email !== "string" || !BASIC_EMAIL.test(email)) return false;
  if (isIndustrial) return true;
  const lower = email.toLowerCase();
  return lower.endsWith(".edu") || lower.endsWith(".edu.eg");
}

module.exports = { validateOutsideEmail };
