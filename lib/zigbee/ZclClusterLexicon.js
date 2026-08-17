'use strict';

/**
 * Canonical ZCL / Tuya cluster IDs for dumpers, scrapers, and runtime policy.
 * Hex mentions in forum posts (0x000A, 0x0001, …) resolve here — never guess.
 */

const CLUSTERS = Object.freeze({
  BASIC: { id: 0x0000, names: ['basic', 'genBasic'] },
  POWER_CFG: { id: 0x0001, names: ['powerConfiguration', 'genPowerCfg', 'powerCfg'] },
  IDENTIFY: { id: 0x0003, names: ['identify', 'genIdentify'] },
  GROUPS: { id: 0x0004, names: ['groups', 'genGroups'] },
  SCENES: { id: 0x0005, names: ['scenes', 'genScenes'] },
  ON_OFF: { id: 0x0006, names: ['onOff', 'genOnOff'] },
  LEVEL: { id: 0x0008, names: ['levelControl', 'genLevelCtrl'] },
  TIME: { id: 0x000A, names: ['time', 'genTime'] },
  OTA: { id: 0x0019, names: ['ota', 'genOta'] },
  POLL_CTRL: { id: 0x0020, names: ['pollControl'] },
  COLOR: { id: 0x0300, names: ['colorControl', 'lightingColorCtrl'] },
  ILLUMINANCE: { id: 0x0400, names: ['illuminanceMeasurement'] },
  TEMPERATURE: { id: 0x0402, names: ['temperatureMeasurement'] },
  HUMIDITY: { id: 0x0405, names: ['relativeHumidity'] },
  IAS_ZONE: { id: 0x0500, names: ['iasZone'] },
  METERING: { id: 0x0702, names: ['seMetering', 'metering'] },
  ELECTRICAL: { id: 0x0B04, names: ['haElectricalMeasurement', 'electricalMeasurement'] },
  TUYA_E000: { id: 0xE000, names: ['tuyaE000'] },
  TUYA_E001: { id: 0xE001, names: ['tuyaE001', 'tuyaPowerOnState'] },
  TUYA_EF00: { id: 0xEF00, names: ['tuya', 'manuSpecificTuya'] },
});

const BY_ID = new Map();
const BY_NAME = new Map();
for (const [key, meta] of Object.entries(CLUSTERS)) {
  BY_ID.set(meta.id, { key, ...meta });
  BY_ID.set(String(meta.id), { key, ...meta });
  for (const n of meta.names) {
    BY_NAME.set(n.toLowerCase(), { key, ...meta });
  }
}

function normalizeClusterId(raw) {
  if (raw == null) {return null;}
  if (typeof raw === 'number' && Number.isFinite(raw)) {return raw & 0xffff;}
  const s = String(raw).trim();
  const hex = s.match(/^0x([0-9a-f]{1,4})$/i);
  if (hex) {return parseInt(hex[1], 16);}
  const dec = s.match(/^(\d{1,5})$/);
  if (dec) {return Number(dec[1]) & 0xffff;}
  const named = BY_NAME.get(s.toLowerCase());
  return named ? named.id : null;
}

function lookupCluster(raw) {
  const id = normalizeClusterId(raw);
  if (id == null) {return null;}
  return BY_ID.get(id) || { key: `UNK_${id.toString(16)}`, id, names: [] };
}

/**
 * Pull cluster mentions from forum / log text (0x000A, cluster 10, genTime, …).
 * @param {string} text
 * @returns {Array<{id:number,key:string,raw:string}>}
 */
function parseClusterMentions(text) {
  const src = String(text || '');
  const found = new Map();
  const hex = src.matchAll(/\b0x0*([0-9a-f]{1,4})\b/gi);
  for (const m of hex) {
    const id = parseInt(m[1], 16);
    const meta = lookupCluster(id);
    if (meta) {found.set(id, { id, key: meta.key, raw: m[0] });}
  }
  const named = src.matchAll(/\b(genTime|genPowerCfg|genOnOff|genBasic|iasZone|time cluster|power configuration)\b/gi);
  for (const m of named) {
    const meta = lookupCluster(m[1].replace(/\s+cluster$/i, '').replace('power configuration', 'powerCfg'));
    if (meta) {found.set(meta.id, { id: meta.id, key: meta.key, raw: m[0] });}
  }
  return [...found.values()];
}

function applyReportingJitter(baseSeconds, jitterPercent = 10) {
  const base = Math.max(1, Number(baseSeconds) || 1);
  const variation = base * (Math.max(0, jitterPercent) / 100);
  const offset = (Math.random() * 2 - 1) * variation;
  return Math.max(1, Math.round(base + offset));
}

module.exports = {
  CLUSTERS,
  lookupCluster,
  normalizeClusterId,
  parseClusterMentions,
  applyReportingJitter,
};
