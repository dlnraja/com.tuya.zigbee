'use strict';

// v5.9.22: Centralized 0-indexed press type map (prevents v5.9.19 regression)
// Tuya Z2M convention: 0=single, 1=double, 2=long — NEVER 1-indexed!
const PRESS_MAP = Object.freeze({
  0: 'single', 1: 'double', 2: 'long',
  3: 'single', 4: 'double', 5: 'long',
});

function resolve(raw, ctx) {
  if (PRESS_MAP[raw]) return PRESS_MAP[raw];
  const tag = ctx ? `[${ctx}]` : '';
  if (raw == null) {
    console.log(`[PRESS-SAFETY]${tag} null/undef → 'single'`);
  } else {
    console.log(`[PRESS-SAFETY]${tag} unexpected value ${raw} (0-indexed!) → 'single'`);
  }
  return 'single';
}

module.exports = { PRESS_MAP, resolve };
