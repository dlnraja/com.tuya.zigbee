'use strict';

/**
 * P2397 — Soft-ensure Homey UI gang representations (button.N + onoff.gangN).
 *
 * WHY: Legacy thin drivers declare button.1..N for Homey tiles but omit
 * onoff.gangN and leave gangCount=1 → UI press on Button 2 is a no-op.
 * Comment: multi-cap siblings (switch_2gang / wall_switch_*_1way) already
 * declare both; this heals stale pairs + thin compose without inventing FPs.
 *
 * Pour qui: Homey users (virtual ↔ physical bidirectional).
 * Contre quoi: scene remotes getting phantom onoff; Homey zigbee.devices
 * sub-tiles getting duplicate onoff.gangN on the parent.
 */

const { resolveGangCount, countCapabilitiesGangHint } = require('./BidirectionalButtonState');

function usesHomeyZigbeeSubDevices(device) {
  try {
    if (typeof device.isSubDevice === 'function' && device.isSubDevice()) {
      return true;
    }
  } catch (_e) { /* optional */ }
  try {
    const devices = device.driver?.manifest?.zigbee?.devices
      || device.driver?.zigbee?.devices;
    return !!(devices && typeof devices === 'object' && Object.keys(devices).length > 0);
  } catch (_e) {
    return false;
  }
}

function resolveUiGangCount(device) {
  const fromCaps = countCapabilitiesGangHint(device);
  const n = resolveGangCount(device, fromCaps || 1);
  return Math.max(n, fromCaps || 0, 1);
}

/**
 * Soft-add missing UI caps. Idempotent via `_gangUiEnsured`.
 * @returns {Promise<{ added: string[], gangCount: number, subDevices: boolean }>}
 */
async function ensureGangUiCapabilities(device) {
  if (!device || typeof device.hasCapability !== 'function') {
    return { added: [], gangCount: 1, subDevices: false };
  }
  if (device._gangUiEnsured) {
    return {
      added: [],
      gangCount: resolveUiGangCount(device),
      subDevices: usesHomeyZigbeeSubDevices(device),
      skipped: true,
    };
  }
  device._gangUiEnsured = true;

  const added = [];
  const subDevices = usesHomeyZigbeeSubDevices(device);
  let isScene = false;
  try {
    const { isSceneRemoteDevice } = require('./scene-remote-classify');
    isScene = isSceneRemoteDevice(device);
  } catch (_e) { /* soft */ }

  const gangCount = resolveUiGangCount(device);
  // Cache inferred count so mixins that read this.gangCount see multi-gang
  if ((!Number(device.gangCount) || Number(device.gangCount) < gangCount)
    && gangCount > 1
    && !isScene) {
    try {
      device.gangCount = gangCount;
    } catch (_e) { /* getter-only */ }
    device._inferredGangCount = gangCount;
  }
  if ((!Number(device.buttonCount) || Number(device.buttonCount) < gangCount)
    && gangCount > 1) {
    try {
      device.buttonCount = gangCount;
    } catch (_e) { /* getter-only */ }
  }

  const add = async (cap) => {
    if (device.hasCapability(cap)) return;
    if (typeof device.addCapability !== 'function') return;
    await device.addCapability(cap).catch(() => {});
    if (device.hasCapability(cap)) added.push(cap);
  };

  for (let g = 1; g <= gangCount; g++) {
    await add(`button.${g}`);
    if (isScene) continue;
    if (g === 1) continue;
    // Parent of Homey zigbee.devices sub-tiles: child owns onoff — do not
    // invent onoff.gangN on parent (duplicate tiles / energy confusion).
    if (subDevices) continue;
    if (!device.hasCapability('onoff')) continue;
    if (device.hasCapability(`onoff.${g}`)) continue;
    await add(`onoff.gang${g}`);
  }

  if (added.length && typeof device.log === 'function') {
    device.log(`[P2397] gang UI soft-ensure +${added.join(',')}`);
  }

  return { added, gangCount, subDevices };
}

/**
 * Pulse Homey button.N maintenance tile so physical press is visible in UI.
 */
function pulseButtonCapability(device, gang = 1, ms = 500) {
  if (!device || typeof device.hasCapability !== 'function') return false;
  const caps = [];
  if (device.hasCapability(`button.${gang}`)) caps.push(`button.${gang}`);
  if (gang === 1 && device.hasCapability('button')) caps.push('button');
  if (caps.length === 0) return false;
  const set = typeof device.safeSetCapabilityValue === 'function'
    ? (c, v) => device.safeSetCapabilityValue(c, v)
    : (typeof device.setCapabilityValue === 'function'
      ? (c, v) => device.setCapabilityValue(c, v)
      : null);
  if (!set) return false;
  for (const cap of caps) {
    Promise.resolve(set(cap, true)).catch(() => {});
  }
  // WHY: always safeSetTimeout — bare setTimeout fails TITAN CI (Homey destroy races)
  try {
    const { safeSetTimeout } = require('./safe-timers');
    safeSetTimeout(device, () => {
      if (device._destroyed) return;
      for (const cap of caps) {
        Promise.resolve(set(cap, false)).catch(() => {});
      }
    }, ms);
  } catch (_e) {
    /* no bare setTimeout fallback — leave pulse high briefly rather than CI fail */
  }
  return true;
}

module.exports = {
  ensureGangUiCapabilities,
  usesHomeyZigbeeSubDevices,
  resolveUiGangCount,
  pulseButtonCapability,
};
