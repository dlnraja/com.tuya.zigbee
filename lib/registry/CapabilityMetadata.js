'use strict';
// v9.0.40: Capability Metadata Registry (Z2M pattern)
// Exposes min/max/unit/decimals for capabilities
// Used by flow cards, UI, and validation

const METADATA = {
  // Temperature
  'measure_temperature': {
    min: -40, max: 80, step: 0.1, unit: '°C', decimals: 1,
    title: { en: 'Temperature', fr: 'Température' },
    icon: ' thermometer',
  },
  // Humidity
  'measure_humidity': {
    min: 0, max: 100, step: 1, unit: '%', decimals: 0,
    title: { en: 'Humidity', fr: 'Humidité' },
    icon: '💧',
  },
  // Pressure
  'measure_pressure': {
    min: 300, max: 1100, step: 1, unit: 'hPa', decimals: 0,
    title: { en: 'Pressure', fr: 'Pression' },
  },
  // Luminance
  'measure_luminance': {
    min: 0, max: 100000, step: 1, unit: 'lux', decimals: 0,
    title: { en: 'Luminance', fr: 'Luminosité' },
    icon: '☀️',
  },
  // CO2
  'measure_co2': {
    min: 0, max: 5000, step: 1, unit: 'ppm', decimals: 0,
    title: { en: 'CO₂', fr: 'CO₂' },
  },
  // Power
  'measure_power': {
    min: 0, max: 36000, step: 0.1, unit: 'W', decimals: 1,
    title: { en: 'Power', fr: 'Puissance' },
    icon: '⚡',
  },
  // Voltage
  'measure_voltage': {
    min: 0, max: 500, step: 0.1, unit: 'V', decimals: 1,
    title: { en: 'Voltage', fr: 'Tension' },
  },
  // Current
  'measure_current': {
    min: 0, max: 100, step: 0.001, unit: 'A', decimals: 3,
    title: { en: 'Current', fr: 'Courant' },
  },
  // Energy
  'meter_power': {
    min: 0, max: 99999, step: 0.01, unit: 'kWh', decimals: 2,
    title: { en: 'Energy', fr: 'Énergie' },
    icon: '🔋',
  },
  // Battery
  'measure_battery': {
    min: 0, max: 100, step: 1, unit: '%', decimals: 0,
    title: { en: 'Battery', fr: 'Batterie' },
    icon: '🔋',
  },
  // Dim
  'dim': {
    min: 0, max: 1, step: 0.01, unit: '', decimals: 2,
    title: { en: 'Brightness', fr: 'Luminosité' },
  },
  // Cover position
  'windowcoverings_set': {
    min: 0, max: 1, step: 0.01, unit: '', decimals: 2,
    title: { en: 'Position', fr: 'Position' },
  },
  // Formaldehyde
  'measure_formaldehyde': {
    min: 0, max: 10, step: 0.01, unit: 'mg/m³', decimals: 2,
    title: { en: 'Formaldehyde', fr: 'Formaldéhyde' },
  },
  // VOC
  'measure_voc': {
    min: 0, max: 500, step: 1, unit: 'ppb', decimals: 0,
    title: { en: 'VOC', fr: 'COV' },
  },
  // PM2.5
  'measure_pm25': {
    min: 0, max: 500, step: 1, unit: 'µg/m³', decimals: 0,
    title: { en: 'PM2.5', fr: 'PM2.5' },
  },
};

module.exports = {
  METADATA,

  /**
   * Get metadata for a capability
   * @param {string} capabilityId
   * @returns {object|null}
   */
  get(capabilityId) {
    return METADATA[capabilityId] || null;
  },

  /**
   * Get unit for a capability
   * @param {string} capabilityId
   * @returns {string}
   */
  getUnit(capabilityId) {
    return (METADATA[capabilityId] || {}).unit || '';
  },

  /**
   * Get range for a capability
   * @param {string} capabilityId
   * @returns {{ min: number, max: number, step: number }}
   */
  getRange(capabilityId) {
    const m = METADATA[capabilityId];
    return m ? { min: m.min, max: m.max, step: m.step } : { min: 0, max: 100, step: 1 };
  },

  /**
   * Validate a value against capability metadata
   * @param {string} capabilityId
   * @param {number} value
   * @returns {boolean}
   */
  validate(capabilityId, value) {
    const m = METADATA[capabilityId];
    if (!m) return true;
    return typeof value === 'number' && value >= m.min && value <= m.max;
  },
};
