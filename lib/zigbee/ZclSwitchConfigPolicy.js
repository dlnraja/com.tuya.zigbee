'use strict';

/**
 * Homey settings win over a Tuya ZCL power-restore dump.
 * Config attributes (backlight, power-on, switch mode) live on EP1 only.
 */

const POWER_ON_TO_ZCL = { off: 0, on: 1, memory: 2, previous: 2 };
const POWER_ON_FROM_ZCL = { 0: 'off', 1: 'on', 2: 'memory' };
const BACKLIGHT_TO_ZCL = { off: 0, normal: 1, inverted: 2 };
const SWITCH_MODE_TO_ZCL = { toggle: 0, state: 1, momentary: 2 };
const SWITCH_MODE_FROM_ZCL = { 0: 'toggle', 1: 'state', 2: 'momentary' };

const CONFIG_SETTING_KEYS = Object.freeze([
  'backlight_mode',
  'power_on_behavior',
  'switch_mode',
  'child_lock',
  'led_indicator',
  'inching_mode',
  'inching_duration',
  'inching',
]);

function _norm(v) {
  if (v === undefined || v === null || v === '') {return null;}
  return String(v);
}

function samePowerOn(stored, reported) {
  if (stored === reported) {return true;}
  return (stored === 'previous' && reported === 'memory')
    || (stored === 'memory' && reported === 'previous');
}

/**
 * @param {string|null} stored Homey setting
 * @param {number|null} reportedNumeric value from the device
 * @param {object} fromMap numeric → setting string
 * @param {(a: string, b: string) => boolean} [equal]
 * @returns {{ action: 'write'|'seed'|'keep'|'noop', stored?: string }}
 */
function resolveConfigAttr(stored, reportedNumeric, fromMap, equal) {
  const have = _norm(stored);
  const reported = reportedNumeric === undefined || reportedNumeric === null
    ? null
    : (fromMap[reportedNumeric] || fromMap[Number(reportedNumeric)] || null);
  if (have) {
    if (reported && !(equal ? equal(have, reported) : have === reported)) {
      return { action: 'write', stored: have };
    }
    return { action: 'keep', stored: have };
  }
  if (reported) {
    return { action: 'seed', stored: reported };
  }
  return { action: 'noop' };
}

function isConfigSettingKey(key) {
  const k = String(key || '');
  if (CONFIG_SETTING_KEYS.includes(k)) {return true;}
  return /^inching(_mode|_duration)?(_\d+)?$/.test(k);
}

module.exports = {
  POWER_ON_TO_ZCL,
  POWER_ON_FROM_ZCL,
  BACKLIGHT_TO_ZCL,
  SWITCH_MODE_TO_ZCL,
  SWITCH_MODE_FROM_ZCL,
  CONFIG_SETTING_KEYS,
  resolveConfigAttr,
  samePowerOn,
  isConfigSettingKey,
};
