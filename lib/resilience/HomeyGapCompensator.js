'use strict';

/**
 * HomeyGapCompensator (P2222 / P2224 / P2228) — Homey **app** runtime only.
 * Soft ensure for fleet domains. Complements UniversalLayerBootstrap.
 * Does not invent sacred couples. Does not load CI catalogs (config/resilience is .homeyignore).
 * Additive only — never removes mixin/cascade/L14 paths.
 */

function ensureDeviceCompensations(device) {
  if (!device || device._p2222CompensationsDone) return { ok: true, skipped: true };
  device._p2222CompensationsDone = true;

  const notes = [];

  // Battery: never leave linear formulas as primary path
  if (typeof device.normalizeZclBatteryPercent !== 'function') {
    try {
      const { normalizeZclBatteryPercent } = require('../battery/zcl-percent');
      device.normalizeZclBatteryPercent = (v) => normalizeZclBatteryPercent(v);
      notes.push('battery-normalize');
    } catch { /* optional */ }
  }

  // Capability writes: prefer L14
  if (typeof device.safeSetCapabilityValue !== 'function' && typeof device.setCapabilityValue === 'function') {
    notes.push('warn-no-l14');
  }

  // IAS leftover EF00 skip hint
  if (typeof device.shouldSkipIasOnlyEf00Tx === 'function') {
    notes.push('ias-ef00-skip-ready');
  }

  // Bidirectional buttons already init via mixins — log stack if present
  if (typeof device._logBidirectionalButtonStack === 'function') {
    notes.push('bidir-btn-stack');
  }

  // Unknown DP / identity soft realign
  try {
    const { realignIncompleteIdentity } = require('../helpers/UnknownCaseRealigner');
    realignIncompleteIdentity(device);
    notes.push('unknown-realign');
  } catch { /* optional */ }

  // P2224: note complementary stacks when present (no TX / no invent)
  if (device._buttonCaptureCascadeDone || device._p2223CascadeDone) notes.push('button-cascade');
  if (typeof device.confirmInbound === 'function' || device._protocolRxTx) notes.push('protocol-rxtx');
  if (typeof device.safeSetCapabilityValue === 'function') notes.push('l14-ready');

  try {
    device.log?.(`[P2222] compensations: ${notes.join(',') || 'none'}`);
  } catch { /* ignore */ }

  return { ok: true, notes };
}

module.exports = { ensureDeviceCompensations };
