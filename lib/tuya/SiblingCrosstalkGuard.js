'use strict';

/**
 * P3396 SiblingCrosstalkGuard
 *
 * Drop a climate reading that jumps far from this device's last value and
 * matches a sibling on the same driver.
 *
 * WHY: Gmail diag ec7026a7 (Universal Tuya 9.0.1636, couple
 * _TZE284_9ern5sfh + TS0601 on lcdtemphumidsensor_3). The user has three
 * LCD sensors; sometimes every Homey tile jumps to the basement temperature
 * while each LCD still shows the real room value. The 10-minute stdout
 * buffer did not catch the jump (each device reported its own 9 / 22 / 26 C),
 * so the report is taken as true and this guard rejects that pattern.
 *
 * Per-device only. Never removes a capability. First sample and gradual
 * changes always pass. ASCII only.
 */

const DEFAULTS = Object.freeze({
  measure_temperature: Object.freeze({ jump: 5, match: 0.35 }),
  measure_humidity: Object.freeze({ jump: 8, match: 2.1 }),
});

const lastByDevice = new WeakMap();

function _thresholds(capability, overrides) {
  const base = DEFAULTS[capability];
  if (!base) {return null;}
  if (!overrides) {return base;}
  return {
    jump: Number.isFinite(overrides.jump) ? overrides.jump : base.jump,
    match: Number.isFinite(overrides.match) ? overrides.match : base.match,
  };
}

function _cap(device, capability) {
  try {
    if (typeof device.getCapabilityValue === 'function') {
      return device.getCapabilityValue(capability);
    }
  } catch (_e) { /* soft */ }
  return undefined;
}

function _id(device) {
  try {
    const data = typeof device.getData === 'function' ? device.getData() : null;
    return (data && (data.id || data.ieeeAddress || data.ieeeAddr)) || device.id || null;
  } catch (_e) {
    return device.id || null;
  }
}

function _siblings(device) {
  try {
    const list = device.driver && typeof device.driver.getDevices === 'function'
      ? device.driver.getDevices()
      : null;
    if (!Array.isArray(list)) {return [];}
    const selfId = _id(device);
    return list.filter((other) => {
      if (!other || other === device || other._destroyed === true) {return false;}
      if (selfId == null) {return other !== device;}
      return _id(other) !== selfId;
    });
  } catch (_e) {
    return [];
  }
}

function _state(device) {
  let st = lastByDevice.get(device);
  if (!st) {
    st = { caps: Object.create(null) };
    lastByDevice.set(device, st);
  }
  return st;
}

function recordAccepted(device, capability, value, now = Date.now()) {
  if (!device || capability == null || !Number.isFinite(value)) {return;}
  const st = _state(device);
  st.caps[capability] = { value, ts: now };
}

function _lastValue(device, capability) {
  const st = lastByDevice.get(device);
  if (st && st.caps[capability] && Number.isFinite(st.caps[capability].value)) {
    return st.caps[capability].value;
  }
  const live = _cap(device, capability);
  return Number.isFinite(live) ? live : undefined;
}

function _matchesSibling(device, capability, nextValue, match) {
  const siblings = _siblings(device);
  for (let i = 0; i < siblings.length; i++) {
    const raw = _cap(siblings[i], capability);
    if (!Number.isFinite(raw)) {continue;}
    if (Math.abs(raw - nextValue) <= match) {return true;}
  }
  return false;
}

/**
 * @param {object} device
 * @param {string} capability
 * @param {number} nextValue already scaled, including any user offset
 * @param {{ now?: number, jump?: number, match?: number }} [opts]
 * @returns {boolean} true when the sample must be dropped
 */
function shouldRejectSiblingCrosstalk(device, capability, nextValue, opts = {}) {
  if (!device || device._destroyed === true || !Number.isFinite(nextValue)) {
    return false;
  }
  const th = _thresholds(capability, opts);
  if (!th) {return false;}

  const previous = _lastValue(device, capability);
  if (!Number.isFinite(previous)) {return false;}

  const delta = Math.abs(nextValue - previous);
  if (delta < th.jump) {return false;}

  if (!_matchesSibling(device, capability, nextValue, th.match)) {return false;}

  return true;
}

function reset(device) {
  if (device) {lastByDevice.delete(device);}
}

module.exports = {
  shouldRejectSiblingCrosstalk,
  recordAccepted,
  reset,
  DEFAULTS,
};
