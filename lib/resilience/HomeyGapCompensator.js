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

  // WHY(P2395): soft-ensure cascade if phys path ran without enrich (subclass
  // onNodeInit that skipped mixin init) — additive only, no second full phys stack.
  try {
    if (!device._buttonCaptureCascadeDone && !device._p2223CascadeDone) {
      const zclNode = device.zclNode || device.node || device._zclNode;
      if (zclNode && typeof device.initPhysicalButtonDetection === 'function') {
        const { enrichCaptureCascade } = require('../mixins/ButtonCaptureCascade');
        Promise.resolve(enrichCaptureCascade(device, zclNode)).catch(() => {});
        notes.push('button-cascade-soft-ensure');
      }
    }
  } catch { /* optional */ }

  // WHY(P2397): soft-ensure Homey UI button.N / onoff.gangN + virtual listeners
  try {
    const { ensureGangUiCapabilities } = require('../utils/ensureGangUiCapabilities');
    Promise.resolve(ensureGangUiCapabilities(device)).then((r) => {
      if (r?.added?.length) notes.push(`gang-ui:${r.added.length}`);
      if (!device._virtualButtonsInitialized && typeof device.initVirtualButtons === 'function') {
        return device.initVirtualButtons().catch(() => {});
      }
      return null;
    }).then(() => {
      if (!device._buttonCapListenersRegistered && typeof device._registerButtonCapabilityListeners === 'function') {
        return Promise.resolve(device._registerButtonCapabilityListeners()).catch(() => {});
      }
      return null;
    }).catch(() => {});
    notes.push('gang-ui-soft-ensure');
  } catch { /* optional */ }

  // Unknown DP / identity soft realign
  try {
    const { realignIncompleteIdentity } = require('../helpers/UnknownCaseRealigner');
    realignIncompleteIdentity(device);
    notes.push('unknown-realign');
  } catch { /* optional */ }

  // P2224: note complementary stacks when present (no TX / no invent)
  if (device._buttonCaptureCascadeDone || device._p2223CascadeDone) notes.push('button-cascade');
  if (device._buttonCaptureLevelsApplied?.length) notes.push(`btn-levels:${device._buttonCaptureLevelsApplied.join('+')}`);
  if (typeof device.confirmInbound === 'function' || device._protocolRxTx) notes.push('protocol-rxtx');
  if (typeof device.safeSetCapabilityValue === 'function') notes.push('l14-ready');

  // L99 energy: soft inventory only — never invent measure_power / meter_power
  if (typeof device._initVirtualEnergy === 'function' || device._virtualEnergyActive) notes.push('virtual-energy');
  if (device._energyJumpGuard || device._energyParseMeta) notes.push('energy-jump-guard');
  if (device.smartEnergyManager || device._smartEnergy) notes.push('smart-energy');

  // WHY(P2392): fleet firmware quirk compensation (phantom mains battery, DIY DP caps)
  try {
    const { applyFirmwareQuirkCompensations } = require('./FirmwareQuirkCompensator');
    const fw = applyFirmwareQuirkCompensations(device);
    if (fw?.notes?.length) notes.push(`fw:${fw.notes.join('+')}`);
    else notes.push('fw-quirks');
  } catch { /* optional */ }

  try {
    device.log?.(`[P2222] compensations: ${notes.join(',') || 'none'}`);
  } catch { /* ignore */ }

  return { ok: true, notes };
}

module.exports = { ensureDeviceCompensations };
