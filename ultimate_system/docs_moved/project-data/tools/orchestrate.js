#!/usr/bin/env node
'use strict';
const { spawnSync } = require('child_process');
const fs=require('fs');
const MODE=process.env.MODE||'FULL'; const OFFLINE=process.env.OFFLINE==='1';
function run(cmd,args){ console.log('▶',cmd,args.join(' ')); const r=spawnSync(cmd,args,{stdio:'inherit'}); if(r.status) throw new Error(cmd+' failed'); }
function tryRun(cmd,args){ console.log('▶',cmd,args.join(' ')); const r=spawnSync(cmd,args,{stdio:'inherit'}); return r.status||0; }

try{
  // 0) Préparation rapide (sans Homey) - JSON ciblé uniquement
  run('node',['tools/enable-compose.js']);
  run('node',['tools/clean-json-only.js']);

  // 1) Inventaire & refs
  run('node',['tools/matrix-build.js']);
  run('node',['tools/build-references.js']);
  run('node',['tools/build-dashboard.js']);

  // 2) Evidence (si FULL & online)
  if(MODE==='FULL' && !OFFLINE){
    tryRun('node',['tools/evidence-collect.js']);
  }

  // 3) Enrichissement heuristique (toujours, pour base)
  tryRun('node',['tools/enrich-heuristics.js']);

  // 4) Enrichissement automatique avec scraping web
  if(MODE==='FULL' && !OFFLINE){
    console.log('🌐 Phase d\'enrichissement automatique avec sources externes...');
    tryRun('node',['tools/auto-driver-enricher.js']);
  }

  // 5) Enrichissement depuis l'evidence (si créée)
  tryRun('node',['tools/enrich-from-evidence.js']);

  // 5) Validation unique à la fin
  const v = tryRun('homey',['app','validate','-l','debug']);
  if(v!==0){
    console.warn('⚠️ validate failed, attempting quick fix pass…');
    // Mini passe correctrice : re-lint JSON puis re-validate 1 fois
    tryRun('node',['tools/clean-json-only.js']);
    tryRun('node',['tools/enrich-from-evidence.js']);
    const v2 = tryRun('homey',['app','validate','-l','debug']);
    if(v2!==0){ console.error('❌ validate still failing. See output above.'); process.exit(1); }
  }
  console.log('✅ All good. You can now run: RUN_REMOTE=1 homey app run');
}catch(e){
  console.error('❌ Orchestrate error:', e.message);
  process.exit(1);
}
