'use strict';

/**
 * Single entry point for ZCL powerConfiguration battery normalization.
 *
 * `batteryPercentageRemaining` is specified on a 0-200 scale (0.5% steps), but a
 * large part of the Tuya fleet reports 0-100 directly and several manufacturers
 * report on a 0-50 scale. UnifiedBatteryHandler owns that per-manufacturer quirk
 * table; drivers must call through here instead of doing their own arithmetic so
 * the quirk list only has to be maintained in one place.
 */

let UnifiedBatteryHandler = null;
try {
  UnifiedBatteryHandler = require('./UnifiedBatteryHandler');
} catch (err) {
  UnifiedBatteryHandler = null;
}

const SENTINELS = new Set([255, 0xFFFF]);

function clampPercent(value) {
  return Math.min(100, Math.max(0, Math.round(value)));
}

/**
 * Reads `zb_manufacturer_name` without throwing while the device is torn down.
 * @param {object} device Homey device instance
 * @returns {string}
 */
function manufacturerOf(device) {
  try {
    return (device && typeof device.getSetting === 'function' && device.getSetting('zb_manufacturer_name')) || '';
  } catch (err) {
    return '';
  }
}

/**
 * @param {number} raw Raw `batteryPercentageRemaining` attribute value
 * @param {{manufacturer?: string, batteryType?: string}} [options]
 * @returns {number|null} 0-100 percentage, or null when the report is a sentinel
 */
function normalizeZclBatteryPercent(raw, options = {}) {
  const value = Number(raw);
  if (!Number.isFinite(value) || SENTINELS.has(value)) return null;

  if (UnifiedBatteryHandler && typeof UnifiedBatteryHandler.normalizeZigbeeValue === 'function') {
    const normalized = UnifiedBatteryHandler.normalizeZigbeeValue(value, {
      manufacturer: options.manufacturer || '',
      batteryType: options.batteryType || 'CR2032',
    });
    return Number.isFinite(normalized) ? clampPercent(normalized) : null;
  }

  return clampPercent(value / 2);
}

/**
 * Converts a raw ZCL `batteryVoltage` report to a percentage using the
 * non-linear discharge curves. Linear voltage-to-percent mapping is banned
 * because it reports ~50% for a cell that is nearly flat.
 *
 * @param {number} raw Voltage in V, 100mV steps (ZCL spec) or mV
 * @param {{batteryType?: string, temperature?: number}} [options]
 * @returns {number|null} 0-100 percentage, or null when unusable
 */
function normalizeZclBatteryVoltagePercent(raw, options = {}) {
  const value = Number(raw);
  if (!Number.isFinite(value) || value <= 0 || SENTINELS.has(value)) return null;
  if (!UnifiedBatteryHandler || typeof UnifiedBatteryHandler.calculateFromVoltage !== 'function') return null;

  const volts = typeof UnifiedBatteryHandler.normalizeVoltage === 'function'
    ? UnifiedBatteryHandler.normalizeVoltage(value)
    : value;
  if (!Number.isFinite(volts)) return null;

  const percent = UnifiedBatteryHandler.calculateFromVoltage(
    volts,
    options.batteryType || '3V_2100',
    options.temperature,
  );
  return Number.isFinite(percent) ? clampPercent(percent) : null;
}

module.exports = {
  normalizeZclBatteryPercent,
  normalizeZclBatteryVoltagePercent,
  manufacturerOf,
  clampPercent,
};
