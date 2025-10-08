#!/usr/bin/env node
/*
 * tag_virtual_drivers.js
 * --------------------------------------------------------------
 * Detect and tag virtual/fictive/bridge drivers (HA/Z2M-like) using
 * simple heuristics. Adds non-functional metadata under `community`:
 *   - community.virtual: true
 *   - community.virtualType: 'bridge' | 'virtual' | 'gateway' | 'generic'
 *   - community.originHints: ['ha','z2m','generic'] (best-effort)
 * Writes an inventory report in references/virtual_drivers_inventory.json
 * and the active heuristics in references/virtual_drivers_rules.json.
 */
const fs = require('fs');
const path = require('path');

const ROOT = process.cwd();
const DRIVERS_DIR = path.join(ROOT, 'drivers');
const REF_DIR = path.join(ROOT, 'references');
const INVENTORY_FILE = path.join(REF_DIR, 'virtual_drivers_inventory.json');
const RULES_FILE = path.join(REF_DIR, 'virtual_drivers_rules.json');

function readJson(p){ try { return JSON.parse(fs.readFileSync(p,'utf8')); } catch { return null; } }
function writeJson(p,d){ fs.writeFileSync(p, JSON.stringify(d, null, 2), 'utf8'); }
function ensureDir(d){ if(!fs.existsSync(d)) fs.mkdirSync(d, { recursive: true }); }

const NAME_HINTS = [
  { key: 'bridge', types: ['bridge'], origins: ['generic'] },
  { key: 'gateway', types: ['gateway'], origins: ['generic'] },
  { key: 'zbbridge', types: ['bridge'], origins: ['generic','z2m'] },
  { key: 'zigbee_gateway', types: ['gateway'], origins: ['generic'] },
  { key: 'zigbee_gateway_hub', types: ['gateway'], origins: ['generic'] },
  { key: 'virtual', types: ['virtual'], origins: ['generic'] },
  { key: 'dummy', types: ['virtual'], origins: ['generic'] },
  { key: 'simulator', types: ['virtual'], origins: ['generic'] },
  { key: 'test_', types: ['virtual'], origins: ['generic'] },
  { key: 'ha_', types: ['virtual'], origins: ['ha'] },
  { key: 'z2m_', types: ['virtual'], origins: ['z2m'] }
];

function isSparse(man){
  const z = man.zigbee || {};
  const pids = Array.isArray(z.productId) ? z.productId : (z.productId ? [z.productId] : []);
  const eps = z.endpoints && typeof z.endpoints === 'object' ? Object.keys(z.endpoints).length : 0;
  const hasClusters = eps>0 && Object.values(z.endpoints).some((e)=>Array.isArray(e.clusters)&&e.clusters.length>0);
  // Sparse if no productIds and no clusters
  return pids.length === 0 && !hasClusters;
}

function detectVirtual(id, man){
  const name = id.toLowerCase();
  const reasons = [];
  let types = new Set();
  let origins = new Set();

  // Name-based hints
  for (const h of NAME_HINTS) {
    if (name.includes(h.key)) { h.types.forEach(t=>types.add(t)); h.origins.forEach(o=>origins.add(o)); reasons.push(`name:${h.key}`); }
  }

  // Class + capability patterns for bridges/gateways
  const cls = man.class;
  const caps = new Set(Array.isArray(man.capabilities)?man.capabilities:[]);
  if (cls === 'other' && (name.includes('bridge') || name.includes('gateway'))) {
    types.add(name.includes('bridge') ? 'bridge' : 'gateway');
    reasons.push('class:other+name:bridge/gateway');
  }

  // Sparse manifests (no productIds and no clusters)
  if (isSparse(man)) { types.add('virtual'); reasons.push('sparse_manifest'); }

  // Origin hints from community brand/aliases if present
  const comm = man.community || {};
  const aliases = Array.isArray(comm.aliases) ? comm.aliases.join(' ').toLowerCase() : '';
  if (aliases.includes('home assistant')) origins.add('ha');
  if (aliases.includes('zigbee2mqtt') || aliases.includes('z2m')) origins.add('z2m');

  return { isVirtual: types.size>0, types: Array.from(types), origins: Array.from(origins), reasons };
}

function main(){
  ensureDir(REF_DIR);
  const ids = fs.readdirSync(DRIVERS_DIR,{withFileTypes:true}).filter(e=>e.isDirectory()).map(e=>e.name);
  const inventory = [];
  let tagged = 0;

  for (const id of ids) {
    const p = path.join(DRIVERS_DIR, id, 'driver.compose.json');
    if (!fs.existsSync(p)) continue;
    const man = readJson(p);
    if (!man) continue;

    const det = detectVirtual(id, man);
    if (det.isVirtual) {
      man.community = man.community || {};
      man.community.virtual = true;
      if (det.types.length) man.community.virtualType = det.types[0];
      if (det.origins.length) man.community.originHints = det.origins;
      writeJson(p, man);
      tagged++;
    }

    if (det.isVirtual) {
      const z = man.zigbee || {};
      const pids = Array.isArray(z.productId) ? z.productId : (z.productId ? [z.productId] : []);
      const eps = z.endpoints && typeof z.endpoints === 'object' ? Object.keys(z.endpoints).length : 0;
      inventory.push({ id, class: man.class, types: det.types, origins: det.origins, reasons: det.reasons, productIds: pids.length, endpoints: eps });
    }
  }

  writeJson(INVENTORY_FILE, { generatedAt: new Date().toISOString(), count: inventory.length, items: inventory });
  writeJson(RULES_FILE, {
    generatedAt: new Date().toISOString(),
    nameHints: NAME_HINTS,
    sparseRule: 'No productId AND no clusters in any endpoint => virtual',
    classHeuristic: "class 'other' + name contains bridge/gateway => bridge/gateway"
  });

  console.log(`✅ Tagged ${tagged} virtual drivers. Inventory → ${path.relative(ROOT, INVENTORY_FILE)}`);
}

if (require.main===module){ try{ main(); } catch(e){ console.error('❌ Tagging failed:', e.message); process.exit(1);} }

module.exports = { main };
