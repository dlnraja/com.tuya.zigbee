'use strict';

/**
 * Power-restore burst: ZCL switches dump relay + backlight + button-mode
 * attributes in a few dozen ms. Last-write-wins per capability so a later
 * report does not get dropped, without applying every intermediate stampede.
 */

const BURST_GAP_MS = 60;
const BURST_WINDOW_MS = 200;
const BURST_COUNT = 3;
const COALESCE_MS = 50;

function _meta(device) {
  if (!device._rxBurstMeta) {
    device._rxBurstMeta = { last: 0, count: 0, windowStart: 0 };
  }
  return device._rxBurstMeta;
}

function _slots(device) {
  if (!device._rxBurstSlots) {
    device._rxBurstSlots = new Map();
  }
  return device._rxBurstSlots;
}

function _schedule(device, ms, fn) {
  const t = device?.homey && typeof device.homey.setTimeout === 'function'
    ? device.homey.setTimeout.bind(device.homey)
    : setTimeout;
  return t(fn, ms);
}

function noteBurst(device) {
  const now = Date.now();
  const m = _meta(device);
  if (now - m.last < BURST_GAP_MS) {
    m.count += 1;
  } else {
    m.count = 1;
    m.windowStart = now;
  }
  m.last = now;
  return m.count >= BURST_COUNT && (now - m.windowStart) < BURST_WINDOW_MS;
}

/**
 * Apply immediately unless a reconnect/report flood is in progress.
 * During a burst, last value per key wins after COALESCE_MS.
 *
 * @param {object} device
 * @param {string} key - capability (or endpoint+capability)
 * @param {*} value
 * @param {Function} applyFn - (value) => void|Promise
 */
function coalesceIfBurst(device, key, value, applyFn) {
  if (typeof applyFn !== 'function') {return false;}
  const bursting = noteBurst(device);
  if (!bursting) {
    applyFn(value);
    return false;
  }

  const slots = _slots(device);
  const prev = slots.get(key);
  if (prev) {
    prev.value = value;
    prev.applyFn = applyFn;
    return true;
  }

  const slot = { value, applyFn };
  slots.set(key, slot);
  slot.timer = _schedule(device, COALESCE_MS, () => {
    slots.delete(key);
    try {
      slot.applyFn(slot.value);
    } catch (_e) { /* device may be gone */ }
  });
  return true;
}

function isBursting(device) {
  const m = device?._rxBurstMeta;
  if (!m || !m.last) {return false;}
  const now = Date.now();
  return m.count >= BURST_COUNT && (now - m.windowStart) < BURST_WINDOW_MS;
}

/**
 * Run once after the current burst window settles (deduped by key).
 * Used to re-push Homey backlight / power-on settings instead of trusting
 * the ZCL boot dump.
 */
function afterBurst(device, key, fn) {
  if (!device || typeof fn !== 'function') {return;}
  const id = String(key || '_default');
  if (!device._rxBurstAfter) {
    device._rxBurstAfter = { timer: null, fns: new Map() };
  }
  const slot = device._rxBurstAfter;
  slot.fns.set(id, fn);
  if (slot.timer) {return;}
  slot.timer = _schedule(device, COALESCE_MS + 20, () => {
    slot.timer = null;
    const fns = slot.fns;
    slot.fns = new Map();
    for (const f of fns.values()) {
      try { f(); } catch (_e) { /* device may be gone */ }
    }
  });
}

function resetBurst(device) {
  if (device?._rxBurstSlots) {
    device._rxBurstSlots.clear();
  }
  if (device?._rxBurstMeta) {
    device._rxBurstMeta = { last: 0, count: 0, windowStart: 0 };
  }
  if (device?._rxBurstAfter) {
    device._rxBurstAfter.fns = new Map();
    device._rxBurstAfter.timer = null;
  }
}

module.exports = {
  coalesceIfBurst,
  noteBurst,
  afterBurst,
  isBursting,
  resetBurst,
  BURST_GAP_MS,
  COALESCE_MS,
};
