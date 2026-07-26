/**
 * Enforce that read-only fields in a JSONForms uiSchema cannot be mutated
 * across two versions of the same document data.
 *
 * A control is read-only when its `options.readonly` is truthy.
 *
 * Supported cases:
 *   - Simple scalar controls (scope points at a single property).
 *   - Nested paths through Group/HorizontalLayout/VerticalLayout containers.
 *   - Array-item controls declared inside a parent Control's
 *     `options.detail`: they lock the corresponding property in EVERY item
 *     of the outer array.
 *   - A whole array Control marked read-only: the entire array is frozen.
 *
 * Returns an array of violation strings (empty when nothing changed).
 */

// Convert a JSONForms scope like "#/properties/foo/properties/bar" into
// the plain property path ["foo", "bar"]. Returns null if the scope isn't
// a data-pointing scope (e.g. "#/definitions/...").
function scopeToPath(scope) {
  if (typeof scope !== "string" || !scope.startsWith("#/")) return null;
  const parts = scope.slice(2).split("/");
  const path = [];
  for (let i = 0; i < parts.length; i++) {
    if (parts[i] === "properties") {
      i++;
      if (i >= parts.length) return null;
      path.push(parts[i]);
    } else if (parts[i] === "items") {
      // "items" segment refers to array items; represented as "*" in our path.
      path.push("*");
    } else {
      // Unknown segment — bail out; caller ignores this scope.
      return null;
    }
  }
  return path;
}

/**
 * Collect all readonly paths from a uiSchema tree.
 * Each entry has:
 *   path: array — "*" segments mean "every element of the array at this
 *                 position".
 *   whole: bool — true when the readonly is on the array control itself
 *                 (freeze the entire array), false when it's a single field.
 */
function collectReadonlyPaths(uiSchema) {
  const out = [];
  if (!uiSchema || typeof uiSchema !== "object") return out;

  function walk(node, parentPath) {
    if (!node || typeof node !== "object") return;
    if (Array.isArray(node)) {
      for (const c of node) walk(c, parentPath);
      return;
    }
    const isReadonly = !!(node.options && node.options.readonly);

    if (node.type === "Control" && typeof node.scope === "string") {
      const p = scopeToPath(node.scope);
      if (p) {
        const abs = [...parentPath, ...p];
        if (isReadonly) {
          out.push({ path: abs, whole: true });
        }
        // Descend into array-item detail (if any)
        if (node.options && node.options.detail) {
          walk(node.options.detail, [...abs, "*"]);
        }
      }
      return;
    }

    // Container / layout nodes (VerticalLayout, HorizontalLayout, Group, ...)
    if (Array.isArray(node.elements)) {
      for (const c of node.elements) walk(c, parentPath);
    }
  }

  walk(uiSchema, []);
  return out;
}

function getAt(obj, path) {
  let cur = obj;
  for (const seg of path) {
    if (cur == null) return undefined;
    if (seg === "*") return cur; // sentinel — caller handles arrays
    cur = cur[seg];
  }
  return cur;
}

function deepEqual(a, b) {
  if (a === b) return true;
  if (a == null || b == null) return a === b;
  if (typeof a !== typeof b) return false;
  if (typeof a !== "object") return a === b;
  if (Array.isArray(a) !== Array.isArray(b)) return false;
  if (Array.isArray(a)) {
    if (a.length !== b.length) return false;
    for (let i = 0; i < a.length; i++) if (!deepEqual(a[i], b[i])) return false;
    return true;
  }
  const ak = Object.keys(a);
  const bk = Object.keys(b);
  if (ak.length !== bk.length) return false;
  for (const k of ak) if (!deepEqual(a[k], b[k])) return false;
  return true;
}

/**
 * Compare a single readonly path across `oldData` and `newData`.
 * Returns an array of dotted paths that differ (empty when unchanged).
 */
function compareReadonlyPath(oldData, newData, path) {
  const wildcardIdx = path.indexOf("*");
  if (wildcardIdx === -1) {
    const oldVal = getAt(oldData, path);
    const newVal = getAt(newData, path);
    if (!deepEqual(oldVal, newVal)) return [path.join(".")];
    return [];
  }

  // Split into "before *" and "after *"
  const head = path.slice(0, wildcardIdx);
  const tail = path.slice(wildcardIdx + 1);

  const oldArr = getAt(oldData, head);
  const newArr = getAt(newData, head);

  // If the array is missing on either side, treat as changed only when the
  // outer array itself differs (structural change).
  if (!Array.isArray(oldArr) || !Array.isArray(newArr)) {
    if (!deepEqual(oldArr, newArr)) return [head.join(".")];
    return [];
  }

  // Arrays must have the same length to prevent adding/removing rows that
  // contain readonly cells.
  if (oldArr.length !== newArr.length) return [head.join(".")];

  const violations = [];
  for (let i = 0; i < oldArr.length; i++) {
    const oldItem = oldArr[i];
    const newItem = newArr[i];
    if (tail.length === 0) {
      // whole item is frozen
      if (!deepEqual(oldItem, newItem)) {
        violations.push([...head, i].join("."));
      }
    } else {
      const sub = compareReadonlyPath(oldItem, newItem, tail);
      for (const s of sub)
        violations.push([...head, i, ...s.split(".")].join("."));
    }
  }
  return violations;
}

/**
 * Public entry point.
 *
 * @param {object} uiSchema  — from Template.uiSchema
 * @param {object} oldData   — previously stored Document.data (may be null)
 * @param {object} newData   — data submitted by the client
 * @returns {string[]}       — list of dotted paths that were unlawfully
 *                             modified. Empty when the update is valid.
 */
function collectReadonlyViolations(uiSchema, oldData, newData) {
  const roPaths = collectReadonlyPaths(uiSchema);
  const seen = new Set();
  const violations = [];
  for (const { path } of roPaths) {
    const violated = compareReadonlyPath(oldData || {}, newData || {}, path);
    for (const v of violated) {
      if (!seen.has(v)) {
        seen.add(v);
        violations.push(v);
      }
    }
  }
  return violations;
}

module.exports = {
  collectReadonlyViolations,
  // exported for unit testing
  scopeToPath,
  collectReadonlyPaths,
};
