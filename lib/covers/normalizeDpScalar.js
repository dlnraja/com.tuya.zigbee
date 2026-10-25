'use strict';

/**
 * normalizeDpScalar: turn a numeric string DP value ("2", " 50 ", "-3.5") into a
 * number, and leave everything else alone.
 *
 * WHY(P3030): a value that arrives as "2" instead of 2 silently breaks strict
 * comparisons. In UnifiedCoverBase the DP1/DP7 transforms test `v === 2`, so
 * "2" (close) was read as idle. Adrian Rockall hit the same string/number
 * mismatch in his Somfy TaHoma app (community topic 35206, posts #244, #258,
 * #1626: feedback loops and wrong flow results). Credited in CREDITS.md.
 * Fresh code, nothing copied.
 *
 * Booleans, buffers, objects and non-numeric strings ("open", "stop") pass
 * through unchanged, so the named-value branches keep working.
 */

const NUMERIC_RE = /^\s*-?\d+(\.\d+)?\s*$/;

function normalizeDpScalar(value) {
  if (typeof value !== 'string' || value.length > 32 || !NUMERIC_RE.test(value)) {return value;}
  const n = Number(value);
  return Number.isFinite(n) ? n : value;
}

module.exports = { normalizeDpScalar };
