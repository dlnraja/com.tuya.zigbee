#!/usr/bin/env node
/*
 * scrape_aggregate_enrich.js
 * --------------------------------------------------------------
 * Orchestrates:
 * 1) forum_scraper_v2.js
 * 2) deep_web_scraper_mini.js
 * 3) Data_Enricher.js
 * 4) Driver_Classifier_Corrector.js
 * 5) sdk3_quick_autofix.js
 * 6) fix_all_driver_assets.js
 * 7) Validate (publish-level)
 * Produces a summary report in orchestration/state/scrape_enrich_report.json
 */
const { execSync } = require('child_process');
const fs = require('fs');
const path = require('path');

const ROOT = process.cwd();
const STATE_DIR = path.join(ROOT, 'ultimate_system', 'orchestration', 'state');

function ensureDir(dir) { if (!fs.existsSync(dir)) fs.mkdirSync(dir, { recursive: true }); }
function runStep(name, cmd, opts = {}) {
  const start = Date.now();
  const result = { name, cmd, ok: false, durationMs: 0, error: null };
  try {
    console.log(`\n▶ ${name} ...`);
    execSync(cmd, { cwd: ROOT, stdio: 'inherit', ...opts });
    result.ok = true;
  } catch (e) {
    result.error = e.message || String(e);
  } finally {
    result.durationMs = Date.now() - start;
  }
  return result;
}

function main() {
  ensureDir(STATE_DIR);
  const steps = [];

  steps.push(runStep('Scrape forum (v2)', 'node ultimate_system/scripts/forum_scraper_v2.js'));
  steps.push(runStep('Deep web scraper (mini)', 'node ultimate_system/scripts/deep_web_scraper_mini.js'));
  steps.push(runStep('Data Enricher', 'node ultimate_system/orchestration/modules/Data_Enricher.js'));
  steps.push(runStep('Driver Classifier & Corrector', 'node ultimate_system/orchestration/modules/Driver_Classifier_Corrector.js'));
  steps.push(runStep('SDK3 Quick Autofix', 'node ultimate_system/scripts/sdk3_quick_autofix.js'));
  steps.push(runStep('Fix all driver assets', 'node ultimate_system/scripts/fix_all_driver_assets.js'));
  // Purge build cache before validation
  steps.push(runStep('Purge .homeybuild', 'powershell -Command "Remove-Item .homeybuild -Recurse -Force -ErrorAction SilentlyContinue"'));
  steps.push(runStep('Homey validate (publish)', 'homey app validate --level publish'));

  const summary = {
    generatedAt: new Date().toISOString(),
    steps,
    ok: steps.every(s => s.ok),
  };
  const outFile = path.join(STATE_DIR, 'scrape_enrich_report.json');
  fs.writeFileSync(outFile, JSON.stringify(summary, null, 2), 'utf8');
  console.log(`\n📝 Report saved: ${path.relative(ROOT, outFile)}`);

  if (!summary.ok) {
    console.log('\n⚠️ Some steps failed. Check above logs and report file.');
    process.exitCode = 1;
  } else {
    console.log('\n✅ Orchestration completed successfully.');
  }
}

if (require.main === module) {
  try { main(); } catch (e) { console.error('❌ Orchestration failed:', e); process.exit(1); }
}

module.exports = { main };
