#!/usr/bin/env node
'use strict';
/**
 * P2930 — Build data/wifi/tuya-local-product-schemas.json from a local checkout of
 * make-all/tuya-local (MIT, https://github.com/make-all/tuya-local, author Jason Rumney).
 * Only facts are extracted: exact Tuya product_id -> DP id, value type and the Homey
 * capability we choose for that entity class. No YAML/text is copied. Each product keeps
 * the source config file name so every couple has a recorded source.
 * Usage: node scripts/data/build-tuya-local-schemas.js <path/to/tuya_local/devices> [commit]
 */
const fs = require('fs');
const path = require('path');
const yaml = require('js-yaml');

const SENSOR = {
  temperature: 'measure_temperature', humidity: 'measure_humidity', power: 'measure_power',
  energy: 'meter_power', voltage: 'measure_voltage', current: 'measure_current',
  carbon_dioxide: 'measure_co2', pm25: 'measure_pm25', battery: 'measure_battery',
  illuminance: 'measure_luminance', pressure: 'measure_pressure',
};
const BINARY = {
  motion: 'alarm_motion', occupancy: 'alarm_motion', presence: 'alarm_motion', door: 'alarm_contact',
  opening: 'alarm_contact', window: 'alarm_contact', moisture: 'alarm_water', smoke: 'alarm_smoke',
  carbon_monoxide: 'alarm_co', battery: 'alarm_battery', tamper: 'alarm_tamper',
};

function scaleOf(dp) {
  for (const m of dp.mapping || []) {
    if (m && m.scale && m.dps_val === undefined && !m.constraint) {return m.scale;}
  }
  return null;
}

function mapEntity(e) {
  const out = [];
  const kind = e.entity; const cls = e.class;
  for (const dp of e.dps || []) {
    if (dp.hidden || dp.optional === undefined && false) {continue;}
    let cap = null; let divisor = null;
    if (['switch', 'light', 'fan', 'climate', 'water_heater', 'vacuum', 'humidifier'].includes(kind) && dp.name === 'switch' && dp.type === 'boolean') {cap = 'onoff';}
    else if (kind === 'light' && dp.name === 'brightness' && dp.type === 'integer' && dp.range && dp.range.max) {cap = 'dim'; divisor = dp.range.max;}
    else if ((kind === 'climate' || kind === 'water_heater') && dp.name === 'temperature' && dp.type === 'integer') {cap = 'target_temperature'; divisor = scaleOf(dp);}
    else if ((kind === 'climate' || kind === 'water_heater') && dp.name === 'current_temperature' && dp.type === 'integer') {cap = 'measure_temperature'; divisor = scaleOf(dp);}
    else if (kind === 'climate' && dp.name === 'current_humidity' && dp.type === 'integer') {cap = 'measure_humidity'; divisor = scaleOf(dp);}
    else if (kind === 'cover' && dp.name === 'position' && dp.type === 'integer') {cap = 'windowcoverings_set'; divisor = (dp.range && dp.range.max) || 100;}
    else if (kind === 'sensor' && dp.name === 'sensor' && SENSOR[cls] && dp.type === 'integer') {cap = SENSOR[cls]; divisor = scaleOf(dp);}
    else if (kind === 'binary_sensor' && dp.name === 'sensor' && BINARY[cls]) {cap = BINARY[cls];}
    if (!cap) {continue;}
    const row = { c: cap, t: dp.type === 'boolean' ? 'b' : dp.type === 'integer' ? 'v' : 'e' };
    if (divisor && divisor !== 1) {row.s = divisor;}
    if (kind === 'binary_sensor' && dp.type !== 'boolean') {
      const on = (dp.mapping || []).find((m) => m && m.value === true && m.dps_val !== undefined);
      // Enum-backed binary sensors need a value table our runtime does not apply yet: skip.
      if (!on || true) {continue;}
    }
    out.push([String(dp.id), row]);
  }
  return out;
}

function build(dir, commit) {
  const products = {}; const schemas = {}; const files = fs.readdirSync(dir).filter((f) => /\.ya?ml$/.test(f)).sort();
  let cfgWithProducts = 0; const caps = new Set();
  for (const f of files) {
    let doc; try { doc = yaml.load(fs.readFileSync(path.join(dir, f), 'utf8')); } catch (_e) { continue; }
    if (!doc || !Array.isArray(doc.products)) {continue;}
    const ents = [doc.primary_entity, ...(doc.secondary_entities || []), ...(doc.entities || [])].filter(Boolean);
    const d = {};
    for (const e of ents) {for (const [id, row] of mapEntity(e)) {if (!d[id] && !Object.values(d).some((r) => r.c === row.c)) {d[id] = row; caps.add(row.c);}}}
    if (!Object.keys(d).length) {continue;}
    cfgWithProducts++;
    for (const p of doc.products) {
      const id = p && typeof p.id === 'string' ? p.id.trim() : '';
      if (!/^[A-Za-z0-9]{8,32}$/.test(id)) {continue;}
      const key = id.toLowerCase();
      if (products[key]) {continue;} // first config wins; never merge two sources
      const src = f.replace(/\.ya?ml$/, '');
      schemas[src] = d;
      products[key] = src;
    }
  }
  return { _meta: { source: 'https://github.com/make-all/tuya-local (MIT, Jason Rumney / make-all)', commit: commit || null, configs: files.length, configsMapped: cfgWithProducts, products: Object.keys(products).length, schemas: Object.keys(schemas).length, capabilities: [...caps].sort(), layout: 'products[product_id lowercase] = source config name; schemas[config] = { dp: { c: capability, t: b|v|e, s?: divisor } }' }, products, schemas };
}

if (require.main === module) {
  const out = build(process.argv[2], process.argv[3]);
  fs.writeFileSync(path.join(__dirname, '..', '..', 'data', 'wifi', 'tuya-local-product-schemas.json'), JSON.stringify(out));
  console.log(JSON.stringify(out._meta));
}
module.exports = { build, mapEntity };
