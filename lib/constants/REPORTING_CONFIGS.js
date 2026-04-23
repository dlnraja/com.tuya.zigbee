'use strict';

// REPORTING_CONFIGS v5.12.12 - Adjusted values to prevent Zigbee network flooding
const ATTRS = {
  temperature: { minInterval: 60, maxInterval: 3600, minChange: 10 },
  humidity: { minInterval: 60, maxInterval: 3600, minChange: 100 },
  battery: { minInterval: 3600, maxInterval: 43200, minChange: 2 },
  batteryFast: { minInterval: 300, maxInterval: 3600, minChange: 1 },
  onoff: { minInterval: 0, maxInterval: 300, minChange: 1 },
  luminance: { minInterval: 60, maxInterval: 3600, minChange: 100 },
  motion: { minInterval: 1, maxInterval: 300, minChange: 0 },
  power: { minInterval: 30, maxInterval: 600, minChange: 10 }, // v5.12.12: increased from 5s to 30s to reduce TX/RX
  voltage: { minInterval: 60, maxInterval: 900, minChange: 10 }, // v5.12.12: increased from 10s to 60s
  current: { minInterval: 60, maxInterval: 900, minChange: 50 }, // v5.12.12: increased from 10s to 60s
  energy: { minInterval: 60, maxInterval: 3600, minChange: 1 }, // v5.12.12: increased from 30s to 60s
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
