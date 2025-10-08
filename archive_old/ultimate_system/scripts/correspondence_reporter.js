#!/usr/bin/env node
/*
 * correspondence_reporter.js
 * --------------------------------------------------------------
 * Generate a per-driver correspondence report using the enrichment state:
 *  - For each driver, find matching manufacturer records from
 *    ultimate_system/orchestration/state/data_enrichment.json
 *  - Propose additional productIds/batteries based on enrichment
 *  - Summarize gaps (e.g., missing energy.batteries with measure_battery)
 * Write report to ultimate_system/orchestration/state/correspondence_report.json
 */
const fs = require('fs');
const path = require('path');

const ROOT = process.cwd();
const DRIVERS_DIR = path.join(ROOT, 'drivers');
const STATE_DIR = path.join(ROOT, 'ultimate_system', 'orchestration', 'state');
const ENRICH_FILE = path.join(STATE_DIR, 'data_enrichment.json');
const OUT_FILE = path.join(STATE_DIR, 'correspondence_report.json');

function readJson(p){ try { return JSON.parse(fs.readFileSync(p,'utf8')); } catch { return null; } }
function writeJson(p,d){ fs.writeFileSync(p, JSON.stringify(d,null,2), 'utf8'); }

function asArr(v){ return Array.isArray(v) ? v : (v===undefined||v===null ? [] : [v]); }

function main(){
  const enrich = readJson(ENRICH_FILE);
  if (!enrich || !Array.isArray(enrich.enrichedManufacturers)) {
    console.error('No enrichment state found. Run Data_Enricher.js first.');
    process.exit(1);
  }

  const records = new Map();
  for (const rec of enrich.enrichedManufacturers) {
    records.set(rec.manufacturer, rec);
  }

  const ids = fs.readdirSync(DRIVERS_DIR,{withFileTypes:true}).filter(e=>e.isDirectory()).map(e=>e.name);
  const report = [];

  for (const id of ids) {
    const p = path.join(DRIVERS_DIR, id, 'driver.compose.json');
    if (!fs.existsSync(p)) continue;
    const man = readJson(p);
    if (!man || !man.zigbee) continue;

    const mf = man.zigbee.manufacturerName;
    const mfg = typeof mf === 'string' ? mf.trim() : null;
    const entry = { id, manufacturer: mfg || null, proposals: {}, gaps: [] };

    const caps = new Set(Array.isArray(man.capabilities)?man.capabilities:[]);
    const hasMB = caps.has('measure_battery');

    const rec = mfg ? records.get(mfg) : null;
    if (rec) {
      // Proposed productIds not yet in manifest
      const curPids = new Set(asArr(man.zigbee.productId).map(String));
      const addPids = (rec.productIds||[]).filter(pid => !curPids.has(String(pid)));
      if (addPids.length) entry.proposals.productIds = addPids;

      // Proposed batteries if measure_battery and empty/missing
      const curBat = Array.isArray((man.energy||{}).batteries) ? man.energy.batteries : [];
      if (hasMB && (!curBat.length) && Array.isArray(rec.batteries) && rec.batteries.length) {
        entry.proposals.batteries = rec.batteries;
      }
    }

    if (hasMB && !(Array.isArray((man.energy||{}).batteries) && man.energy.batteries.length)) {
      entry.gaps.push('missing_energy_batteries');
    }

    report.push(entry);
  }

  const summary = {
    generatedAt: new Date().toISOString(),
    count: report.length,
    withProposals: report.filter(r=>Object.keys(r.proposals).length>0).length,
    withGaps: report.filter(r=>r.gaps.length>0).length,
    items: report.slice(0, 100) // cap preview
  };

  writeJson(OUT_FILE, summary);
  console.log(`✅ Correspondence report → ${path.relative(ROOT, OUT_FILE)} with ${summary.withProposals} proposals, ${summary.withGaps} gaps.`);
}

if (require.main===module){ try{ main(); } catch(e){ console.error('❌ correspondence_reporter failed:', e.message); process.exit(1);} }

module.exports = { main };
