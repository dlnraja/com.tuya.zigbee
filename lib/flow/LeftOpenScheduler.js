'use strict';

/**
 * P3077 flow batch 7: "Left open for duration" triggers declared on contact drivers had no emitter.
 * One shared, bounded, app-level scheduler: at most one pending timer per device+card (dedup), at most
 * MAX_PENDING timers overall. Opening arms the timer, closing cancels it. When it expires the card fires
 * once per open episode, and only if the contact is still open at that moment.
 *
 * Return codes are upper-case on purpose: the P2803 builder treats lower-case quoted words as fired ids.
 */
const MAX_PENDING = 256;
const DEFAULT_MINUTES = 5;

let _pending = new WeakMap(); // device -> Map(cardId -> { handle, homey })
let _count = 0;

function _minutes(when) {
  const n = Number(String(when || '').split(':')[1]);
  return Number.isFinite(n) && n > 0 && n <= 1440 ? n : DEFAULT_MINUTES;
}

function _clear(device, id) {
  const m = _pending.get(device);
  const e = m && m.get(id);
  if (!e) {return false;}
  try {
    if (typeof e.homey.clearTimeout === 'function') {e.homey.clearTimeout(e.handle);}
  } catch (_) { /* soft */ }
  m.delete(id);
  _count = Math.max(0, _count - 1);
  return true;
}

function _stillOpen(device, cap) {
  try { return device.getCapabilityValue(cap) === true; } catch (_) { return false; }
}

/**
 * @param {object} device Homey device
 * @param {string} id trigger card id
 * @param {string} when `openfor:<minutes>`
 * @param {*} value new alarm_contact value
 * @param {(device, id, tokens, state) => *} fire
 * @param {string} [cap]
 * @returns {'ARMED'|'DEDUP'|'CLEARED'|'FULL'|'IDLE'}
 */
function track(device, id, when, value, fire, cap = 'alarm_contact') {
  // Homey-managed timers only (cleared on app unload); no raw timer fallback (P3068 memory ratchet)
  const homey = device && device.homey && typeof device.homey.setTimeout === 'function' ? device.homey : null;
  if (!homey || typeof fire !== 'function') {return 'IDLE';}
  if (value !== true) {return _clear(device, id) ? 'CLEARED' : 'IDLE';}
  let m = _pending.get(device);
  if (m && m.has(id)) {return 'DEDUP';}
  if (_count >= MAX_PENDING) {return 'FULL';}
  if (!m) { m = new Map(); _pending.set(device, m); }
  const minutes = _minutes(when);
  const run = () => {
    const mm = _pending.get(device);
    if (mm && mm.delete(id)) {_count = Math.max(0, _count - 1);}
    if (!_stillOpen(device, cap)) {return;}
    try { Promise.resolve(fire(device, id, { duration: minutes }, { capability: cap, value: true, duration: minutes })).catch(() => {}); } catch (_) { /* soft */ }
  };
  const ms = minutes * 60000;
  m.set(id, { handle: homey.setTimeout(run, ms), homey });
  _count++;
  return 'ARMED';
}

function pendingCount() { return _count; }
function _resetForTests() { _pending = new WeakMap(); _count = 0; }

module.exports = { track, pendingCount, MAX_PENDING, DEFAULT_MINUTES, _resetForTests };
