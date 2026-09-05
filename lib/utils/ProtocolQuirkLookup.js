'use strict';

/**
 * ProtocolQuirkLookup (P116)
 *
 * Shared, case-insensitive lookup into data/protocol_quirk_table.json.
 * Reimplements Z2M/ZHA quirk resolution locally without copying their
 * converters: Homey consumes sacred-couple keyed quirks (mfr + optional pid).
 *
 * Buffer-based JSON parse (v9 dual-layer / Homey 64MB heap).
 */

const fs = require('fs');
const path = require('path');

let _table = null;
let _mfrIndex = null;

function _loadTable() {
  if (_table) return _table;
  try {
    const fp = path.join(__dirname, '..', '..', 'data', 'protocol_quirk_table.json');
    const buf = fs.readFileSync(fp);
    _table = JSON.parse(buf);
  } catch (_e) {
    _table = { mfrQuirks: {} };
  }
  return _table;
}

function _normMfr(mfr) {
  return String(mfr || '').trim().toLowerCase();
}

function _buildIndex() {
  if (_mfrIndex) return _mfrIndex;
  const table = _loadTable();
  _mfrIndex = new Map();
  for (const [k, v] of Object.entries(table.mfrQuirks || {})) {
    _mfrIndex.set(_normMfr(k), v);
  }
  return _mfrIndex;
}

/**
 * @param {string} mfr manufacturerName (any case)
 * @returns {object|null} quirk entry
 */
function getMfrQuirk(mfr) {
  if (!mfr) return null;
  return _buildIndex().get(_normMfr(mfr)) || null;
}

/**
 * Resolve mfr from a Homey device instance.
 * @param {object} device
 * @returns {string}
 */
function resolveDeviceMfr(device) {
  try {
    return device?.getSetting?.('zb_manufacturer_name')
      || device?.getData?.()?.manufacturerName
      || device?.getData?.()?.manufacturer
      || '';
  } catch (_e) {
    return '';
  }
}

/**
 * Battery DP list for a manufacturer (Z2M-sourced quirks, Homey-shaped).
 * @param {string} mfr
 * @returns {{ percentDps: number[], voltageDps: number[], alarmDps: number[], raw: object[] }}
 */
function getBatteryDpPlan(mfr) {
  const quirk = getMfrQuirk(mfr);
  const raw = Array.isArray(quirk?.battery_dps) ? quirk.battery_dps : [];
  const percentDps = [];
  const voltageDps = [];
  const alarmDps = [];
  for (const entry of raw) {
    const dp = Number(entry?.dp ?? entry);
    if (!Number.isFinite(dp)) continue;
    const name = String(entry?.name || 'battery').toLowerCase();
    if (/volt/i.test(name)) voltageDps.push(dp);
    else if (/low|alarm|state/i.test(name)) alarmDps.push(dp);
    else percentDps.push(dp);
  }
  return { percentDps, voltageDps, alarmDps, raw, flags: quirk?.flags || [] };
}

/**
 * Init sequence names for a manufacturer (magic packet, query all, etc.).
 * @param {string} mfr
 * @returns {string[]}
 */
function getInitSequence(mfr) {
  const quirk = getMfrQuirk(mfr);
  return Array.isArray(quirk?.init) ? quirk.init.slice() : [];
}

function reload() {
  _table = null;
  _mfrIndex = null;
  return _loadTable();
}

module.exports = {
  getMfrQuirk,
  getBatteryDpPlan,
  getInitSequence,
  resolveDeviceMfr,
  reload,
};
