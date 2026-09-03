'use strict';

/**
 * WiFiDPRegistry.js (P2367 + P2407)
 * Product/category → DP capability hints (tuya-local / TinyTuya / LocalTuya inspired).
 * Merges only into gaps — never overwrites explicit driver dpMappings.
 *
 * WHY P2407: Load compact community catalog (Buffer→JSON) from make-all/tuya-local crawl
 * so unknown WiFi products get sensible DPs without shipping the full 16k scanner dump.
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
  ywbj: { 1: { capability: 'alarm_water', type: 'boolean' } }, // water leak
  sd: { 1: { capability: 'onoff', type: 'boolean' }, 19: { capability: 'measure_power', type: 'value', divisor: 10 }, 20: { capability: 'meter_power', type: 'value', divisor: 100 } }, // energy plug
  // P2407 — extra Tuya categories (community / TinyTuya parity)
  fs: { 1: { capability: 'onoff', type: 'boolean' }, 3: { capability: 'dim', type: 'value' } }, // fan
  pc: { 1: { capability: 'onoff', type: 'boolean' }, 2: { capability: 'onoff.gang2', type: 'boolean' }, 3: { capability: 'onoff.gang3', type: 'boolean' } }, // power strip
  xfj: { 1: { capability: 'onoff', type: 'boolean' } }, // air purifier-ish
  cs: { 1: { capability: 'onoff', type: 'boolean' }, 2: { capability: 'target_humidity', type: 'value' } }, // dehumidifier
  js: { 1: { capability: 'onoff', type: 'boolean' } }, // water valve / irrigation
  kt: { 1: { capability: 'onoff', type: 'boolean' }, 2: { capability: 'target_temperature', type: 'value', divisor: 10 }, 3: { capability: 'measure_temperature', type: 'value', divisor: 10 } }, // AC
  qn: { 1: { capability: 'onoff', type: 'boolean' }, 2: { capability: 'target_temperature', type: 'value', divisor: 10 } }, // heater
};

/** Curated product_id → DP hints (always win over community when both set via merge order) */
const PRODUCT_DP_HINTS = {
  rkczxcsd: {
    18: { capability: 'measure_current', type: 'value', divisor: 1000 },
    19: { capability: 'measure_power', type: 'value', divisor: 10 },
    20: { capability: 'meter_power', type: 'value', divisor: 100 },
    22: { capability: 'measure_voltage', type: 'value', divisor: 10 },
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
