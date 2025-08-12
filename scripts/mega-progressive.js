#!/usr/bin/env node
/**
 * @file mega-progressive.js
 * @description Pipeline progressive selon MEGA-INDICATIONS CURSOR
 * @author dlnraja
 * @date 2025-01-29
 */

'use strict';

const { spawnSync } = require('child_process');
const { toArray } = require('../lib/helpers');

function run(cmd, args = []) {
  const result = spawnSync(cmd, args, { 
    stdio: 'inherit', 
    shell: process.platform === 'win32',
    timeout: 300000 // 5 min timeout
  });
  return result.status === 0;
}

function tryRun(cmd, args = []) {
  try {
    return run(cmd, args);
  } catch (err) {
    console.log(`[mega] ${cmd} ${args.join(' ')} failed: ${err.message}`);
    return false;
  }
}

function log(msg) {
  const timestamp = new Date().toISOString().slice(11, 19);
  console.log(`[mega:${timestamp}] ${msg}`);
}

function envFlag(name, defaultValue) {
  const value = process.env[name];
  if (value == null || value === '') return defaultValue;
  return /^0|false|no$/i.test(String(value)) ? false : true;
}

function main() {
  // Variables d'environnement selon MEGA-INDICATIONS
  const PROGRESSIVE = envFlag('PROGRESSIVE', true);
  const BATCH_SIZE = parseInt(process.env.BATCH_SIZE) || 80;
  const DO_MIGRATE = envFlag('DO_MIGRATE', true);
  const PERSIST_TMP = envFlag('PERSIST_TMP', true);
  const KEEP_BACKUP = envFlag('KEEP_BACKUP', true);
  const SKIP_GIT_PUSH = envFlag('SKIP_GIT_PUSH', false);
  const SKIP_NPM = envFlag('SKIP_NPM', true);
  const SKIP_VALIDATE = envFlag('SKIP_VALIDATE', true);
  const SKIP_RUN = envFlag('SKIP_RUN', true);

  process.env.CI = '1';
  process.env.NODE_ENV = process.env.NODE_ENV || 'production';

  const SIMULATE = envFlag('SIMULATE', false);
  const BACKUP_INCR = envFlag('BACKUP_INCR', true);

  if (SIMULATE) log('MODE SIMULATE ACTIVÉ - Pas de changements réels');

  if (BACKUP_INCR) {
    log('Backup incrémental des drivers');
    tryRun('node', ['scripts/backup-drivers-incr.js']);
  }

  // Ajouter après backup incrémental
  log('AI decision making');
  tryRun('node', ['scripts/ai-pipeline-script-1.js']);
  log('AI cache prune');
  tryRun('node', ['scripts/ai-pipeline-script-2.js']);
  log('AI health diag');
  tryRun('node', ['scripts/ai-pipeline-script-10.js']);

  if (PROGRESSIVE) {
    log(`PROGRESSIVE MODE: restore → z2m-seed(${BATCH_SIZE}) → enrich → reorg → verify/diag → assets/small → reindex → dashboard → push`);
    
    // A) Restore/ingest
    if (PERSIST_TMP && KEEP_BACKUP) {
      log('normalize backups'); 
      tryRun('node', ['scripts/normalize-backup.js']);
    }
    
    log('restore tmp from backup');
    tryRun('node', ['scripts/sources/local/restore-tmp-sources.js']);
    
    log('fix package.json');
    tryRun('node', ['scripts/fix-package.js']);
    
    // B) Scraping Z2M progressif
    log(`z2m seed (batch ${BATCH_SIZE})`);
    process.env.BATCH_SIZE = String(BATCH_SIZE);
    tryRun('node', ['scripts/sources/z2m-seed.js']);
    
    // C) Enrich/merge
    log('enrich (no-rewrite mode)');
    tryRun('node', ['scripts/enrich-drivers.js', '--apply', '--no-rewrite']);
    
    // Migration optionnelle
    if (DO_MIGRATE) {
      log('migrate meshdriver');
      tryRun('node', ['scripts/migrate-meshdriver-to-zigbeedriver.js']);
    }
    
    // D) Reorganize strict
    log('reorganize (prudent mode)');
    tryRun('node', ['scripts/reorganize-drivers.js', '--prudent']);
    
    // E) Verify/Diagnose/Fix
    log('verify coherence');
    tryRun('node', ['scripts/verify-coherence-and-enrich.js']);
    
    log('diagnose --fix');
    tryRun('node', ['scripts/diagnose-drivers.js', '--fix', '--fix-assets']);
    
    // F) Assets & Index
    log('generate assets');
    tryRun('node', ['scripts/assets-generate.js']);
    
    log('create small.png');
    tryRun('node', ['scripts/create-small-png.js']);
    
    log('reindex drivers');
    tryRun('node', ['scripts/reindex-drivers.js']);
    
    log('generate dashboard');
    tryRun('node', ['scripts/dashboard-generator.js']);
    
    log('organize reports');
    tryRun('node', ['scripts/organize-reports.js']);
    
    // Validations supplémentaires
    log('json lint');
    tryRun('node', ['scripts/json-lint.js']);
    log('compose schema');
    tryRun('node', ['scripts/validate-compose-schema.js']);
    log('scan missing files');
    tryRun('node', ['scripts/scan-missing-required.js']);
    
    // G) README & Push
    log('update readme');
    tryRun('node', ['scripts/update-readme.js']);
    
    if (!SKIP_GIT_PUSH) {
      const timestamp = new Date().toISOString().slice(0, 16).replace(/[-:T]/g, '');
      log('git commit + push');
      tryRun('node', ['scripts/git-commit-push.js', `feat-progressive-batch-${timestamp}`]);
    }
    
    log('PROGRESSIVE MODE completed');
    return;
  }
  
  // MODE COMPLET (PROGRESSIVE=0)
  log('FULL MODE: restore → ingest → enrich → reorg → verify → diag → assets → small → reindex → dashboard → sources → readme → push');
  
  // Étapes complètes
  log('normalize backups');
  tryRun('node', ['scripts/normalize-backup.js']);
  
  log('restore tmp from backup');
  tryRun('node', ['scripts/sources/local/restore-tmp-sources.js']);
  
  log('fix package');
  tryRun('node', ['scripts/fix-package.js']);
  
  log('ingest zips');
  tryRun('node', ['scripts/ingest-tuya-zips.js']);
  
  if (DO_MIGRATE) {
    log('migrate meshdriver');
    tryRun('node', ['scripts/migrate-meshdriver-to-zigbeedriver.js']);
    tryRun('node', ['scripts/fix-package.js']);
  }
  
  log('enrich drivers');
  tryRun('node', ['scripts/enrich-drivers.js', '--apply']);
  
  log('reorganize');
  tryRun('node', ['scripts/reorganize-drivers.js']);
  
  log('verify');
  tryRun('node', ['scripts/verify-coherence-and-enrich.js']);
  
  log('diagnose --strict');
  tryRun('node', ['scripts/diagnose-drivers.js', '--strict']);
  
  log('diagnose --fix');
  tryRun('node', ['scripts/diagnose-drivers.js', '--fix', '--fix-assets']);
  
  log('assets');
  tryRun('node', ['scripts/assets-generate.js']);
  
  log('small.png');
  tryRun('node', ['scripts/create-small-png.js']);
  
  log('reindex');
  tryRun('node', ['scripts/reindex-drivers.js']);
  
  log('dashboard');
  tryRun('node', ['scripts/dashboard-generator.js']);
  
  log('organize reports');
  tryRun('node', ['scripts/organize-reports.js']);
  
  log('sources wildcard');
  tryRun('node', ['scripts/sources/sources-orchestrator.js', '--now']);
  
  log('update readme');
  tryRun('node', ['scripts/update-readme.js']);
  
  // Auto-fix JSON avant lint
  log('json auto-fix');
  tryRun('node', ['scripts/fix-json-files.js']);
  log('json auto-fix ext');
  tryRun('node', ['scripts/fix-json-files-extended.js']);
  
  // Validations supplémentaires
  log('json lint');
  tryRun('node', ['scripts/json-lint.js']);
  log('compose schema');
  tryRun('node', ['scripts/validate-compose-schema.js']);
  log('scan missing files');
  tryRun('node', ['scripts/scan-missing-required.js']);
  
  // Tests optionnels
  if (!SKIP_NPM) {
    log('npm install/ci');
    if (!tryRun('npm', ['ci'])) {
      tryRun('npm', ['install', '--no-fund', '--no-audit']);
    }
    log('npm ls --only=prod');
    tryRun('npm', ['ls', '--only=prod']);
  } else {
    log('SKIP_NPM=1');
  }
  
  if (!SKIP_VALIDATE) {
    log('validate');
    tryRun('npx', ['homey', 'app', 'validate']);
  } else {
    log('SKIP_VALIDATE=1');
  }
  
  if (!SKIP_RUN) {
    log('run');
    tryRun('npx', ['homey', 'app', 'run']);
  } else {
    log('SKIP_RUN=1');
  }
  
  // Git final
  if (!SKIP_GIT_PUSH) {
    const timestamp = new Date().toISOString().slice(0, 16).replace(/[-:T]/g, '');
    log('git commit + push');
    tryRun('node', ['scripts/git-commit-push.js', 'build-full-run-' + timestamp]);
  }
  
  log('FULL MODE completed');
}

if (require.main === module) {
  main();
}

module.exports = { main };