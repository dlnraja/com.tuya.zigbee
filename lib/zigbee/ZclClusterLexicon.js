'use strict';

/**
 * ARCH / SSOT: Lexer for ZCL + Tuya proprietary cluster IDs/names (P2270).
 * ORIGIN: Runtime policy + forum/diag text extractors; E000/E001/E002 taxonomy fixed P2267.
 * POURQUOI: Homey, Z2M, ZHA and forum posts use different aliases for the same cluster.
 * COMMENT: lookupCluster / parseClusterMentions — no network I/O.
 * POUR QUI: CI harvest, scrapers, PathFinder, BOTH tracks.
 * CONTRE QUOI: Guessing cluster meaning from retail SKU or inventing 0xEDxx on BSEED dimmers.
 * TIP IA: 0xE002 = manuSpecificTuya2 (Z2M); never invert E001/E002 names.
 * TIP HUM: docs/knowledge/TUYA_E000_E001_E002.md + docs/architecture/COMM_PATHFINDING.md
 */

const CLUSTERS = Object.freeze({
  BASIC: { id: 0x0000, names: ['basic', 'genBasic'] },
  POWER_CFG: { id: 0x0001, names: ['powerConfiguration', 'genPowerCfg', 'powerCfg'] },
  DEVICE_TEMP: { id: 0x0002, names: ['deviceTemperatureConfiguration', 'genDeviceTempCfg'] },
  IDENTIFY: { id: 0x0003, names: ['identify', 'genIdentify'] },
  GROUPS: { id: 0x0004, names: ['groups', 'genGroups'] },
  SCENES: { id: 0x0005, names: ['scenes', 'genScenes'] },
  ON_OFF: { id: 0x0006, names: ['onOff', 'genOnOff'] },
  ON_OFF_CFG: { id: 0x0007, names: ['onOffSwitchConfiguration', 'genOnOffSwitchCfg'] },
  LEVEL: { id: 0x0008, names: ['levelControl', 'genLevelCtrl'] },
  TIME: { id: 0x000A, names: ['time', 'genTime'] },
  MULTISTATE_INPUT: { id: 0x0012, names: ['multistateInput', 'genMultistateInput'] },
  OTA: { id: 0x0019, names: ['ota', 'genOta'] },
  POLL_CTRL: { id: 0x0020, names: ['pollControl'] },
  DOOR_LOCK: { id: 0x0101, names: ['doorLock', 'closuresDoorLock'] },
  WINDOW_COVERING: { id: 0x0102, names: ['windowCovering', 'closuresWindowCovering'] },
  THERMOSTAT: { id: 0x0201, names: ['thermostat', 'hvacThermostat'] },
  COLOR: { id: 0x0300, names: ['colorControl', 'lightingColorCtrl'] },
  ILLUMINANCE: { id: 0x0400, names: ['illuminanceMeasurement', 'msIlluminanceMeasurement'] },
  TEMPERATURE: { id: 0x0402, names: ['temperatureMeasurement', 'msTemperatureMeasurement'] },
  HUMIDITY: { id: 0x0405, names: ['relativeHumidity', 'msRelativeHumidity'] },
  OCCUPANCY: { id: 0x0406, names: ['occupancySensing', 'msOccupancySensing'] },
  IAS_ZONE: { id: 0x0500, names: ['iasZone', 'ssIasZone'] },
  IAS_ACE: { id: 0x0501, names: ['iasAce'] },
  METERING: { id: 0x0702, names: ['seMetering', 'metering'] },
  ELECTRICAL: { id: 0x0B04, names: ['haElectricalMeasurement', 'electricalMeasurement'] },
  TOUCHLINK: { id: 0x1000, names: ['touchlink', 'lightLink'] },
  // Linptech/Moes TS0225 interview lists 0x4000 (16384) alongside 0xE002 — proprietary/OEM
  TUYA_4000: { id: 0x4000, names: ['tuya4000', 'manuSpecificTuya4000', 'linptechOem4000'] },
  TUYA_4001: { id: 0x4001, names: ['tuya4001', 'linptechPresenceTarget'] },
  TUYA_4002: { id: 0x4002, names: ['tuya4002', 'linptechPresenceConfig'] },
  TUYA_4003: { id: 0x4003, names: ['tuya4003', 'linptechPresenceDebug'] },
  // Tuya private switches (e.g. 20480 / 0x5000)
  TUYA_5000: { id: 0x5000, names: ['tuya5000', 'manuSpecificTuya5000'] },
  TUYA_8000: { id: 0x8000, names: ['tuya8000', 'manuSpecificTuya8000'] },
  TUYA_8001: { id: 0x8001, names: ['tuya8001', 'manuSpecificTuya8001'] },
  TUYA_8002: { id: 0x8002, names: ['tuya8002', 'manuSpecificTuya8002'] },
  // Moes / Zemismart dimmer & power-on behavior clusters (0xD001, 0xD010)
  TUYA_D001: { id: 0xD001, names: ['tuyaD001', 'moesDimmerScene'] },
  TUYA_D010: { id: 0xD010, names: ['tuyaD010', 'tuyaPowerOnMemory'] },
  // Tuya / OEM proprietary (compose may list numeric IDs)
  TUYA_E000: { id: 0xE000, names: ['tuyaE000', 'manuSpecificTuya4'] },
  TUYA_E001: { id: 0xE001, names: ['tuyaE001', 'tuyaPowerOnState', 'manuSpecificTuya3'] },
  // Z2M: manuSpecificTuya2 = 0xE002. Legacy Homey/Linptech also used manuSpecificTuya3 for this ID.
  TUYA_E002: { id: 0xE002, names: ['tuyaE002', 'manuSpecificTuya2', 'manuSpecificTuya3'] },
  TUYA_E004: { id: 0xE004, names: ['tuyaE004'] },
  // WHY: ZT08 / some MCU LCDs expose 0xED00 — do NOT add to BSEED dimmer compose (P2138)
  TUYA_ED00: { id: 0xED00, names: ['tuyaEd00'] },
  TUYA_EE00: { id: 0xEE00, names: ['tuyaEe00'] },
  TUYA_EF00: { id: 0xEF00, names: ['tuya', 'manuSpecificTuya', 'tuyaSpecific', 'tuyaManufacturer'] },
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
  const named = src.matchAll(/\b(genTime|genPowerCfg|genOnOff|genBasic|genLevelCtrl|iasZone|manuSpecificTuya2?|manuSpecificTuya|tuyaE002|tuyaE001|tuyaE000|time cluster|power configuration)\b/gi);
  for (const m of named) {
    let key = m[1].replace(/\s+cluster$/i, '').replace('power configuration', 'powerCfg');
    if (/manuSpecificTuya2/i.test(key)) {key = 'manuSpecificTuya2';}
    else if (/manuSpecificTuya$/i.test(key)) {key = 'manuSpecificTuya';}
    const meta = lookupCluster(key);
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

/**
 * Safely find a cluster on a Zigbee endpoint using direct lookup, numeric ID,
 * known cluster names / aliases, or case-insensitive matching.
 *
 * @param {object} endpoint - Zigbee endpoint instance
 * @param {string|number} clusterRef - Cluster ID (e.g. 6, 0xEF00, '0x0006', 'onOff', 'genOnOff')
 * @returns {object|null} Cluster instance or null
 */
function findClusterOnEndpoint(endpoint, clusterRef) {
  if (!endpoint || !endpoint.clusters || clusterRef == null) {return null;}
  const clusters = endpoint.clusters;

  // 1. Direct key match (fastest)
  if (clusters[clusterRef]) {return clusters[clusterRef];}
  const strKey = String(clusterRef);
  if (clusters[strKey]) {return clusters[strKey];}

  // 2. Normalized cluster ID and known alias names
  const normId = normalizeClusterId(clusterRef);
  if (normId != null) {
    if (clusters[normId]) {return clusters[normId];}
    if (clusters[String(normId)]) {return clusters[String(normId)];}
    const hex = `0x${normId.toString(16).padStart(4, '0')}`;
    if (clusters[hex]) {return clusters[hex];}
    const hexUpper = `0x${normId.toString(16).padStart(4, '0').toUpperCase()}`;
    if (clusters[hexUpper]) {return clusters[hexUpper];}
    const meta = BY_ID.get(normId);
    if (meta && meta.names) {
      for (const n of meta.names) {
        if (clusters[n]) {return clusters[n];}
      }
    }
  }

  // 3. Case-insensitive key match
  const lower = strKey.toLowerCase().trim();
  for (const [k, v] of Object.entries(clusters)) {
    if (k.toLowerCase().trim() === lower) {return v;}
    if (normId != null) {
      const kNorm = normalizeClusterId(k);
      if (kNorm === normId) {return v;}
    }
  }

  return null;
}

module.exports = {
  CLUSTERS,
  lookupCluster,
  normalizeClusterId,
  parseClusterMentions,
  applyReportingJitter,
  findClusterOnEndpoint,
};
