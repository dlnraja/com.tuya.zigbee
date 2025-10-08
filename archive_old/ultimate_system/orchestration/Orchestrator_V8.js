#!/usr/bin/env node
/* Orchestrator_V8.js — Recursive 4-phase loop (Mono-Produit + Unbranding)
 * Phases: (1) Pre + Unbranding base → (2) Enrichment → (3) Classify/Correct → (4) Validate/CI
 * Loops while Homey publish-level validation or git push fails (max 3 iterations).
 */
const fs = require('fs');
const path = require('path');
const { execSync } = require('child_process');

const ROOT = process.cwd();
const STATE_DIR = path.join(ROOT, 'ultimate_system', 'orchestration', 'state');
const REPORT = path.join(STATE_DIR, 'orchestrator_v8_report.json');

function ensureDir(d){ if(!fs.existsSync(d)) fs.mkdirSync(d,{recursive:true}); }
function runStep(name, cmd, quiet=false){
  const start = Date.now();
  const step = { name, cmd, ok:false, durationMs:0, error:null };
  try { execSync(cmd, { cwd: ROOT, stdio: quiet ? 'pipe' : 'inherit' }); step.ok = true; }
  catch(e){ step.error = (e && e.message) ? e.message : String(e); }
  step.durationMs = Date.now() - start; return step;
}

function gitPre(){
  const arr = [];
  arr.push(runStep('Git stash', 'git stash push -u -m "orchestrator-v8"', true));
  arr.push(runStep('Git pull --rebase', 'git pull --rebase'));
  arr.push(runStep('Git stash pop --index', 'git stash pop --index', true));
  arr.push(runStep('Purge .homeybuild', 'powershell -Command "Remove-Item .homeybuild -Recurse -Force -ErrorAction SilentlyContinue"', true));
  return arr;
}

function main(){
  ensureDir(STATE_DIR);
  const all = [];
  let success = false;
  for (let iter=1; iter<=3 && !success; iter++){
    all.push({ phase:`iteration-${iter}`, steps: [] });
    const steps = all[all.length-1].steps;

    // Phase 1 — Pre + Unbranding base
    steps.push(...gitPre());
    steps.push(runStep('Build Unbranding Base', 'node ultimate_system/orchestration/modules/Manufacturer_Indexer.js'));

    // Phase 2 — Enrichment
    steps.push(runStep('Data Enricher', 'node ultimate_system/orchestration/modules/Data_Enricher.js'));

    // Phase 3 — Classifier/Corrector
    steps.push(runStep('Driver Classifier & Corrector', 'node ultimate_system/orchestration/modules/Driver_Classifier_Corrector.js'));

    // Assets normalization (optional)
    const assetsFix = path.join(ROOT,'ultimate_system','scripts','fix_all_driver_assets.js');
    if (fs.existsSync(assetsFix)) steps.push(runStep('Fix driver assets', 'node ultimate_system/scripts/fix_all_driver_assets.js'));

    // Compose (optional)
    steps.push(runStep('Homey compose', 'homey app compose', true));

    // Phase 4 — Validate
    const v = runStep('Homey validate (publish)', 'homey app validate --level publish');
    steps.push(v);

    if (!v.ok){
      continue; // restart loop
    }

    // Commit & push
    steps.push(runStep('Git add', 'git add -A'));
    steps.push(runStep('Git commit', 'git commit -m "V8.0: Mono-Produit + Unbranding total (orchestrator-v8)"', true));
    const p = runStep('Git push', 'git push origin master');
    steps.push(p);

    if (p.ok){ success = true; break; }
    // If push failed, try to rebase and loop again
    steps.push(runStep('Git pull --rebase (retry)', 'git pull --rebase'));
  }

  const ok = success;
  const report = { generatedAt: new Date().toISOString(), ok, iterations: all.length, runs: all };
  fs.writeFileSync(REPORT, JSON.stringify(report,null,2), 'utf8');
  console.log(`\n📝 orchestrator_v8_report: ${path.relative(ROOT, REPORT)} | ok=${ok}`);
  if (!ok) process.exit(1);
}

if (require.main===module){ try{ main(); } catch(e){ console.error('❌ Orchestrator_V8 failed:', e.message); process.exit(1);} }
