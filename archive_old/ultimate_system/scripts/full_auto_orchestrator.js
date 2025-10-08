#!/usr/bin/env node
/*
 * full_auto_orchestrator.js
 * --------------------------------------------------------------
 * End-to-end automation pipeline with recursive validation and
 * deep correspondence/enrichment using internal + external sources.
 *
 * Steps:
 *  1) external_sources_fetcher.js (.external_sources/*)
 *  2) forum_scraper_v2.js
 *  3) deep_web_scraper_mini.js
 *  4) Data_Enricher.js (aggregates all sources)
 *  5) enrich_manufacturer_equivalences_and_categories.js
 *  6) Driver_Classifier_Corrector.js
 *  7) sdk3_quick_autofix.js (compliance normalization)
 *  8) fix_all_driver_assets.js (75x75 & 500x500)
 *  9) correspondence_reporter.js (proposals)
 * 10) apply_correspondence_proposals.js (safe merges)
 * 11) recursive_validate_fix.js (validate & fix loop)
 * 12) Final publish-level validation
 * Writes summary: ultimate_system/orchestration/state/full_auto_report.json
 */
const { execSync } = require('child_process');
const fs = require('fs');
const path = require('path');

const ROOT = process.cwd();
const STATE_DIR = path.join(ROOT, 'ultimate_system', 'orchestration', 'state');

function ensureDir(d){ if(!fs.existsSync(d)) fs.mkdirSync(d,{ recursive: true }); }
function run(name, cmd){
  const start = Date.now();
  const step = { name, cmd, ok: false, durationMs: 0, error: null };
  try { execSync(cmd, { cwd: ROOT, stdio: 'inherit' }); step.ok = true; }
  catch(e){ step.error = e.message || String(e); }
  step.durationMs = Date.now() - start;
  return step;
}

function main(){
  ensureDir(STATE_DIR);
  const steps = [];
  const push = (n,c)=> steps.push(run(n,c));

  push('External Sources Fetcher', 'node ultimate_system/scripts/external_sources_fetcher.js');
  push('Scrape forum (v2)', 'node ultimate_system/scripts/forum_scraper_v2.js');
  push('Deep web scraper (mini)', 'node ultimate_system/scripts/deep_web_scraper_mini.js');
  push('Data Enricher', 'node ultimate_system/orchestration/modules/Data_Enricher.js');
  push('Manufacturer Equivalences & Categories', 'node ultimate_system/scripts/enrich_manufacturer_equivalences_and_categories.js');
  push('Driver Classifier & Corrector', 'node ultimate_system/orchestration/modules/Driver_Classifier_Corrector.js');
  push('SDK3 Quick Autofix', 'node ultimate_system/scripts/sdk3_quick_autofix.js');
  push('Fix all driver assets', 'node ultimate_system/scripts/fix_all_driver_assets.js');
  push('Correspondence Reporter', 'node ultimate_system/scripts/correspondence_reporter.js');
  push('Apply Correspondence Proposals', 'node ultimate_system/scripts/apply_correspondence_proposals.js');
  push('Recursive Validate & Fix', 'node ultimate_system/scripts/recursive_validate_fix.js');
  // Final explicit validation
  push('Purge .homeybuild', 'powershell -Command "Remove-Item .homeybuild -Recurse -Force -ErrorAction SilentlyContinue"');
  push('Homey validate (publish)', 'homey app validate --level publish');

  const ok = steps.every(s=>s.ok);
  const report = { generatedAt: new Date().toISOString(), ok, steps };
  const outFile = path.join(STATE_DIR, 'full_auto_report.json');
  fs.writeFileSync(outFile, JSON.stringify(report,null,2), 'utf8');
  console.log(`\n📝 full_auto_report: ${path.relative(ROOT, outFile)} | ok=${ok}`);
  if (!ok) process.exit(1);
}

if (require.main===module){ try{ main(); } catch(e){ console.error('❌ full_auto_orchestrator failed:', e.message); process.exit(1);} }

module.exports = { main };
