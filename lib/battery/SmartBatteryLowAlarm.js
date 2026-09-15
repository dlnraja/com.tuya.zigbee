'use strict';

/**
 * SmartBatteryLowAlarm (P2506)
 *
 * WHY: Homey SDK forbids measure_battery + alarm_battery on the same device
 * (duplicate UI + Flow). We keep measure_battery for % and own a custom
 * boolean `tuya_battery_low` with hysteresis — never native alarm_battery.
 *
 * Contre quoi: re-introducing alarm_battery beside %, or flapping on 19↔21%.
 */

const CAP_ID = 'tuya_battery_low';
const DEFAULT_LOW = 20;
const DEFAULT_HYST = 5;

function _num(v, fallback) {
  const n = Number(v);
  return Number.isFinite(n) ? n : fallback;
}

/**
 * @param {object} device Homey device-like
 * @returns {{ low: number, clear: number }}
 */
function resolveThresholds(device) {
  let low = DEFAULT_LOW;
  let hyst = DEFAULT_HYST;
  try {
    low = _num(device?.getSetting?.('battery_low_threshold'), DEFAULT_LOW);
    hyst = _num(device?.getSetting?.('battery_low_clear_hysteresis'), DEFAULT_HYST);
  } catch (_) { /* soft */ }
  low = Math.max(1, Math.min(99, low));
  hyst = Math.max(1, Math.min(30, hyst));
  const clear = Math.min(100, low + hyst);
  return { low, clear };
}

/**
 * Pure decide — Contre quoi unit-testable.
 * @param {boolean|null|undefined} prevLow
 * @param {number} percent
 * @param {{ low: number, clear: number }} thresholds
 * @returns {boolean|null} next low state, or null = unchanged / skip
 */
function decideLow(prevLow, percent, thresholds) {
  const pct = Number(percent);
  if (!Number.isFinite(pct) || pct < 0 || pct > 100) return null;
  const { low, clear } = thresholds || resolveThresholds({});
  const was = prevLow === true;

  if (!was && pct <= low) return true;
  if (was && pct >= clear) return false;
  if (prevLow == null) return pct <= low;
  return null;
}

function shouldOwnAlarm(device) {
  if (!device) return false;
  if (device.mainsPowered === true) return false;
  if (typeof device.hasCapability === 'function' && !device.hasCapability('measure_battery')) {
    return false;
  }
  return true;
}

/**
 * Strip Homey native alarm_battery when % is present (SDK mutual exclusion).
 */
async function stripNativeAlarmBattery(device) {
  if (!device?.hasCapability) return false;
  if (!device.hasCapability('measure_battery')) return false;
  if (!device.hasCapability('alarm_battery')) return false;
  try {
    await device.removeCapability('alarm_battery');
    device.log?.('[P2506] removed native alarm_battery (keep measure_battery + tuya_battery_low)');
    return true;
  } catch (_) {
    return false;
  }
}

async function ensureCapability(device) {
  if (!shouldOwnAlarm(device)) return false;
  await stripNativeAlarmBattery(device);
  if (!device.hasCapability(CAP_ID)) {
    try {
      await device.addCapability(CAP_ID);
    } catch (_) {
      return false;
    }
  }
  return device.hasCapability(CAP_ID);
}

/**
 * Apply after a measure_battery paint.
 * @returns {{ changed: boolean, low: boolean|null }}
 */
async function applyFromPercent(device, percent, opts = {}) {
  const out = { changed: false, low: null };
  if (!shouldOwnAlarm(device)) return out;

  const ok = await ensureCapability(device);
  if (!ok) return out;

  const thresholds = resolveThresholds(device);
  let prev;
  try {
    prev = device.getCapabilityValue(CAP_ID);
  } catch (_) {
    prev = null;
  }
  if (typeof prev !== 'boolean') prev = null;

  const next = decideLow(prev, percent, thresholds);
  if (next === null) {
    out.low = prev;
    return out;
  }

  try {
    // Bypass safeSetCapabilityValue: avoid EventDedup/throttle/fusion holding the boolean.
    // Contre quoi: stuck tuya_battery_low when % already painted via safeSet.
    let Homey;
    try { Homey = require('homey'); } catch (_) { Homey = null; }
    if (Homey?.Device?.prototype?.setCapabilityValue) {
      await Homey.Device.prototype.setCapabilityValue.call(device, CAP_ID, next);
    } else if (typeof device.setCapabilityValue === 'function') {
      await device.setCapabilityValue(CAP_ID, next);
    } else {
      return out;
    }
  } catch (_) {
    return out;
  }

  out.changed = prev !== next;
  out.low = next;

  if (out.changed && opts.emitFlows !== false) {
    await emitFlows(device, next, percent, thresholds).catch(() => {});
  }
  return out;
}

async function emitFlows(device, isLow, percent, thresholds) {
  const homey = device.homey;
  if (!homey?.flow) return;
  const tokens = {
    battery_percent: Math.round(Number(percent) || 0),
    threshold: thresholds.low,
  };
  const cardId = isLow ? 'tuya_battery_low_true' : 'tuya_battery_low_false';
  try {
    const card = homey.flow.getDeviceTriggerCard(cardId);
    if (card) await card.trigger(device, tokens, {});
  } catch (_) { /* card may be missing on older tip */ }
}

module.exports = {
  CAP_ID,
  DEFAULT_LOW,
  DEFAULT_HYST,
  resolveThresholds,
  decideLow,
  shouldOwnAlarm,
  stripNativeAlarmBattery,
  ensureCapability,
  applyFromPercent,
};
