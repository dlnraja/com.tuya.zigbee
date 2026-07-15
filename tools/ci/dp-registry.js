#!/usr/bin/env node
'use strict';

/**
 * tools/ci/dp-registry.js  v1.0.0
 *
 * P64.11 — Smart DP inference registry.
 *
 * The same Tuya DP number can mean different things in different device
 * families (e.g. DP 105 = soil moisture on some, humidity_calibration
 * on ZG-303Z). This tool maintains a registry of DP → capability
 * mappings cross-referenced across:
 *   - Z2M herdsman-converters (data/z2m_herdsman_cache.json)
 *   - Our driver.js (analyzed for dpMap/dpMapping)
 *   - Manual entries (data/dp_registry_manual.json)
 *
 * Usage:
 *   node tools/ci/dp-registry.js build              # build from sources
 *   node tools/ci/dp-registry.js lookup <dpId>     # show all known usages
 *   node tools/ci/dp-registry.js gap <mfr>         # show unknown DPs for MFR
 *   node tools/ci/dp-registry.js record <dpId> <name> <mfr> <model>  # log new
 *   node tools/ci/dp-registry.js stats             # show registry stats
 *
 * Output:
 *   data/dp_registry.json — { _meta, byMfr: { mfr: [dp] },
 *                             byDp: { dpId: [{mfr, name, source}] } }
 */

const fs = require('fs');
const path = require('path');

const ROOT = path.resolve(__dirname, '..', '..');
const REGISTRY = path.join(ROOT, 'data', 'dp_registry.json');
const MANUAL = path.join(ROOT, 'data', 'dp_registry_manual.json');
const Z2M_CACHE = path.join(ROOT, 'data', 'z2m_herdsman_cache.json');
const MFS_DB = path.join(ROOT, 'data', 'mfs_db.json');
const DRIVERS = path.join(ROOT, 'drivers');

function loadJson(p) {
  try { return JSON.parse(fs.readFileSync(p, 'utf8')); } catch { return null; }
}
function saveJson(p, obj) {
  fs.writeFileSync(p, JSON.stringify(obj, null, 2));
}

function buildFromZ2M(cache) {
  const out = { byMfr: {}, byDp: {} };
  if (!cache?.devices) return out;
  for (const dev of cache.devices) {
    const dps = dev.dps || [];
    if (dps.length === 0) continue;
    for (const dp of dps) {
      const entry = {
        mfr: (dev.mfrs || [])[0] || null,
        model: dev.model,
        vendor: dev.vendor,
        dpId: dp.id,
        name: dp.name,
        source: 'z2m_herdsman',
        zigbeeModels: dev.zigbeeModels || [],
      };
      // byMfr index
      for (const m of (dev.mfrs || [])) {
        if (!out.byMfr[m]) out.byMfr[m] = [];
        out.byMfr[m].push({ dpId: dp.id, name: dp.name, model: dev.model, vendor: dev.vendor });
      }
      // byDp index
      const key = String(dp.id);
      if (!out.byDp[key]) out.byDp[key] = [];
      out.byDp[key].push(entry);
    }
  }
  return out;
}

