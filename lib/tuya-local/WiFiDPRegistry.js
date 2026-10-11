'use strict';

/**
 * WiFiDPRegistry.js (P2367 + P2407 + P2619)
 * Product/category → DP capability hints (tuya-local / TinyTuya / LocalTuya / com.tuyalocal).
 * Merges only into gaps — never overwrites explicit driver dpMappings.
 *
 * WHY P2407: Load compact community catalog (Buffer→JSON) from make-all/tuya-local crawl
 * so unknown WiFi products get sensible DPs without shipping the full 16k scanner dump.
 * WHY P2619: UNION Homey com.tuyalocal category codes (heat pump, EV, smoke, kettle…) — append only.
 * WHY P2641: Deeper qccdz / ywbj / wnykq / weather / level hints from com.tuyalocal 1.0.23x (gaps only).
 */

const fs = require('fs');
const path = require('path');

/** category or product_id prefix → default DP hints (Tuya category codes) */
const CATEGORY_DP_HINTS = {
  cz: { 1: { capability: 'onoff', type: 'boolean' } }, // socket
  kg: { 1: { capability: 'onoff', type: 'boolean' } }, // switch
  dj: { 1: { capability: 'onoff', type: 'boolean' }, 2: { capability: 'dim', type: 'value', divisor: 10 } }, // light
  dd: { 1: { capability: 'onoff', type: 'boolean' }, 2: { capability: 'dim', type: 'value', divisor: 10 } }, // dimmer
  cl: { 1: { capability: 'onoff', type: 'boolean' }, 2: { capability: 'windowcoverings_set', type: 'value' } }, // curtain
  wk: { 1: { capability: 'onoff', type: 'boolean' }, 2: { capability: 'target_temperature', type: 'value', divisor: 10 }, 3: { capability: 'measure_temperature', type: 'value', divisor: 10 } }, // thermostat
  wsdcg: { 1: { capability: 'measure_temperature', type: 'value', divisor: 10 }, 2: { capability: 'measure_humidity', type: 'value', divisor: 10 } }, // temp/humidity
  mcs: { 1: { capability: 'alarm_contact', type: 'boolean' } }, // contact
  pir: { 1: { capability: 'alarm_motion', type: 'boolean' } }, // motion
  // ywbj → smoke (Tuya); water leak uses sj (see P2619 UNION below)
  sd: { 1: { capability: 'onoff', type: 'boolean' }, 19: { capability: 'measure_power', type: 'value', divisor: 10 }, 20: { capability: 'meter_power', type: 'value', divisor: 100 } }, // energy plug
  // P2407 — extra Tuya categories (community / TinyTuya parity)
  fs: { 1: { capability: 'onoff', type: 'boolean' }, 3: { capability: 'dim', type: 'value' } }, // fan
  pc: { 1: { capability: 'onoff', type: 'boolean' }, 2: { capability: 'onoff.gang2', type: 'boolean' }, 3: { capability: 'onoff.gang3', type: 'boolean' } }, // power strip
  xfj: { 1: { capability: 'onoff', type: 'boolean' } }, // air purifier-ish
  cs: { 1: { capability: 'onoff', type: 'boolean' }, 2: { capability: 'target_humidity', type: 'value' } }, // dehumidifier
  js: { 1: { capability: 'onoff', type: 'boolean' } }, // water valve / irrigation
  kt: { 1: { capability: 'onoff', type: 'boolean' }, 2: { capability: 'target_temperature', type: 'value', divisor: 10 }, 3: { capability: 'measure_temperature', type: 'value', divisor: 10 } }, // AC
  qn: { 1: { capability: 'onoff', type: 'boolean' }, 2: { capability: 'target_temperature', type: 'value', divisor: 10 } }, // heater
  // P2619 complementary UNION from andiwirz/com.tuyalocal categories (gaps only)
  rs: { 1: { capability: 'onoff', type: 'boolean' }, 2: { capability: 'target_temperature', type: 'value', divisor: 10 }, 3: { capability: 'measure_temperature', type: 'value', divisor: 10 } }, // heat pump / RS
  rsx: { 1: { capability: 'onoff', type: 'boolean' }, 2: { capability: 'target_temperature', type: 'value', divisor: 10 }, 3: { capability: 'measure_temperature', type: 'value', divisor: 10 } },
  bh: { 1: { capability: 'onoff', type: 'boolean' }, 2: { capability: 'target_temperature', type: 'value', divisor: 10 }, 5: { capability: 'measure_temperature', type: 'value', divisor: 10 } }, // smart kettle
  // P2641: qccdz EV — switch on DP18 (not DP1 lifetime energy); session/fault/live
  qccdz: {
    18: { capability: 'onoff', type: 'boolean' },
    1: { capability: 'meter_power', type: 'value', divisor: 100 },
    3: { capability: 'evcharger_charging_state', type: 'enum' },
    4: { capability: 'target_power', type: 'value' },
    9: { capability: 'measure_power', type: 'value', divisor: 1 },
    10: { capability: 'alarm_generic', type: 'boolean' },
    25: { capability: 'meter_power', type: 'value', divisor: 100 },
    24: { capability: 'measure_temperature', type: 'value', divisor: 1 },
    102: { capability: 'measure_power', type: 'raw' }, // phase JSON block (parse in wifi_ev_charger)
    112: { capability: 'meter_power', type: 'value', divisor: 100 }, // DeviceKwh session on some OEM
  },
  // UNION: legacy soft hints (1–4) + classic metering block 17–20 (com.tuyalocal)
  zndb: {
    1: { capability: 'measure_power', type: 'value', divisor: 10 },
    2: { capability: 'meter_power', type: 'value', divisor: 100 },
    3: { capability: 'measure_voltage', type: 'value', divisor: 10 },
    4: { capability: 'measure_current', type: 'value', divisor: 1000 },
    17: { capability: 'meter_power', type: 'value', divisor: 100 },
    18: { capability: 'measure_current', type: 'value', divisor: 1000 },
    19: { capability: 'measure_power', type: 'value', divisor: 10 },
    20: { capability: 'measure_voltage', type: 'value', divisor: 10 },
    26: { capability: 'alarm_generic', type: 'boolean' },
  },
  dlq: { 1: { capability: 'onoff', type: 'boolean' }, 2: { capability: 'measure_power', type: 'value', divisor: 10 }, 3: { capability: 'meter_power', type: 'value', divisor: 100 } }, // metering breaker
  // P2641 air quality desk monitors (hjjcy) — com.tuyalocal defaults
  hjjcy: {
    1: { capability: 'level_aqi', type: 'enum' },
    2: { capability: 'measure_temperature', type: 'value', divisor: 10 },
    3: { capability: 'measure_humidity', type: 'value', divisor: 10 },
    4: { capability: 'measure_co2', type: 'value' },
    5: { capability: 'measure_ch2o', type: 'value' },
    7: { capability: 'measure_pm25', type: 'value' },
    8: { capability: 'measure_pm1', type: 'value' },
    9: { capability: 'measure_pm10', type: 'value' },
    101: { capability: 'measure_tvoc', type: 'value' },
    102: { capability: 'measure_co', type: 'value' },
  },
  pm25: { 2: { capability: 'measure_pm25', type: 'value' }, 3: { capability: 'measure_temperature', type: 'value', divisor: 10 } },
  // IR blaster wnykq — send 201 / study 202 + optional TH
  wnykq: {
    201: { capability: 'button', type: 'string' },
    202: { capability: 'button', type: 'raw' },
    101: { capability: 'measure_temperature', type: 'value', divisor: 10 },
    102: { capability: 'measure_humidity', type: 'value', divisor: 10 },
  },
  sj: { 1: { capability: 'alarm_water', type: 'boolean' } }, // water leak
  rqbj: { 1: { capability: 'alarm_smoke', type: 'boolean' } }, // gas / smoke family
  // Smoke ywbj — com.tuyalocal: DP1 smoke, DP2 ppm, DP14/15 battery
  ywbj: {
    1: { capability: 'alarm_smoke', type: 'boolean' },
    2: { capability: 'measure_smoke', type: 'value' },
    14: { capability: 'alarm_battery', type: 'enum' },
    15: { capability: 'measure_battery', type: 'value' },
  },
  spsbj: { 1: { capability: 'alarm_motion', type: 'boolean' }, 9: { capability: 'measure_distance', type: 'value' }, 104: { capability: 'measure_luminance', type: 'value' } },
  wxkg: { 1: { capability: 'onoff', type: 'boolean' }, 2: { capability: 'onoff.gang2', type: 'boolean' }, 3: { capability: 'onoff.gang3', type: 'boolean' }, 4: { capability: 'onoff.gang4', type: 'boolean' } }, // wall switch
  ckmkzq: { 1: { capability: 'garagedoor_closed', type: 'boolean' } }, // garage
  clkg: { 1: { capability: 'windowcoverings_set', type: 'value' }, 2: { capability: 'windowcoverings_state', type: 'enum' } }, // curtain motor
  // Weather / ultrasonic level (com.tuyalocal) — category codes vary; soft hints
  qxj: {
    101: { capability: 'measure_temperature', type: 'value', divisor: 10 },
    102: { capability: 'measure_humidity', type: 'value', divisor: 10 },
    103: { capability: 'measure_temperature.outdoor', type: 'value', divisor: 10 },
    104: { capability: 'measure_humidity.outdoor', type: 'value', divisor: 10 },
  },
  cjsq: {
    1: { capability: 'liquid_state', type: 'enum' },
    2: { capability: 'measure_distance', type: 'value', divisor: 1000 },
    22: { capability: 'liquid_level', type: 'value' },
  },
};

