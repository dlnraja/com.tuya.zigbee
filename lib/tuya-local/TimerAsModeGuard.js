'use strict';

/**
 * P3384 / Tuya Local 154077 #537-#538 (Welshsmarthome, Andi): a scent
 * diffuser (product id 2xmg9yzn3gzzukff, model PD10) was paired as a
 * dehumidifier. The driver treated the timer on DP 4 ("4h") as the mode
 * and DP 5 as fan speed. Reject timer-like values as a mode binding.
 *
 * Product id recorded as a lead only; this guard is generic.
 */

const TIMER_RE = /^(?:[0-9]+(?:[.][0-9]+)?)(?:h|hr|hrs|hour|hours|min|mins|m|s|sec|secs)$/i;

function isTimerLikeValue(value) {
  if (value == null) {return false;}
  if (typeof value === 'number') {return false;}
  const s = String(value).trim();
  if (!s) {return false;}
  return TIMER_RE.test(s);
}

function shouldBindAsMode(values) {
  const list = Array.isArray(values) ? values : values == null ? [] : [values];
  if (!list.length) {return true;}
  const timerHits = list.filter((v) => isTimerLikeValue(v)).length;
  return timerHits < list.length;
}

function filterModeMapping(mapping, observedValues) {
  if (!mapping || typeof mapping !== 'object') {return mapping;}
  const cap = mapping.capability || mapping.cap;
  if (cap !== 'thermostat_mode' && cap !== 'fan_mode' && cap !== 'dim' && cap !== 'air_purifier_mode') {
    if (cap !== 'mode' && cap !== 'dehumidifier_mode') {return mapping;}
  }
  if (shouldBindAsMode(observedValues)) {return mapping;}
  return null;
}

module.exports = {
  TIMER_RE,
  isTimerLikeValue,
  shouldBindAsMode,
  filterModeMapping,
};
