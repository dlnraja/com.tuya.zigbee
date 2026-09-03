'use strict';

/**
 * P2407 — Build compact WiFi DP hints from community crawls
 * (make-all/tuya-local + tinytuya scanners → Homey runtime catalog).
 *
 * WHY: Scanner JSON (~16k DPs) must not load raw on Homey (64MB). Compact
 * product/model hints merge into WiFiDPRegistry gaps only (local-first).
 *
 * Usage:
 *   node tools/ci/build-wifi-community-dp-hints.js
 *   node tools/ci/build-wifi-community-dp-hints.js --check
 */

const fs = require('fs');
const path = require('path');

const ROOT = path.join(__dirname, '..', '..');
const OUT = path.join(ROOT, 'data', 'wifi', 'community-dp-hints.json');
const TUYA_LOCAL = path.join(ROOT, 'data', 'scanners', 'tuya-local-results.json');
const TINYTUYA = path.join(ROOT, 'data', 'scanners', 'tinytuya-results.json');

/** HA / tuya-local entity names → Homey capability hints (LocalTuya / TinyTuya inspired) */
const NAME_MAP = [
  { re: /^(switch|switch_1|switch_2|relay)$/i, capability: 'onoff', type: 'boolean' },
  { re: /^brightness$/i, capability: 'dim', type: 'value', divisor: 10 },
  { re: /^(color_temp|colourtemp|colortemp)$/i, capability: 'light_temperature', type: 'value', divisor: 10 },
  { re: /^(current_temperature)$/i, capability: 'measure_temperature', type: 'value', divisor: 10 },
  { re: /^(target_temperature|temp_set|temperature_set)$/i, capability: 'target_temperature', type: 'value', divisor: 10 },
  // bare "temperature" often = setpoint on climate YAML — prefer measure when name is current_*
  { re: /^temperature$/i, capability: 'measure_temperature', type: 'value', divisor: 10 },
  { re: /^(current_humidity|humidity)$/i, capability: 'measure_humidity', type: 'value', divisor: 10 },
  { re: /^power$/i, capability: 'measure_power', type: 'value', divisor: 10 },
  { re: /^(current|current_a)$/i, capability: 'measure_current', type: 'value', divisor: 1000 },
  { re: /^(voltage|voltage_v)$/i, capability: 'measure_voltage', type: 'value', divisor: 10 },
  { re: /^(energy|add_ele|electricity)$/i, capability: 'meter_power', type: 'value', divisor: 100 },
  { re: /^(position|cover_position|curtain_position|percent_control)$/i, capability: 'windowcoverings_set', type: 'value' },
  { re: /^(lock|child_lock)$/i, capability: 'locked', type: 'boolean' },
  { re: /^(motion|pir|occupancy)$/i, capability: 'alarm_motion', type: 'boolean' },
  { re: /^(door|contact|window)$/i, capability: 'alarm_contact', type: 'boolean' },
  { re: /^(water|leak|water_leak)$/i, capability: 'alarm_water', type: 'boolean' },
  { re: /^(battery|battery_percentage)$/i, capability: 'measure_battery', type: 'value' },
  { re: /^(hcho|formaldehyde)$/i, capability: 'measure_formaldehyde', type: 'value', divisor: 100 },
  { re: /^(co2|carbon_dioxide)$/i, capability: 'measure_co2', type: 'value' },
  { re: /^(pm25|pm2_5)$/i, capability: 'measure_pm25', type: 'value' },
  { re: /^(illuminance|lux|brightness_value)$/i, capability: 'measure_luminance', type: 'value' },
  { re: /^speed$/i, capability: 'dim', type: 'value' },
];

const SKIP_NAMES = new Set(['sensor', 'value', 'option', 'available', 'event', 'description', 'unit', 'schedule', 'second', 'minute', 'fault_code', '']);

function mapDpName(name, type) {
  const n = String(name || '').trim();
  if (!n || SKIP_NAMES.has(n.toLowerCase())) return null;
  for (const rule of NAME_MAP) {
    if (rule.re.test(n)) {
      const out = { capability: rule.capability, type: rule.type || (type === 'boolean' ? 'boolean' : 'value') };
      if (rule.divisor) out.divisor = rule.divisor;
      return out;
    }
  }
  return null;
}

function normalizeProductKey(model) {
  return String(model || '')
    .trim()
    .toLowerCase()
    .replace(/[^a-z0-9_-]+/g, '')
    .slice(0, 48);
}