/** Curated product_id → DP hints (always win over community when both set via merge order) */
const PRODUCT_DP_HINTS = {
  rkczxcsd: {
    18: { capability: 'measure_current', type: 'value', divisor: 1000 },
    19: { capability: 'measure_power', type: 'value', divisor: 10 },
    20: { capability: 'meter_power', type: 'value', divisor: 100 },
    22: { capability: 'measure_voltage', type: 'value', divisor: 10 },
  },
  // P2621 — EV charger community products (UNION, gaps only at runtime)
  '32a7kwevcharger': {
    18: { capability: 'onoff', type: 'boolean' },
    9: { capability: 'measure_power', type: 'value', divisor: 1 },
  },
  evcharger11kw: {
    18: { capability: 'onoff', type: 'boolean' },
    9: { capability: 'measure_power', type: 'value', divisor: 1 },
  },
  evcharger40a: {
    18: { capability: 'onoff', type: 'boolean' },
    114: { capability: 'onoff', type: 'boolean' },
  },
  wallbox11kw: {
    27: { capability: 'onoff', type: 'boolean' },
    18: { capability: 'onoff', type: 'boolean' },
  },
  gdportablecharger: {
    155: { capability: 'onoff', type: 'boolean' },
    18: { capability: 'onoff', type: 'boolean' },
  },
};

