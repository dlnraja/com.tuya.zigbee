#!/usr/bin/env node
// Orchestrator_V10.js — Prompt d'Orchestration Total (v10.0)
// Phases: (1) Pre + History + Picto/Battery → (2) Enrich → (3) Classify → (4) Validate/CI
// Recursion: loops while publish validation or git push fails (max 3 iterations)
const fs=require('fs');const path=require('path');const{execSync}=require('child_process');
const ROOT=process.cwd();const STATE=path.join(ROOT,'ultimate_system','orchestration','state');const REPORT=path.join(STATE,'orchestrator_v10_report.json');
function ensureDir(d){if(!fs.existsSync(d))fs.mkdirSync(d,{recursive:true})}
function runStep(name,cmd,quiet=false){const t0=Date.now();const s={name,cmd,ok:false,ms:0,err:null};try{execSync(cmd,{cwd:ROOT,stdio:quiet?'pipe':'inherit'});s.ok=true}catch(e){s.err=e&&e.message?e.message:String(e)}s.ms=Date.now()-t0;return s}
function gitPre(){return [
 runStep('Git stash','git stash push -u -m "orchestrator-v10"',true),
 runStep('Git pull --rebase','git pull --rebase'),
 runStep('Git stash pop --index','git stash pop --index',true),
 runStep('Purge .homeybuild','powershell -Command "Remove-Item .homeybuild -Recurse -Force -ErrorAction SilentlyContinue"',true),
]}
function main(){ensureDir(STATE);const runs=[];let success=false;for(let i=1;i<=3&&!success;i++){const steps=[];
 // Phase 1 — Audit/Sécurité/Pictos/Batteries
 steps.push(...gitPre());
 steps.push(runStep('Unbranding base (Git History)','node ultimate_system/orchestration/modules/GitHistory_Unbranding.js'));
 steps.push(runStep('Unbranding base (Current State)','node ultimate_system/orchestration/modules/Manufacturer_Indexer.js'));
 steps.push(runStep('Fix pictograms/resources','node ultimate_system/orchestration/modules/Resource_Pictogram_Fixer.js'));
 if(fs.existsSync(path.join(ROOT,'ultimate_system','scripts','fix_all_driver_assets.js'))){steps.push(runStep('Generate/normalize driver images','node ultimate_system/scripts/fix_all_driver_assets.js'));}
 steps.push(runStep('Ensure battery metadata','node ultimate_system/orchestration/modules/Battery_Metadata_Fixer.js'));
 // Phase 2 — Enrichment
 steps.push(runStep('Data Enricher','node ultimate_system/orchestration/modules/Data_Enricher.js'));
 // Phase 3 — Classifier/Corrector (Mono-Produit + Unbranding)
 steps.push(runStep('Driver Classifier & Corrector','node ultimate_system/orchestration/modules/Driver_Classifier_Corrector.js'));
 // Phase 4 — Validation & CI
 steps.push(runStep('Homey compose','homey app compose',true)); // may fail, non-fatal
 const val=runStep('Homey validate (publish)','homey app validate --level publish');steps.push(val);
 if(!val.ok){runs.push({iteration:i,steps});continue}
 steps.push(runStep('Git add','git add -A'));
 steps.push(runStep('Git commit','git commit -m "V10.0 FINAL: Application Mono-Produit, Unbranding et Correction des Pictos"',true));
 const push=runStep('Git push','git push origin master');steps.push(push);
 runs.push({iteration:i,steps});
 if(push.ok){success=true;break}
 steps.push(runStep('Git pull --rebase (retry)','git pull --rebase'));
 }
 const report={generatedAt:new Date().toISOString(),ok:success,iterations:runs.length,runs};
 fs.writeFileSync(REPORT,JSON.stringify(report,null,2),'utf8');
 console.log(`\n📝 orchestrator_v10_report: ${path.relative(ROOT,REPORT)} | ok=${success}`);
 if(!success)process.exit(1);
}
if(require.main===module){try{main()}catch(e){console.error('❌ Orchestrator_V10 failed:',e.message);process.exit(1)}}