function loadJson(fp) {
  if (!fs.existsSync(fp)) return null;
  return JSON.parse(fs.readFileSync(fp)); // Buffer-safe parse
}

function buildFromTuyaLocal(devices, products, stats) {
  for (const d of devices || []) {
    const key = normalizeProductKey(d.model);
    if (!key || key.length < 3) {
      stats.skippedNoModel++;
      continue;
    }
    const hints = {};
    for (const m of d.dpMappings || []) {
      const mapped = mapDpName(m.name, m.type);
      if (!mapped || m.dpId == null) continue;
      hints[String(m.dpId)] = mapped;
      stats.mappedDps++;
    }
    if (!Object.keys(hints).length) {
      stats.skippedNoHints++;
      continue;
    }
    // Prefer denser maps; merge non-destructive
    if (!products[key] || Object.keys(hints).length >= Object.keys(products[key]).length) {
      products[key] = hints;
      stats.products++;
    }
  }
}

function buildFromTinyTuya(data, products, stats) {
  const devices = data?.devices || data?.results || [];
  for (const d of devices) {
    const key = normalizeProductKey(d.productId || d.product_id || d.model || d.id);
    if (!key || key.length < 3) continue;
    const hints = {};
    const maps = d.dpMappings || d.dps || [];
    if (Array.isArray(maps)) {
      for (const m of maps) {
        const mapped = mapDpName(m.name || m.code || m.id, m.type);
        const dpId = m.dpId ?? m.dp ?? m.id;
        if (!mapped || dpId == null || Number.isNaN(Number(dpId))) continue;
        hints[String(dpId)] = mapped;
        stats.mappedDps++;
      }
    } else if (maps && typeof maps === 'object') {
      for (const [dpId, cfg] of Object.entries(maps)) {
        const mapped = mapDpName(cfg?.name || cfg?.code || cfg?.capability, cfg?.type);
        if (!mapped) continue;
        hints[String(dpId)] = mapped;
        stats.mappedDps++;
      }
    }
    if (!Object.keys(hints).length) continue;
    if (!products[key]) {
      products[key] = hints;
      stats.productsFromTiny++;
    }
  }
}

function main() {
  const checkOnly = process.argv.includes('--check');
  const products = {};
  const stats = {
    mappedDps: 0,
    products: 0,
    productsFromTiny: 0,
    skippedNoModel: 0,
    skippedNoHints: 0,
  };

  const tl = loadJson(TUYA_LOCAL);
  if (tl?.devices) buildFromTuyaLocal(tl.devices, products, stats);

  const tiny = loadJson(TINYTUYA);
  if (tiny) buildFromTinyTuya(tiny, products, stats);

  // Cap size: keep densest products only if huge
  let keys = Object.keys(products);
  if (keys.length > 800) {
    keys = keys
      .map((k) => ({ k, n: Object.keys(products[k]).length }))
      .sort((a, b) => b.n - a.n)
      .slice(0, 800)
      .map((x) => x.k);
    const trimmed = {};
    for (const k of keys) trimmed[k] = products[k];
    Object.keys(products).forEach((k) => delete products[k]);
    Object.assign(products, trimmed);
  }

  const catalog = {
    _meta: {
      version: '1.0.0',
      patch: 'P2407',
      builtAt: new Date().toISOString(),
      sources: ['tuya-local', 'tinytuya'],
      productCount: Object.keys(products).length,
      why: 'Compact community DP hints for WiFiDPRegistry — local-first Homey runtime',
    },
    products,
  };

  const json = `${JSON.stringify(catalog)}\n`;
  const bytes = Buffer.byteLength(json);

  if (checkOnly) {
    if (!fs.existsSync(OUT)) {
      console.error('CHECK FAIL: missing', OUT);
      process.exit(1);
    }
    const existing = JSON.parse(fs.readFileSync(OUT));
    const n = Object.keys(existing.products || {}).length;
    if (n < 50) {
      console.error('CHECK FAIL: catalog too thin', n);
      process.exit(1);
    }
    console.log('CHECK OK: community-dp-hints products=', n, 'bytes=', fs.statSync(OUT).size);
    return;
  }

  fs.mkdirSync(path.dirname(OUT), { recursive: true });
  fs.writeFileSync(OUT, json);
  console.log('Wrote', OUT);
  console.log(JSON.stringify({ ...stats, productCount: catalog._meta.productCount, bytes }, null, 2));
}

main();
