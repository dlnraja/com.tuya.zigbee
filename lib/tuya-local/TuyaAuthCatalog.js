'use strict';

/**
 * TuyaAuthCatalog.js (P2409)
 * SSOT for Tuya / SmartLife cloud auth regions, app schemas, and device-list APIs.
 *
 * Research: TinyTuya Cloud, make-all/tuya-local (tuya_sharing), tuyapi, Tuya OpenAPI docs.
 * Homey uses this for pairing only — runtime control stays LAN (local-first).
 */

/** OpenAPI data centers (aliases included for UI / TinyTuya naming) */
const REGIONS = Object.freeze({
  eu: { endpoint: 'https://openapi.tuyaeu.com', name: 'Europe (Central)', aliases: ['eu', 'EU'] },
  we: { endpoint: 'https://openapi-weaz.tuyaeu.com', name: 'Europe (West)', aliases: ['we', 'eu-w', 'euw', 'WE'] },
  us: { endpoint: 'https://openapi.tuyaus.com', name: 'Americas (West)', aliases: ['us', 'US', 'na'] },
  ue: { endpoint: 'https://openapi-ueaz.tuyaus.com', name: 'Americas (East)', aliases: ['ue', 'us-e', 'use', 'UE', 'az'] },
  cn: { endpoint: 'https://openapi.tuyacn.com', name: 'China', aliases: ['cn', 'CN', 'china'] },
  in: { endpoint: 'https://openapi.tuyain.com', name: 'India', aliases: ['in', 'IN', 'india'] },
  sg: { endpoint: 'https://openapi-sg.iotbing.com', name: 'Southeast Asia / SG', aliases: ['sg', 'SG', 'sea', 'ay'] },
});

/** Order for auto-region / failover (Europe-first for Homey EU users) */
const REGION_FALLBACK_ORDER = Object.freeze(['eu', 'we', 'us', 'ue', 'in', 'sg', 'cn']);

/**
 * SmartLife / Tuya Smart / OEM app schemas for QR sharing login.
 * HA tuya-local uses `tuyaSmart` or `smartlife`; TinyTuya/community also try variants.
 */
const APP_SCHEMAS = Object.freeze([
  { id: 'smartlife', label: 'Smart Life', package: 'com.tuya.smartlife' },
  { id: 'tuyaSmart', label: 'Tuya Smart', package: 'com.tuya.smart' },
  { id: 'smart_life', label: 'Smart Life (alt)', package: 'com.tuya.smartlife' },
  { id: 'TuyaSmart', label: 'Tuya Smart (alt)', package: 'com.tuya.smart' },
]);

/** Public HA / tuya-local client id for QR sharing (not a secret) */
const TUYA_SHARING_CLIENT_ID = 'HA_3y9q4ak7g4ephrvfoju';

/**
 * Device-list API cascade after auth (try until non-empty with local_key).
 * Paths relative to region endpoint.
 */
const DEVICE_LIST_APIS = Object.freeze([
  { id: 'sharing_ha', method: 'GET', path: '/v1.0/m/life/ha/devices', kind: 'sharing' },
  { id: 'sharing_home', method: 'GET', path: '/v1.0/m/life/ha/home/devices', kind: 'sharing' },
  { id: 'iot03_v13', method: 'GET', path: '/v1.3/iot-03/devices', kind: 'iot_uid', paginate: true },
  { id: 'iot03_v10', method: 'GET', path: '/v1.0/iot-03/devices', kind: 'iot_uid', paginate: true },
  { id: 'associated', method: 'GET', path: '/v1.0/iot-01/associated-users/devices', kind: 'associated', paginate: true },
  { id: 'users_devices', method: 'GET', path: '/v1.0/users/{uid}/devices', kind: 'users', paginate: false },
]);

function normalizeRegion(raw) {
  const s = String(raw || 'eu').trim();
  if (REGIONS[s]) return s;
  const lower = s.toLowerCase();
  for (const [id, meta] of Object.entries(REGIONS)) {
    if ((meta.aliases || []).some((a) => String(a).toLowerCase() === lower)) return id;
  }
  return 'eu';
}

function getRegionEndpoint(region) {
  const id = normalizeRegion(region);
  return REGIONS[id].endpoint;
}

function listRegionsForUi() {
  return Object.entries(REGIONS).map(([id, meta]) => ({ id, name: meta.name }));
}

function normalizeAppSchema(raw) {
  const s = String(raw || 'smartlife').trim();
  const exact = APP_SCHEMAS.find((x) => x.id === s);
  if (exact) return exact.id;
  const ci = APP_SCHEMAS.find((x) => x.id.toLowerCase() === s.toLowerCase());
  return ci ? ci.id : 'smartlife';
}

/** Schemas to try on QR failure (primary first) */
function buildSchemaFallbackChain(preferred) {
  const pref = normalizeAppSchema(preferred);
  const rest = APP_SCHEMAS.map((x) => x.id).filter((id) => id !== pref);
  return [pref, ...rest];
}

module.exports = {
  REGIONS,
  REGION_FALLBACK_ORDER,
  APP_SCHEMAS,
  TUYA_SHARING_CLIENT_ID,
  DEVICE_LIST_APIS,
  normalizeRegion,
  getRegionEndpoint,
  listRegionsForUi,
  normalizeAppSchema,
  buildSchemaFallbackChain,
};
