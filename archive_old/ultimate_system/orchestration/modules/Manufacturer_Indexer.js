#!/usr/bin/env node
const fs = require('fs');
const path = require('path');

const ROOT = path.resolve(__dirname, '../../..');
const DRIVERS_DIR = path.join(ROOT, 'drivers');
const STATE_DIR = path.join(ROOT, 'ultimate_system', 'orchestration', 'state');
const CATALOG = path.join(ROOT, 'catalog', 'categories.json');

function ensureDir(d) { if (!fs.existsSync(d)) fs.mkdirSync(d, { recursive: true }); }
function readJson(p) { try { return JSON.parse(fs.readFileSync(p, 'utf8')); } catch { return null; } }
function writeJson(p, obj) { ensureDir(path.dirname(p)); fs.writeFileSync(p, JSON.stringify(obj, null, 2), 'utf8'); }

function getCategoryMap() {
  const cat = readJson(CATALOG) || {};
  const map = new Map();
  Object.entries(cat).forEach(([k, arr]) => Array.isArray(arr) && arr.forEach((d) => map.set(d, k)));
  return map;
}

function indexDrivers() {
  if (!fs.existsSync(DRIVERS_DIR)) return { manufacturers:{}, productIds:{}, metrics:{drivers:0} };
  const catMap = getCategoryMap();
  const manufacturers = {};
  const productIds = {};
  let driversCount = 0;
  for (const name of fs.readdirSync(DRIVERS_DIR)) {
    const dir = path.join(DRIVERS_DIR, name);
    if (!fs.statSync(dir).isDirectory()) continue;
    const manifestPath = path.join(dir, 'driver.compose.json');
    if (!fs.existsSync(manifestPath)) continue;
    const m = readJson(manifestPath);
    if (!m || !m.zigbee) continue;
    const mlist = Array.isArray(m.zigbee.manufacturerName) ? m.zigbee.manufacturerName : (m.zigbee.manufacturerName ? [m.zigbee.manufacturerName] : []);
    const pids = Array.isArray(m.zigbee.productId) ? m.zigbee.productId : [];
    const category = catMap.get(name) || null;
    driversCount += 1;
    for (const mn of mlist) {
      const key = String(mn).trim(); if (!key) continue;
      if (!manufacturers[key]) manufacturers[key] = { productIds: new Set(), drivers: new Set(), categories: new Set() };
      pids.forEach((p) => manufacturers[key].productIds.add(String(p).trim().toUpperCase()));
      manufacturers[key].drivers.add(name);
      if (category) manufacturers[key].categories.add(category);
    }
    for (const p of pids) {
      const pid = String(p).trim().toUpperCase(); if (!pid) continue;
      if (!productIds[pid]) productIds[pid] = { manufacturers: new Set(), drivers: new Set(), categories: new Set() };
      mlist.forEach((mn) => productIds[pid].manufacturers.add(String(mn).trim()));
      productIds[pid].drivers.add(name);
      if (category) productIds[pid].categories.add(category);
    }
  }
  // serialize Sets
  const mfgSer = {}; Object.entries(manufacturers).forEach(([k,v]) => { mfgSer[k] = { productIds:[...v.productIds], drivers:[...v.drivers], categories:[...v.categories] }; });
  const pidSer = {}; Object.entries(productIds).forEach(([k,v]) => { pidSer[k] = { manufacturers:[...v.manufacturers], drivers:[...v.drivers], categories:[...v.categories] }; });
  return { manufacturers: mfgSer, productIds: pidSer, metrics: { drivers: driversCount, manufacturers: Object.keys(mfgSer).length, productIds: Object.keys(pidSer).length } };
}

function main() {
  const idx = indexDrivers();
  const outFile = path.join(STATE_DIR, 'unbranding_index.json');
  writeJson(outFile, { generatedAt: new Date().toISOString(), ...idx });
  console.log('✅ Manufacturer index written:', path.relative(ROOT, outFile));
  console.log('• Metrics:', idx.metrics);
}

if (require.main === module) main();
