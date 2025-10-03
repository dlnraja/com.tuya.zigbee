#!/usr/bin/env node
/*
 * recursive_validate_fix.js
 * --------------------------------------------------------------
 * Repeatedly run publish-level validation and apply targeted fixes
 * between attempts until success or max tries reached.
 * Fix cycle per attempt (if failed):
 *  - sdk3_quick_autofix.js
 *  - apply_correspondence_proposals.js (merge new productIds/batteries)
 *  - Driver_Classifier_Corrector.js (to re-apply enrichment-based corrections)
 *  - fix_all_driver_assets.js
 *  - purge .homeybuild
 * Writes a report to ultimate_system/orchestration/state/recursive_validate_report.json
 */
const { execSync } = require('child_process');
const fs = require('fs');
const path = require('path');

const ROOT = process.cwd();
const STATE_DIR = path.join(ROOT, 'ultimate_system', 'orchestration', 'state');

function ensureDir(d){ if(!fs.existsSync(d)) fs.mkdirSync(d,{ recursive: true }); }
function run(cmd){ try { execSync(cmd, { cwd: ROOT, stdio: 'inherit' }); return { ok: true }; } catch (e) { return { ok: false, error: e.message || String(e) }; } }

function main(){
  ensureDir(STATE_DIR);
  const attempts = [];
  const maxTries = 3;
  let success = false;

  for (let i=1; i<=maxTries; i++){
    const step = { attempt: i, actions: [] };

    // Purge cache before each validation attempt
    step.actions.push({ name: 'purge_cache', result: run('powershell -Command "Remove-Item .homeybuild -Recurse -Force -ErrorAction SilentlyContinue"') });

    // Validate publish level
    const val = run('homey app validate --level publish');
    step.actions.push({ name: 'validate_publish', result: val });
    if (val.ok) { success = true; attempts.push(step); break; }

    // Apply fixes if failed
    step.actions.push({ name: 'sdk3_quick_autofix', result: run('node ultimate_system/scripts/sdk3_quick_autofix.js') });
    step.actions.push({ name: 'apply_correspondence_proposals', result: run('node ultimate_system/scripts/apply_correspondence_proposals.js') });
    step.actions.push({ name: 'Driver_Classifier_Corrector', result: run('node ultimate_system/orchestration/modules/Driver_Classifier_Corrector.js') });
    step.actions.push({ name: 'fix_all_driver_assets', result: run('node ultimate_system/scripts/fix_all_driver_assets.js') });

    attempts.push(step);
  }

  const report = { generatedAt: new Date().toISOString(), success, attempts };
  const outFile = path.join(STATE_DIR, 'recursive_validate_report.json');
  fs.writeFileSync(outFile, JSON.stringify(report, null, 2), 'utf8');
  console.log(`\n📝 recursive_validate_report: ${path.relative(ROOT, outFile)} | success=${success}`);
  if (!success) process.exit(1);
}

if (require.main===module){ try{ main(); } catch(e){ console.error('❌ recursive_validate_fix failed:', e.message); process.exit(1);} }

module.exports = { main };
