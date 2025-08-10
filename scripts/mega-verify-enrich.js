'use strict';
const {spawnSync}=require('child_process');const fs=require('fs'),path=require('path');
function run(script,args=[],env={}){console.log(`\n🚀 [MEGA] Running: ${script} ${args.join(' ')}`);const r=spawnSync(script,args,{env:{...process.env,...env},stdio:'inherit'});return r.status===0;}
function main(){console.log('🎯 [MEGA] Tuya Zigbee Project - Complete Reorganization & Migration\n');
// Phase 1: Fix package.json
if(!run('node',['scripts/fix-package.js'])){console.error('❌ [MEGA] Package fix failed');return false;}
// Phase 2: Migration meshdriver → zigbeedriver (if enabled)
if(process.env.DO_MIGRATE){if(!run('node',['scripts/migrate-meshdriver-to-zigbeedriver.js'])){console.error('❌ [MEGA] Migration failed');return false;}}
// Phase 3: Ingest and enrich
if(!run('node',['scripts/ingest-tuya-zips.js'])){console.error('❌ [MEGA] Ingest failed');return false;}
if(!run('node',['scripts/enrich-drivers.js'])){console.error('❌ [MEGA] Enrich failed');return false;}
// Phase 4: Verify and reorganize
if(!run('node',['scripts/verify-coherence-and-enrich.js'])){console.error('❌ [MEGA] Verify failed');return false;}
if(!run('node',['scripts/reorganize-drivers.js'])){console.error('❌ [MEGA] Reorganize failed');return false;}
// Phase 5: Generate assets and reindex
if(!run('node',['scripts/assets-generate.js'])){console.error('❌ [MEGA] Assets generation failed');return false;}
if(!run('node',['scripts/reindex-drivers.js'])){console.error('❌ [MEGA] Reindex failed');return false;}
// Phase 6: Update README
if(!run('node',['scripts/update-readme.js'])){console.error('❌ [MEGA] README update failed');return false;}
// Phase 7: NPM operations (if not skipped)
if(!process.env.SKIP_NPM){console.log('\n📦 [MEGA] Installing dependencies...');if(!run('npm',['install'])){console.error('❌ [MEGA] NPM install failed');return false;}}
// Phase 8: Validation (if not skipped)
if(!process.env.SKIP_VALIDATE){console.log('\n✅ [MEGA] Validating Homey app...');if(!run('npx',['homey','app','validate'])){console.error('❌ [MEGA] Validation failed');return false;}}
// Phase 9: Run (if not skipped)
if(!process.env.SKIP_RUN){console.log('\n🏃 [MEGA] Running Homey app...');if(!run('npx',['homey','app','run'])){console.error('❌ [MEGA] Run failed');return false;}}
// Phase 10: Git operations (if not skipped)
if(!process.env.SKIP_GIT_PUSH){console.log('\n📝 [MEGA] Committing changes...');if(!run('git',['add','.'])){console.error('❌ [MEGA] Git add failed');return false;}
if(!run('git',['commit','-m','🚀 MEGA: Complete project reorganization and migration - '+new Date().toISOString()])){console.error('❌ [MEGA] Git commit failed');return false;}
if(!process.env.SKIP_GIT_PUSH){console.log('\n📤 [MEGA] Pushing to remote...');if(!run('git',['push'])){console.error('❌ [MEGA] Git push failed');return false;}}}
console.log('\n🎉 [MEGA] All operations completed successfully!');return true;}
if(require.main===module)main();
