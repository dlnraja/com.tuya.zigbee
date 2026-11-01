'use strict';

/**
 * P3130 / t699u: Homey tile state consistency.
 *
 * Homey Mobile/Web app draws the tile state ("Activé" dot / power button colour)
 * from a boolean capability. Without the `uiState` option Homey falls back to the
 * boolean quick-action capability, which on multi-gang / multi-boolean devices can
 * be a secondary boolean (onoff.gang2, child_lock, frost_protection, ...). The tile
 * then says "Activé" while the main power button is off.
 *
 * SDK doc (apps.developer.homey.app/the-basics/devices/capabilities, "Device tile
 * state"): `uiState: true` makes a boolean the tile state, `uiState: false` prevents
 * it. Available from Homey v13.5.0, so we set it at runtime only on Homey >=13.5.0
 * (the manifest keeps compatibility >=12.2.0; SDK-M14 forbids it in the manifest).
 * Additive: no capability is removed, the quick action itself is unchanged.
 */

const MIN_VERSION = '13.5.0';

function verGte(v, min) {
  const a = String(v || '').replace(/^[^0-9]*/, '').split(/[.-]/).map((x) => parseInt(x, 10) || 0);
  const b = min.split('.').map((x) => parseInt(x, 10));
  for (let i = 0; i < 3; i++) {
    if ((a[i] || 0) > b[i]) return true;
    if ((a[i] || 0) < b[i]) return false;
  }
  return true;
}

/** Pure plan: which capability gets uiState true/false. */
function plan(caps, valueOf) {
  const list = Array.isArray(caps) ? caps : [];
  if (!list.includes('onoff')) return [];
  const out = [{ cap: 'onoff', uiState: true }];
  for (const c of list) {
    if (c === 'onoff' || c.startsWith('button') || c.startsWith('alarm_')) continue;
    const isSubOnoff = c.startsWith('onoff.');
    let isBool = isSubOnoff;
    if (!isBool && typeof valueOf === 'function') {
      try { isBool = typeof valueOf(c) === 'boolean'; } catch (_e) { isBool = false; }
    }
    if (isBool) out.push({ cap: c, uiState: false });
  }
  return out;
}

async function apply(device) {
  try {
    if (!device || typeof device.setCapabilityOptions !== 'function') return 'no-api';
    const ver = device.homey && device.homey.version;
    if (!verGte(ver, MIN_VERSION)) return 'old-homey';
    const caps = typeof device.getCapabilities === 'function' ? device.getCapabilities() : [];
    const steps = plan(caps, (c) => device.getCapabilityValue(c));
    let changed = 0;
    for (const { cap, uiState } of steps) {
      let cur = {};
      try { cur = (device.getCapabilityOptions && device.getCapabilityOptions(cap)) || {}; } catch (_e) { cur = {}; }
      if (cur.uiState === uiState) continue;
      try {
        await device.setCapabilityOptions(cap, { ...cur, uiState });
        changed++;
      } catch (_e) { /* option unsupported on this firmware: ignore */ }
    }
    return changed;
  } catch (_e) {
    return 'error';
  }
}

module.exports = { apply, plan, verGte, MIN_VERSION };
