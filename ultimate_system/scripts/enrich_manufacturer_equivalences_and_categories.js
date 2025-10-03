#!/usr/bin/env node
/*
 * enrich_manufacturer_equivalences_and_categories.js
 * --------------------------------------------------------------
 * - Build manufacturer equivalence groups (canonical brand + Tuya codes)
 *   using forum_data_v2.json and web_data_mini.json, plus heuristics.
 * - Annotate driver manifests with a non-functional 'community' block
 *   (brand, aliases) WITHOUT changing zigbee.manufacturerName.
 * - Ensure each driver is present in catalog/categories.json under a
 *   best-fit category derived from class/capabilities when missing.
 * - Write references/manufacturer_equivalences.json for visibility.
 */
const fs = require('fs');
const path = require('path');

const ROOT = process.cwd();
const DRIVERS_DIR = path.join(ROOT, 'drivers');
const CATALOG_FILE = path.join(ROOT, 'catalog', 'categories.json');
const REF_DIR = path.join(ROOT, 'references');
const EQUIV_FILE = path.join(REF_DIR, 'manufacturer_equivalences.json');
const FORUM_FILE = path.join(ROOT, 'ultimate_system', 'data_sources', 'forum_data_v2.json');
const WEB_MINI_FILE = path.join(ROOT, 'ultimate_system', 'data_sources', 'web_data_mini.json');

function readJson(p){ try{ return JSON.parse(fs.readFileSync(p,'utf8')); } catch{ return null; } }
function writeJson(p,d){ fs.writeFileSync(p, JSON.stringify(d,null,2), 'utf8'); }
function ensureDir(d){ if(!fs.existsSync(d)) fs.mkdirSync(d,{recursive:true}); }

// Canonical brand mapping
const CANON = new Map([
  ['moes','MOES'],['moeshouse','MOES'],['moes house','MOES'],
  ['lonsonho','Lonsonho'],
  ['zemismart','Zemismart'],
  ['lidl','Lidl'],['silvercrest','Lidl'],
  ['nous','Nous'],
  ['aubess','Aubess'],
  ['bseed','BSEED'],
  ['tuya','Tuya'],['unbranded','Tuya'],['generic','Tuya']
]);
function canonicalBrand(s){ if(!s||typeof s!=='string') return null; const k=s.trim().toLowerCase(); return CANON.get(k)||null; }
function isTuyaCode(s){ return typeof s==='string' && /^_(?:TZ\d{3,4}|TZE\d{3}|TZ3040|TZ3500|TZ3600)_[A-Za-z0-9_\-]+$/.test(s); }

function computeBestCategory(man){
  const cls = man.class;
  const caps = new Set(Array.isArray(man.capabilities)?man.capabilities:[]);
  // Heuristics
  if (cls==='light') return 'light';
  if (cls==='socket') return 'socket';
  if (cls==='lock') return 'lock';
  if (Array.from(caps).some(c=>String(c).startsWith('button'))) return 'button';
  if (caps.has('windowcoverings_set')||caps.has('windowcoverings_tilt_set')) return 'curtain';
  if (caps.has('target_temperature')||caps.has('thermostat_mode')) return 'thermostat';
  return cls==='sensor' ? 'sensor' : 'other';
}

function main(){
  ensureDir(REF_DIR);
  const forum = readJson(FORUM_FILE) || { manufacturers: [], productIds: [] };
  const webmini = readJson(WEB_MINI_FILE) || { manufacturers: [], productIds: [] };

  // Equivalence groups
  const tuyaCodes = new Set([...(forum.manufacturers||[]), ...(webmini.manufacturers||[])]);
  const groups = {
    MOES: [], Lonsonho: [], Zemismart: [], Lidl: [], Nous: [], Aubess: [], BSEED: [], Tuya: []
  };
  // All codes default to Tuya brand
  for (const code of tuyaCodes) { if (isTuyaCode(code)) groups.Tuya.push(code); }

  // Scan drivers to collect non-code brand strings and assign canonical
  const driverDirs = fs.readdirSync(DRIVERS_DIR,{withFileTypes:true}).filter(e=>e.isDirectory()).map(e=>e.name);
  const manifestPath = (id)=> path.join(DRIVERS_DIR,id,'driver.compose.json');
  const categories = readJson(CATALOG_FILE) || {};
  let categoriesChanged = false;

  for (const id of driverDirs) {
    const p = manifestPath(id);
    if (!fs.existsSync(p)) continue;
    const man = readJson(p) || {};

    // Manufacturer brand inference (non-breaking)
    const z = (man.zigbee||{});
    const mfg = z.manufacturerName;
    let brand = null;
    if (typeof mfg==='string') {
      if (isTuyaCode(mfg)) brand = 'Tuya';
      else brand = canonicalBrand(mfg);
    }
    if (brand && groups[brand] && isTuyaCode(mfg)) {
      if (!groups[brand].includes(mfg)) groups[brand].push(mfg);
    }

    // Add community brand alias info (safe metadata)
    if (brand) {
      man.community = man.community || {};
      man.community.brand = brand;
      const aliases = [];
      for (const [k,v] of CANON.entries()) if (v===brand) aliases.push(k);
      man.community.aliases = aliases;
      writeJson(p, man);
    }

    // Ensure categorized in catalog
    const present = Object.entries(categories).some(([cat, arr]) => Array.isArray(arr) && arr.includes(id));
    if (!present) {
      const cat = computeBestCategory(man);
      categories[cat] = Array.isArray(categories[cat]) ? categories[cat] : [];
      if (!categories[cat].includes(id)) { categories[cat].push(id); categoriesChanged = true; }
    }
  }

  // Save equivalences reference
  const ref = {
    generatedAt: new Date().toISOString(),
    sources: {
      forum: path.relative(ROOT, FORUM_FILE),
      webMini: path.relative(ROOT, WEB_MINI_FILE)
    },
    canonical: Array.from(CANON.entries()).map(([k,v])=>({ alias:k, brand:v })),
    groups
  };
  writeJson(EQUIV_FILE, ref);

  if (categoriesChanged) writeJson(CATALOG_FILE, categories);
  console.log(`✅ Enrichment complete. Equivalences → ${path.relative(ROOT,EQUIV_FILE)}; Catalog updated: ${categoriesChanged}`);
}

if (require.main===module){ try{ main(); } catch(e){ console.error('❌ Enrichment failed:', e.message); process.exit(1);} }

module.exports = { main };
