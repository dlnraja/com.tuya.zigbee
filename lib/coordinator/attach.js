'use strict';
// Spec 003 T3 — opt-in attachment of DeviceCoordinator to a Homey device instance.
// Enabled only when the resolved profile says `enabled: true` (data/coordinator-profiles.json,
// class > driver > mfr+pid) or the device has a `coordinator_mode` setting set to 'on'.
// 'off' always wins. Any failure → null → callers behave exactly as before (D2).
const { DeviceCoordinator, resolveProfile } = require('./DeviceCoordinator');

const KEY = '_specCoordinator';

function identityOf(device) {
  let mfr = '';
  let pid = '';
  try {
    const s = device.getSettings?.() || {};
    mfr = s.zb_manufacturer_name || s.zb_manufacturerName || '';
    pid = s.zb_model_id || s.zb_modelId || '';
  } catch (_e) { /* soft */ }
  try {
    if (!mfr) { mfr = device.getStoreValue?.('manufacturerName') || ''; }
    if (!pid) { pid = device.getStoreValue?.('modelId') || ''; }
  } catch (_e) { /* soft */ }
  return {
    deviceClass: device.driver?.manifest?.class || '',
    driverId: device.driver?.id || '',
    mfr,
    pid,
  };
}

/** @returns {DeviceCoordinator|null} */
function getCoordinator(device) {
  if (!device) { return null; }
  if (device[KEY] !== undefined) { return device[KEY]; }
  let c = null;
  try {
    const profile = resolveProfile(identityOf(device));
    let mode = null;
    try { mode = device.getSetting?.('coordinator_mode'); } catch (_e) { /* soft */ }
    const on = mode === 'on' || (mode !== 'off' && profile.enabled === true);
    if (on) { c = new DeviceCoordinator({}, { profile }); }
  } catch (_e) { c = null; }
  try { device[KEY] = c; } catch (_e) { /* frozen */ }
  return c;
}

/** Drop the cached instance (e.g. after settings change). */
function resetCoordinator(device) {
  try { delete device[KEY]; } catch (_e) { /* soft */ }
}

/**
 * Button press gate: one trigger per real press across channels. Same-channel repeats are
 * left to the existing anti-trigger logic so double/triple click detection is unchanged.
 * @returns {boolean} true when the press should be processed
 */
function admitButtonPress(device, button, pressType, options = {}) {
  const c = getCoordinator(device);
  if (!c) { return true; }
  const source = String(options.channel || options.source || 'physical');
  if (source === 'virtual') { return true; }
  const seq = options.seq ?? options.transactionSequenceNumber;
  const r = c.ingest(source, `btn${button}`, pressType, {
    pressType, seq, crossChannelOnly: true, windowMs: c.profile.buttonCrossMs ?? c.profile.dedupeMs,
  });
  return r.apply;
}

/**
 * Actuator command gate: identical payload to the same target inside commandMs is collapsed.
 * Only active when the profile sets `collapseCommands: true`.
 */
function admitCommand(device, target, payload) {
  const c = getCoordinator(device);
  if (!c || c.profile.collapseCommands !== true) { return true; }
  return c.command(String(target), payload);
}

module.exports = { getCoordinator, resetCoordinator, admitButtonPress, admitCommand, identityOf };
