'use strict';

/**
 * WiFiDPRegistry.js (P2367)
 * Product/category → DP capability hints (tuya-local / TinyTuya / LocalTuya inspired).
 * Merges only into gaps — never overwrites explicit driver dpMappings.
 */

/** category or product_id prefix → default DP hints */
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
};

/** product_id → extra DP hints (curated from tuya-local device index) */
const PRODUCT_DP_HINTS = {
  // common WiFi plugs
  'rkczxcsd': { 18: { capability: 'measure_current', type: 'value', divisor: 1000 }, 19: { capability: 'measure_power', type: 'value', divisor: 10 }, 20: { capability: 'meter_power', type: 'value', divisor: 100 }, 22: { capability: 'measure_voltage', type: 'value', divisor: 10 } },
};

function readWiFiIdentity(device) {
  const settings = device.getSettings?.() || {};
  return {
    category: String(settings.category || settings.tuya_category || '').toLowerCase(),
    productId: String(settings.product_id || settings.product_key || '').toLowerCase(),
  };
}

/**
 * Merge DP hints into device.dpMappings for unmapped DPs only.
 * @param {object} device - TuyaLocalDevice instance
 * @returns {number} count of DPs enriched
 */
function enrichWiFiDpMappings(device) {
  if (!device || typeof device.dpMappings !== 'object') { return 0; }
  const { category, productId } = readWiFiIdentity(device);
  const hints = {
    ...(CATEGORY_DP_HINTS[category] || {}),
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

module.exports = {
  CATEGORY_DP_HINTS,
  PRODUCT_DP_HINTS,
  enrichWiFiDpMappings,
  readWiFiIdentity,
};