let _communityProducts = null;
let _communityLoadAttempted = false;

function loadCommunityProducts() {
  if (_communityLoadAttempted) return _communityProducts || {};
  _communityLoadAttempted = true;
  try {
    if (typeof global.gc === 'function') {
      try { global.gc(); } catch (_e) { /* ignore */ }
    }
    const fp = path.join(__dirname, '..', '..', 'data', 'wifi', 'community-dp-hints.json');
    const buf = fs.readFileSync(fp); // Buffer → JSON.parse (heap-safe)
    const catalog = JSON.parse(buf);
    _communityProducts = catalog.products && typeof catalog.products === 'object' ? catalog.products : {};
    if (typeof global.gc === 'function') {
      try { global.gc(); } catch (_e2) { /* ignore */ }
    }
  } catch (_err) {
    _communityProducts = {};
  }
  return _communityProducts;
}

function normalizeProductKey(raw) {
  return String(raw || '')
    .trim()
    .toLowerCase()
    .replace(/[^a-z0-9_-]+/g, '');
}

function readWiFiIdentity(device) {
  const settings = device.getSettings?.() || {};
  return {
    category: String(settings.category || settings.tuya_category || '').toLowerCase(),
    productId: normalizeProductKey(settings.product_id || settings.product_key || settings.model || ''),
  };
}

/**
 * Merge DP hints into device.dpMappings for unmapped DPs only.
 * Order: category → community product → curated product (last wins for gaps only).
 * @param {object} device - TuyaLocalDevice instance
 * @returns {number} count of DPs enriched
 */
function enrichWiFiDpMappings(device) {
  if (!device || typeof device.dpMappings !== 'object') { return 0; }
  const { category, productId } = readWiFiIdentity(device);
  const community = loadCommunityProducts();
  const hints = {
    ...(CATEGORY_DP_HINTS[category] || {}),
    ...(community[productId] || {}),
    ...(PRODUCT_DP_HINTS[productId] || {}),
  };
  let added = 0;
  for (const [dp, cfg] of Object.entries(hints)) {
    const existing = device.dpMappings[dp];
    if (!existing) {
      device.dpMappings[dp] = { ...cfg };
      added++;
      continue;
    }
    if (existing.capability === 'unknown' && cfg.capability) {
      device.dpMappings[dp] = { ...existing, ...cfg };
      added++;
    }
  }
  if (added > 0 && device.log) {
    device.log(`[WiFiDP] Enriched ${added} DP(s) from registry (category=${category || '—'} product=${productId || '—'})`);
  }
  return added;
}

/** Test helper — reset community cache */
function _resetCommunityCacheForTests() {
  _communityProducts = null;
  _communityLoadAttempted = false;
}

module.exports = {
  CATEGORY_DP_HINTS,
  PRODUCT_DP_HINTS,
  enrichWiFiDpMappings,
  readWiFiIdentity,
  loadCommunityProducts,
  _resetCommunityCacheForTests,
};
