'use strict';

/**
 * PlaceholderActionWiring (#113): some generated driver action cards only logged and returned
 * success. This module gives them a real effect when the device has a matching standard
 * capability (or method), by going through the device's OWN capability listener
 * (triggerCapabilityListener), so the driver's existing DP/ZCL code sends the command.
 *
 * Safety rules:
 * - unmapped card, missing capability or missing method -> behaviour unchanged (log + success);
 * - a command that was really attempted and failed is reported as an error with a clear message
 *   (the flow previously "succeeded" while doing nothing);
 * - the map is a small static JSON loaded once (config/flow/placeholder-action-wiring.json).
 */

let _map = null;
function loadMap() {
  if (_map) { return _map; }
  try { _map = require('../../config/flow/placeholder-action-wiring.json').cards || {}; } catch (_) { _map = {}; }
  return _map;
}

const truthy = (v) => v === true || v === 'true' || v === 1 || v === '1' || v === 'on';
const clamp = (v, lo, hi) => Math.min(hi, Math.max(lo, v));

function capRange(device, cap, dflt) {
  try {
    const o = device.getCapabilityOptions(cap) || {};
    return { min: typeof o.min === 'number' ? o.min : dflt.min, max: typeof o.max === 'number' ? o.max : dflt.max };
  } catch (_) { return dflt; }
}

/** Resolve {cap, value} or {method, args} for one card; null when nothing safe applies. */
function plan(device, spec, args) {
  const has = (c) => typeof device.hasCapability === 'function' && device.hasCapability(c);
  switch (spec.op) {
  case 'cover': {
    if (has('windowcoverings_state')) { return { cap: 'windowcoverings_state', value: spec.value }; }
    if (has('windowcoverings_set') && spec.value !== 'idle') { return { cap: 'windowcoverings_set', value: spec.value === 'up' ? 1 : 0 }; }
    return null;
  }
  case 'cover_favorite': {
    if (!has('windowcoverings_set')) { return null; }
    let fav = null;
    try { fav = device.getSetting('favorite_position'); } catch (_) { /* no setting */ }
    if (typeof fav !== 'number') { return null; }
    return { cap: 'windowcoverings_set', value: clamp(fav > 1 ? fav / 100 : fav, 0, 1) };
  }
  case 'bool_cap': {
    if (!has(spec.cap)) { return null; }
    const raw = spec.arg ? args[spec.arg] : spec.value;
    return { cap: spec.cap, value: spec.invert ? !truthy(raw) : truthy(raw) };
  }
  case 'enum_cap': {
    if (!has(spec.cap)) { return null; }
    const v = args[spec.arg];
    return v === undefined || v === null ? null : { cap: spec.cap, value: String(v) };
  }
  case 'step_cap': {
    if (!has(spec.cap)) { return null; }
    const cur = Number(device.getCapabilityValue(spec.cap));
    if (!Number.isFinite(cur)) { return null; }
    const step = spec.arg ? Number(args[spec.arg]) : spec.step;
    if (!Number.isFinite(step) || step <= 0) { return null; }
    const r = capRange(device, spec.cap, spec.range || { min: 0, max: 1 });
    return { cap: spec.cap, value: clamp(cur + spec.sign * step, r.min, r.max) };
  }
  case 'method': {
    if (typeof device[spec.method] !== 'function') { return null; }
    return { method: spec.method, args: (spec.args || []).map((a) => args[a]) };
  }
  default: return null;
  }
}

async function run(driver, cardId, args) {
  const device = args && args.device;
  if (!device) { return false; }
  const log = (...a) => { try { driver.log(...a); } catch (_) { /* never throw from logging */ } };
  const spec = loadMap()[cardId];
  const p = spec ? plan(device, spec, args || {}) : null;
  if (!p) {
    log('[FLOW] Action', cardId, 'triggered for', typeof device.getName === 'function' ? device.getName() : '?');
    return true;
  }
  try {
    if (p.method) {
      await device[p.method](...p.args);
    } else {
      await device.triggerCapabilityListener(p.cap, p.value);
      const set = typeof device.safeSetCapabilityValue === 'function' ? device.safeSetCapabilityValue.bind(device) : device.setCapabilityValue.bind(device);
      await Promise.resolve(set(p.cap, p.value)).catch(() => {});
    }
    log('[FLOW] Action', cardId, '->', p.method || `${p.cap}=${p.value}`);
    return true;
  } catch (err) {
    throw new Error(`${cardId}: device did not accept the command (${err && err.message ? err.message : err})`);
  }
}

module.exports = { run, plan, _loadMap: loadMap };
