'use strict';

/**
 * ClimateSensorClassHeal — one-shot class fix for a temperature/humidity sensor that was paired through a
 * socket-class driver (Wilhelm Dall suggestion, 2026-10-17, `_TZ3000_bjawzodf` / TY0201).
 *
 * WHY: socket drivers such as device_plug_smart list sensor-type productIds without any manufacturerName, so
 * Homey also offers them for sensors; the paired device then stays on the "socket" class. Homey SDK v3
 * (Device#setClass) lets the app correct that class from onInit. Only exact, source-backed couples are healed
 * (Z2M WSD500A: TS0201 + `_TZ3000_bjawzodf`, DB entry P2266); nothing is guessed, nothing is removed.
 */

const { migrateDeviceClass } = require('./DeviceClassMigration');

const CLIMATE_SENSOR_COUPLES = new Set([
  '_tz3000_bjawzodf|ty0201',
  '_tz3000_bjawzodf|ts0201',
]);

function isClimateSensorCouple(mfr, pid) {
  return CLIMATE_SENSOR_COUPLES.has(`${String(mfr || '').trim().toLowerCase()}|${String(pid || '').trim().toLowerCase()}`);
}

async function healClimateSensorClass(device) {
  try {
    const { getManufacturerName, getModelId } = require('../helpers/ManufacturerNameHelper');
    const mfr = getManufacturerName(device);
    const pid = getModelId(device);
    if (!isClimateSensorCouple(mfr, pid)) { return false; }
    return await migrateDeviceClass(device, 'sensor', ['socket', 'other']);
  } catch (_e) {
    return false;
  }
}

module.exports = { isClimateSensorCouple, healClimateSensorClass, CLIMATE_SENSOR_COUPLES };