function buildFromDrivers() {
  // Walk every driver.js + device.js, extract DP references + their cap mapping
  const out = { byMfr: {}, byDp: {} };
  if (!fs.existsSync(DRIVERS)) return out;
  function addDp(driver, dpId, action) {
    const key = String(dpId);
    if (!out.byDp[key]) out.byDp[key] = [];
    out.byDp[key].push({ driver, dpId, action, source: 'driver' });
  }
  for (const e of fs.readdirSync(DRIVERS, { withFileTypes: true })) {
    if (!e.isDirectory()) continue;
    const dir = path.join(DRIVERS, e.name);
    const files = ['device.js', 'driver.js', 'configs.js'];
    for (const f of files) {
      const fp = path.join(dir, f);
      if (!fs.existsSync(fp)) continue;
      const txt = fs.readFileSync(fp, 'utf8');
      // Pattern 1: dpMap: { 1: { cap: 'foo' }, 12: { cap: 'bar' } }
      const re1 = /(\d{1,3})\s*:\s*\{\s*cap\s*:\s*['"`]([^'"`]+)['"`]/g;
      let m;
      while ((m = re1.exec(txt)) !== null) {
        addDp(e.name, +m[1], `cap=${m[2]}`);
      }
      // Pattern 2: if (dp === 2 || dp === 3 || dp === 107) { ... } — capture
      // the capability name that's set in the block (safeSetCapabilityValue('foo', ...))
      const re2 = /if\s*\(\s*dp\s*===\s*(\d{1,3})\b[\s\S]{0,2000}?safeSetCapabilityValue\(\s*['"`]([a-zA-Z0-9_.]+)['"`]/g;
      while ((m = re2.exec(txt)) !== null) {
        addDp(e.name, +m[1], `set=${m[2]}`);
      }
      // Pattern 3: if (dp === N) { ... setSettings({...}) } — record as setting
      const re3 = /if\s*\(\s*dp\s*===\s*(\d{1,3})\b[\s\S]{0,1500}?setSettings\(\s*\{[^}]*?(\w+)\s*:/g;
      while ((m = re3.exec(txt)) !== null) {
        addDp(e.name, +m[1], `setting=${m[2]}`);
      }
    }
  }
  return out;
}

function merge(a, b) {
  const out = { byMfr: { ...a.byMfr }, byDp: { ...a.byDp } };
  for (const [k, v] of Object.entries(b.byMfr)) {
    out.byMfr[k] = (out.byMfr[k] || []).concat(v);
  }
  for (const [k, v] of Object.entries(b.byDp)) {
    out.byDp[k] = (out.byDp[k] || []).concat(v);
  }
  return out;
}

function build() {
  console.log('Building DP registry from multiple sources...');
  const z2m = buildFromZ2M(loadJson(Z2M_CACHE));
  console.log(`  Z2M herdsman: ${Object.keys(z2m.byDp).length} unique DPs, ${Object.keys(z2m.byMfr).length} MFRs`);
  const drv = buildFromDrivers();
  console.log(`  Drivers: ${Object.keys(drv.byDp).length} unique DPs`);
  const manual = loadJson(MANUAL) || { byMfr: {}, byDp: {} };
  let merged = merge(z2m, drv);
  merged = merge(merged, manual);
  const registry = {
    _meta: {
      version: '1.0.0',
      built: new Date().toISOString(),
      sourceCounts: {
        z2m_herdsman: Object.keys(z2m.byDp).length,
        drivers: Object.keys(drv.byDp).length,
        manual: Object.keys(manual.byDp).length,
      },
      totalUniqueDps: Object.keys(merged.byDp).length,
      totalMfrs: Object.keys(merged.byMfr).length,
    },
    byMfr: merged.byMfr,
    byDp: merged.byDp,
  };
  saveJson(REGISTRY, registry);
  console.log(`✓ saved ${Object.keys(merged.byDp).length} unique DPs × ${Object.keys(merged.byMfr).length} MFRs to ${REGISTRY}`);
  return registry;
}

function lookup(dpId) {
  const reg = loadJson(REGISTRY);
  if (!reg) { console.log('run build first'); return; }
  const entries = reg.byDp[String(dpId)] || [];
  if (entries.length === 0) {
    console.log(`DP ${dpId}: not found in any source`);
    return;
  }
  console.log(`\nDP ${dpId}: ${entries.length} usages\n`);
  // Group by name
  const byName = {};
  for (const e of entries) {
    const key = `${e.name || e.cap}`;
    if (!byName[key]) byName[key] = [];
    byName[key].push(e);
  }
  for (const [name, list] of Object.entries(byName)) {
    console.log(`  ${name}: ${list.length} usages`);
    const samples = list.slice(0, 5);
    for (const e of samples) {
      const where = e.vendor ? `${e.vendor}/${e.model || e.zigbeeModels?.join(',') || '?'}` : e.driver || '?';
      console.log(`    ${where} (${e.source})`);
    }
    if (list.length > 5) console.log(`    ... +${list.length - 5} more`);
  }
}

function stats() {
  const reg = loadJson(REGISTRY);
  if (!reg) { console.log('run build first'); return; }
  console.log('DP registry stats:');
  console.log(`  Built: ${reg._meta.built}`);
  console.log(`  Unique DPs: ${reg._meta.totalUniqueDps}`);
  console.log(`  MFRs: ${reg._meta.totalMfrs}`);
  console.log(`  Sources:`, reg._meta.sourceCounts);
  // Top 10 most-used DPs
  const dpCounts = Object.entries(reg.byDp).map(([k, v]) => [k, v.length]).sort((a, b) => b[1] - a[1]).slice(0, 10);
  console.log('\nTop 10 most-used DPs:');
  for (const [dpId, count] of dpCounts) {
    const names = [...new Set(reg.byDp[dpId].map(e => e.name || e.cap))].slice(0, 3).join(', ');
    console.log(`  DP ${dpId}: ${count} usages (${names})`);
  }
}

function record(dpId, name, mfr, model) {
  const reg = loadJson(REGISTRY) || { _meta: { version: '1.0.0' }, byMfr: {}, byDp: {} };
  const key = String(dpId);
  if (!reg.byDp[key]) reg.byDp[key] = [];
  reg.byDp[key].push({ mfr, name, model, source: 'manual' });
  if (!reg.byMfr[mfr]) reg.byMfr[mfr] = [];
  reg.byMfr[mfr].push({ dpId: +dpId, name, model });
  saveJson(REGISTRY, reg);
  // Also save to manual file for persistence
  const manual = loadJson(MANUAL) || { byMfr: {}, byDp: {} };
  if (!manual.byDp[key]) manual.byDp[key] = [];
  manual.byDp[key].push({ mfr, name, model, source: 'manual', date: new Date().toISOString() });
  saveJson(MANUAL, manual);
  console.log(`✓ recorded DP ${dpId} = ${name} for ${mfr} / ${model}`);
}

function gap(mfr) {
  const reg = loadJson(REGISTRY);
  if (!reg) { console.log('run build first'); return; }
  // Find the MFR in Z2M cache, get its DPs, then check if our driver has a handler
  const z2m = loadJson(Z2M_CACHE);
  const idxs = z2m?.byMfr?.[mfr] || [];
  if (idxs.length === 0) {
    console.log(`MFR ${mfr} not in Z2M`);
    return;
  }
  const dev = z2m.devices[idxs[0]];
  const knownInZ2M = new Set((dev.dps || []).map(d => d.id));
  const knownInDrivers = new Set();
  for (const e of Object.values(reg.byDp)) {
    for (const entry of e) {
      if (entry.driver) knownInDrivers.add(entry.dpId);
    }
  }
  const gaps = [...knownInZ2M].filter(d => !knownInDrivers.has(d));
  console.log(`\n${mfr} / ${dev.model}: ${knownInZ2M.size} DPs in Z2M, ${gaps.length} unhandled by us\n`);
  for (const dpId of gaps) {
    const e = reg.byDp[String(dpId)]?.[0];
    console.log(`  DP ${dpId}: ${e?.name || '?'} (z2m: ${dev.dps.find(d => d.id === dpId)?.name || '?'})`);
  }
}

// ─── main ──────────────────────────────────────────────────────────────────
const args = process.argv.slice(2);
const cmd = args[0];

if (cmd === 'build') build();
else if (cmd === 'lookup') lookup(args[1]);
else if (cmd === 'stats') stats();
else if (cmd === 'record') record(args[1], args[2], args[3], args[4]);
else if (cmd === 'gap') gap(args[1]);
else {
  console.log('Usage:');
  console.log('  node tools/ci/dp-registry.js build              # build registry from sources');
  console.log('  node tools/ci/dp-registry.js lookup <dpId>     # show all known usages of DP');
  console.log('  node tools/ci/dp-registry.js stats             # show registry stats');
  console.log('  node tools/ci/dp-registry.js record <dp> <name> <mfr> <model>  # log new mapping');
  console.log('  node tools/ci/dp-registry.js gap <mfr>         # show unhandled DPs for MFR');
}
