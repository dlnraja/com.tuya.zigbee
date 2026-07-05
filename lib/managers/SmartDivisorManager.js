'use strict';

const LEARNED_DIVISORS = new Map();

const CAP_TYPES = {
  measure_power: 'power',
  measure_current: 'current',
  measure_voltage: 'voltage',
  meter_power: 'energy',
  measure_temperature: 'temperature',
  measure_humidity: 'humidity',
  measure_battery: 'battery',
};

const KNOWN_DIVISORS = {
  power: { default: 10 },
  current: { default: 1000 },
  voltage: { default: 10 },
  energy: { default: 1000 },
  temperature: { default: 10 },
  humidity: { default: 1 },
  battery: { default: 1 },
};

function clearDivisorCache() {
  LEARNED_DIVISORS.clear();
}

function toNumber(value) {
  const parsed = Number(value);
  return Number.isFinite(parsed) ? parsed : null;
}

function getKnownDivisor(capType, manufacturerName, dpId) {
  const db = KNOWN_DIVISORS[capType];
  if (!db) return null;

  if (manufacturerName) {
    const exact = db[manufacturerName];
    if (exact?.dp && dpId !== null && exact.dp[dpId] !== undefined) {
      return exact.dp[dpId];
    }
  }

  return db.default ?? null;
}

function smartDivisorDetect(rawValue, dpId, options = {}) {
  const value = toNumber(rawValue);
  if (value === null) return 1;

  const {
    manufacturerName = '',
    capability = '',
    deviceId = '',
    defaultDivisor = null,
  } = options;

  const cacheKey = `${manufacturerName}|${deviceId}|${dpId}|${capability}`;
  if (LEARNED_DIVISORS.has(cacheKey)) {
    return LEARNED_DIVISORS.get(cacheKey);
  }

  const capType = CAP_TYPES[capability] || '';
  let divisor = getKnownDivisor(capType, manufacturerName, dpId);

  if (defaultDivisor !== null && defaultDivisor !== undefined) {
    divisor = defaultDivisor;
  }

  if (!divisor || !Number.isFinite(Number(divisor))) {
    divisor = 1;
  }

  LEARNED_DIVISORS.set(cacheKey, divisor);
  if (LEARNED_DIVISORS.size > 1000) {
    const firstKey = LEARNED_DIVISORS.keys().next().value;
    LEARNED_DIVISORS.delete(firstKey);
  }

  return divisor;
}

function smartParse(rawValue, dpId, options = {}) {
  const value = toNumber(rawValue);
  if (value === null) return 0;

  const divisor = smartDivisorDetect(value, dpId, options);
  const parsed = value / divisor;
  return Math.round(parsed * 1000) / 1000;
}

module.exports = {
  smartDivisorDetect,
  smartParse,
  clearDivisorCache,
  KNOWN_DIVISORS,
};
