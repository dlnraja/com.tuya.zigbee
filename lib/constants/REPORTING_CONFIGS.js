'use strict';

// REPORTING_CONFIGS v5.9.23 - Tuya production-proven values
const CONFIGS = {
  temperature: { minInterval: 60, maxInterval: 3600, minChange: 10 },
  humidity: { minInterval: 60, maxInterval: 3600, minChange: 100 },
  battery: { minInterval: 3600, maxInterval: 43200, minChange: 2 },
  batteryFast: { minInterval: 300, maxInterval: 3600, minChange: 1 },
  onoff: { minInterval: 0, maxInterval: 300, minChange: 1 },
  luminance: { minInterval: 60, maxInterval: 3600, minChange: 100 },
  motion: { minInterval: 1, maxInterval: 300, minChange: 0 },
  power: { minInterval: 5, maxInterval: 300, minChange: 5 },
  voltage: { minInterval: 10, maxInterval: 600, minChange: 5 },
  current: { minInterval: 10, maxInterval: 600, minChange: 50 },
  energy: { minInterval: 30, maxInterval: 900, minChange: 1 },
  default: { minInterval: 60, maxInterval: 3600, minChange: 1 },
};

const CAP_MAP = {
  measure_temperature: 'temperature',
  measure_humidity: 'humidity',
  measure_battery: 'battery',
  measure_power: 'power',
  measure_voltage: 'voltage',
  measure_current: 'current',
  meter_power: 'energy',
  alarm_motion: 'motion',
  measure_luminance: 'luminance',
  onoff: 'onoff',
};

function getConfig(capId) {
  return CONFIGS[CAP_MAP[capId] || 'default'] || CONFIGS.default;
}

function getConfigOverride(capId, overrides) {
  return { ...getConfig(capId), ...overrides };
}

module.exports = { CONFIGS, CAP_MAP, getConfig, getConfigOverride };
