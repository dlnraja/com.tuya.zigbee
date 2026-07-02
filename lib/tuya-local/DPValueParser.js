'use strict';

function parseBoolean(value) {
  if (typeof value === 'boolean') return value;
  if (typeof value === 'number') return value !== 0;
  const normalized = String(value).trim().toLowerCase();
  if (['true', '1', 'on', 'yes', 'y', 'open', 'enabled'].includes(normalized)) return true;
  if (['false', '0', 'off', 'no', 'n', 'closed', 'disabled'].includes(normalized)) return false;
  throw new Error(`Invalid boolean DP value: ${value}`);
}

function parseDPValue(value, type = 'string') {
  const selectedType = String(type || 'string').toLowerCase();

  if (selectedType === 'bool' || selectedType === 'boolean') {
    return parseBoolean(value);
  }

  if (selectedType === 'number') {
    const number = Number(value);
    if (!Number.isFinite(number)) {
      throw new Error(`Invalid numeric DP value: ${value}`);
    }
    return number;
  }

  if (selectedType === 'json') {
    try {
      return JSON.parse(String(value));
    } catch (err) {
      throw new Error(`Invalid JSON DP value: ${err.message}`);
    }
  }

  return value === undefined || value === null ? '' : String(value);
}

function stringifyDPValue(value) {
  if (value === undefined) return '';
  if (typeof value === 'string') return value;
  try {
    return JSON.stringify(value);
  } catch (_err) {
    return String(value);
  }
}

module.exports = {
  parseDPValue,
  stringifyDPValue,
};
