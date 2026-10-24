'use strict';

/**
 * P3023: adaptive re-probe backoff (pure).
 *
 * The P3017 MethodChain re-probes a demoted step on a fixed ladder (15 min → 24 h). This scales
 * the ladder with what we KNOW about the step:
 *  - it worked before on this device (successes > 0, few failures)  → re-probe sooner (×0.5):
 *    it was probably a transient (device asleep, radio noise, firmware busy);
 *  - it never worked and failed ≥ 3 times                            → re-probe later (×2, cap 48 h);
 *  - sleepy / battery device                                         → ×4 and ≥ 1 h: a re-probe must
 *    never be the reason a battery device is woken or drained;
 *  - memory pressure (MemoryBudget.reprobeFactor)                    → ×2 / ×4.
 * The battery-vs-mains split mirrors ZHA's consider_unavailable_battery / _mains and Z2M's
 * availability active/passive timeouts (idea only, rewritten here; see CREDITS).
 */

const BASE_MS = Object.freeze([15 * 60e3, 60 * 60e3, 4 * 3600e3, 12 * 3600e3, 24 * 3600e3]);
const MAX_MS = 48 * 3600e3;
const SLEEPY_MIN_MS = 3600e3;
const COUNT_CAP = 255;

function bump(n) { return Math.min(COUNT_CAP, (Number(n) || 0) + 1); }

/**
 * @param {number} level ladder index (0..4)
 * @param {{s?:number, f?:number}} [hist] successes / failures for this step on this device
 * @param {{sleepy?:boolean, memFactor?:number}} [ctx]
 * @returns {number} delay in ms
 */
function delayMs(level, hist = {}, ctx = {}) {
  const b = Math.max(0, Math.min(Number(level) || 0, BASE_MS.length - 1));
  let d = BASE_MS[b];
  const s = Number(hist.s) || 0;
  const f = Number(hist.f) || 0;
  if (s > 0 && f <= s * 2) { d *= 0.5; } else if (s === 0 && f >= 3) { d *= 2; }
  if (ctx.sleepy) { d = Math.max(SLEEPY_MIN_MS, d * 4); }
  const m = Number(ctx.memFactor);
  if (m > 1) { d *= Math.min(m, 8); }
  return Math.round(Math.min(MAX_MS, Math.max(60e3, d)));
}

/** Battery / end-device heuristics (read-only, never throws). */
function isSleepy(device) {
  try {
    if (!device) { return false; }
    if (typeof device.hasCapability === 'function' && (device.hasCapability('measure_battery') || device.hasCapability('alarm_battery'))) { return true; }
    const ps = device.powerSource || (device.getStoreValue && device.getStoreValue('powerSource'));
    if (typeof ps === 'string' && /battery/i.test(ps)) { return true; }
    const node = device.zclNode && device.zclNode.node;
    if (node && node.receiveWhenIdle === false) { return true; }
  } catch (_e) { /* soft */ }
  return false;
}

module.exports = { delayMs, isSleepy, bump, BASE_MS, MAX_MS, SLEEPY_MIN_MS, COUNT_CAP };
