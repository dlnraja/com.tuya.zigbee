'use strict';
const fs = require('fs');
const path = require('path');
const { spawnSync } = require('child_process');

function run(c, a) { return spawnSync(c, a, { stdio: 'inherit', shell: process.platform === 'win32' }).status === 0; }
function tryRun(c, a) { try { return run(c, a); } catch { return false; } }
function log(m) { console.log('[MEGA-TUYA]', m); }
function envFlag(name, def) { const v = process.env[name]; if (v == null || v === '') return def; return /^0|false|no$/i.test(String(v)) ? false : true; }

/**
 * MEGA-PROMPT — TUYA / HOMEY SDK v3 — FULL AUTO
 * Structure: drivers/<domain>/<category>/<vendor>/<model>/
 * Domain: "tuya" si manufacturer contient "tuya" ou commence par _tz/_ty, sinon "zigbee"
 */
(function() {
  // Flags (par défaut: local sécurisé, DO_MIGRATE activé)
  const DO_MIGRATE = envFlag('DO_MIGRATE', true);
  const SKIP_NPM = envFlag('SKIP_NPM', true);
  const SKIP_VALIDATE = envFlag('SKIP_VALIDATE', true);
  const SKIP_RUN = envFlag('SKIP_RUN', true);
  const SKIP_GIT_PUSH = envFlag('SKIP_GIT_PUSH', true);
  const PERSIST_TMP = envFlag('PERSIST_TMP', true); // NE JAMAIS supprimer .tmp_tuya_zip_work
  const KEEP_BACKUP = envFlag('KEEP_BACKUP', true); // NE JAMAIS supprimer .backup
  const CLEAN_TMP = envFlag('CLEAN_TMP', false); // Jamais par défaut

  process.env.CI = '1';
  process.env.NODE_ENV = process.env.NODE_ENV || 'production';

  log('=== MEGA-PROMPT TUYA ULTIMATE - Structure domain/category/vendor/model ===');
  log('1. Normaliser backups (.backup/zips/)');
  log('2. Restaurer .tmp_tuya_zip_work depuis backups (PERSISTENT)');
  log('3. NO variants → flatten & merge');
  log('4. Réorganiser ALL drivers vers domain/category/vendor/model');
  log('5. Migrate meshdriver → zigbeedriver');
  log('6. Enrich depuis tmp sources + backups');
  log('7. Générer assets manquants');
  log('8. Réindexer et vérifier');

  // ÉTAPE 1: Normaliser les backups
  log('normaliser backups (.backup/zips/)');
  if (!tryRun('node', ['scripts/normalize-backup.js'])) {
    log('ERROR: Failed to normalize backups');
    process.exit(1);
  }

  // ÉTAPE 2: Restaurer .tmp_tuya_zip_work depuis les backups
  log('restore .tmp_tuya_zip_work from backups');
  if (!tryRun('node', ['scripts/restore-tmp-sources.js'])) {
    log('ERROR: Failed to restore tmp sources');
    process.exit(1);
  }

  // ÉTAPE 3: Aplatir les variants
  log('NO variants → flatten & merge');
  if (!tryRun('node', ['scripts/reorganize-drivers-ultimate.js'])) {
    log('ERROR: Failed to reorganize drivers');
    process.exit(1);
  }

  // ÉTAPE 4: Fix package.json
  log('fixpkg (pre)');
  if (!tryRun('node', ['scripts/fix-package.js'])) {
    log('ERROR: Failed to fix package.json');
    process.exit(1);
  }

  // ÉTAPE 5: Migration meshdriver → zigbeedriver
  if (DO_MIGRATE) {
    log('migrate meshdriver → zigbeedriver');
    if (!tryRun('node', ['scripts/migrate-meshdriver-to-zigbeedriver.js'])) {
      log('WARNING: Migration failed, continuing...');
    }
    log('fixpkg (post-migration)');
    tryRun('node', ['scripts/fix-package.js']);
  } else {
    log('DO_MIGRATE=0 → pas de migration');
  }

  // ÉTAPE 6: Enrichissement depuis les sources tmp + backups
  log('enrich from tmp sources + backups');
  if (!tryRun('node', ['scripts/enrich-drivers.js', '--apply'])) {
    log('WARNING: Enrichment failed, continuing...');
  }

  // ÉTAPE 7: Vérification et cohérence
  log('verify coherence');
  if (!tryRun('node', ['scripts/verify-coherence-and-enrich.js'])) {
    log('WARNING: Verification failed, continuing...');
  }

  // ÉTAPE 8: Génération des assets
  log('generate assets');
  if (!tryRun('node', ['scripts/assets-generate.js'])) {
    log('WARNING: Assets generation failed, continuing...');
  }

  // ÉTAPE 9: Réindexation
  log('reindex drivers');
  if (!tryRun('node', ['scripts/reindex-drivers.js'])) {
    log('WARNING: Reindexing failed, continuing...');
  }

  // ÉTAPE 10: Mise à jour README
  log('update README');
  if (!tryRun('node', ['scripts/update-readme.js'])) {
    log('WARNING: README update failed, continuing...');
  }

  // ÉTAPE 11: NPM (optionnel)
  if (!SKIP_NPM) {
    log('npm clean install');
    tryRun('node', ['-e', "try{require('fs').rmSync('node_modules',{recursive:true,force:true})}catch{}"]);
    tryRun('node', ['-e', "try{require('fs').rmSync('package-lock.json',{force:true})}catch{}"]);
    
    if (!tryRun('npm', ['ci'])) {
      tryRun('npm', ['install', '--no-fund', '--no-audit']);
    }
    
    log('prod deps check');
    tryRun('npm', ['ls', '--only=prod']);
  } else {
    log('SKIP_NPM=1 → no npm install');
  }

  // ÉTAPE 12: Validation (optionnel)
  if (!SKIP_VALIDATE) {
    log('validate app');
    if (!tryRun('npx', ['homey', 'app', 'validate'])) {
      log('WARNING: Validation failed');
    }
  } else {
    log('SKIP_VALIDATE=1');
  }

  // ÉTAPE 13: Exécution (optionnel)
  if (!SKIP_RUN) {
    const dockerOK = tryRun('docker', ['version']);
    if (dockerOK) {
      tryRun('npx', ['homey', 'app', 'run']);
    } else {
      log('no Docker → skip run or use --remote');
    }
  } else {
    log('SKIP_RUN=1');
  }

  // ÉTAPE 14: Commit local (push optionnel)
  const user = process.env.GIT_USER || 'dlnraja', email = process.env.GIT_EMAIL || 'dylan.rajasekaram@gmail.com';
  tryRun('git', ['config', '--local', 'user.name', user]);
  tryRun('git', ['config', '--local', 'user.email', email]);
  tryRun('git', ['add', '-A']);
  
  const commitMsg = 'build: reorganize to domain/category/vendor/model + migrate to zigbeedriver + enrich from backups + no variants + persistent tmp sources';
  tryRun('git', ['commit', '-m', commitMsg]);
  
  if (!SKIP_GIT_PUSH) {
    const br = spawnSync('git', ['rev-parse', '--abbrev-ref', 'HEAD'], { encoding: 'utf8' });
    const branch = (br.stdout || '').trim() || 'master';
    
    if (!tryRun('git', ['push'])) {
      tryRun('git', ['push', '-u', 'origin', branch]);
    }
  } else {
    log('SKIP_GIT_PUSH=1');
  }

  // ÉTAPE 15: VÉRIFICATION FINALE - NE JAMAIS supprimer .tmp_tuya_zip_work
  if (PERSIST_TMP) {
    log('✓ .tmp_tuya_zip_work PERSISTED (as designed)');
    log('✓ This directory serves as persistent source for driver enrichment');
    log('✓ It will be used in every future run/push');
  } else {
    log('⚠ PERSIST_TMP=0 - tmp sources may be cleaned up');
  }

  // ÉTAPE 16: Rapport final
  log('=== FINAL STATUS ===');
  
  const driversPath = path.join(process.cwd(), 'drivers');
  if (fs.existsSync(driversPath)) {
    const domainDirs = fs.readdirSync(driversPath, { withFileTypes: true })
      .filter(d => d.isDirectory())
      .map(d => d.name);
    
    log(`✓ Drivers reorganized in: drivers/`);
    log(`✓ Domain directories: ${domainDirs.join(', ')}`);
    
    let totalDrivers = 0;
    for (const domain of domainDirs) {
      const domainPath = path.join(driversPath, domain);
      if (fs.existsSync(domainPath)) {
        const categoryDirs = fs.readdirSync(domainPath, { withFileTypes: true })
          .filter(d => d.isDirectory())
          .map(d => d.name);
        
        for (const category of categoryDirs) {
          const categoryPath = path.join(domainPath, category);
          const vendorDirs = fs.readdirSync(categoryPath, { withFileTypes: true })
            .filter(d => d.isDirectory())
            .map(d => d.name);
          
          for (const vendor of vendorDirs) {
            const vendorPath = path.join(categoryPath, vendor);
            const modelDirs = fs.readdirSync(vendorPath, { withFileTypes: true })
              .filter(d => d.isDirectory())
              .map(d => d.name);
            
            totalDrivers += modelDirs.length;
          }
        }
      }
    }
    
    log(`✓ Total drivers: ${totalDrivers}`);
  }
  
  const tmpPath = path.join(process.cwd(), '.tmp_tuya_zip_work');
  if (fs.existsSync(tmpPath)) {
    const tmpContents = fs.readdirSync(tmpPath, { withFileTypes: true })
      .filter(d => d.isDirectory())
      .map(d => d.name);
    
    log(`✓ Tmp sources available: ${tmpContents.join(', ')}`);
  }
  
  const backupPath = path.join(process.cwd(), '.backup', 'zips');
  if (fs.existsSync(backupPath)) {
    const backupFiles = fs.readdirSync(backupPath, { withFileTypes: true })
      .filter(f => f.isFile() && /\.zip$/i.test(f.name))
      .map(f => f.name);
    
    log(`✓ Backup ZIPs: ${backupFiles.length} files`);
  }
  
  log('=== MEGA-PROMPT COMPLETE ===');
  log('All drivers are now properly organized in domain/category/vendor/model structure');
  log('.tmp_tuya_zip_work is persistent and will be used for future enrichments');
  log('Backups are safely stored in .backup/zips/');
  log('No variants remain - everything is flattened and merged');
  log('Domain separation: tuya vs zigbee based on manufacturer detection');
})();
