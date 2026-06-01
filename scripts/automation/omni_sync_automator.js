/**
 * AI AUTOMATION RULES (v10.0)
 * 1. Anti-Degradation: AI bots MUST NOT remove a manufacturerName (MFS) from a driver.compose.json just because it is found in another driver. It must be kept in both, and collision handled at runtime or pairing logic.
 * 2. Enrichment: Any MFS conflict should be logged as MFS_COLLISION_WARNING instead of deleting footprints. This preserves backward compatibility for exotic variants.
 * 3. MFS + DeviceID Matrix: Automations must not only check if an MFS is supported, but MUST analyze the exact combination of MFS + DeviceID (e.g., _TZE200_xxxx + TS0601) to finely understand supported features and smartfeatures.
 * 4. Heuristic Variant Adaptation: Manage variant differences smartly without degrading the existing code. Adapt heuristically to each version and variation, ensuring the app remains fully functional, stable, and within Athom's size limits.
 */
const fs = require('fs');
const path = require('path');
const { execSync } = require('child_process');

const REPOS = {
  master: path.resolve(__dirname, '../../../tuya_repair'),
  wifi: path.resolve(__dirname, '../../../tuya_wifi_local'),
  stable: path.resolve(__dirname, '../../../tuya_stable')
};

function run(cmd, cwd) {
  console.log(`[EXEC] ${cmd} (in ${path.basename(cwd)})`);
  try {
    execSync(cmd, { cwd, stdio: 'inherit' });
  } catch (err) {
    console.error(`[ERROR] Command failed: ${cmd} in ${cwd}`);
  }
}

function processRepo(name, dir) {
  if (!fs.existsSync(dir)) {
    console.log(`[SKIP] Repository ${name} not found at ${dir}`);
    return;
  }
  console.log(`\n===========================================`);
  console.log(`🔄 PROCESSING ${name.toUpperCase()} APP`);
  console.log(`===========================================`);

  // 1. Fetch latest changes
  run('git pull --rebase origin HEAD', dir);

  // 2. Inject community fingerprints
  const injectScript = path.join(dir, 'scripts', 'inject-fingerprints-from-issues.js');
  if (fs.existsSync(injectScript)) {
    run('node scripts/inject-fingerprints-from-issues.js', dir);
  } else {
    // Try to run from master if not present in the target repo
    const masterInject = path.join(REPOS.master, 'scripts', 'inject-fingerprints-from-issues.js');
    if (fs.existsSync(masterInject)) {
      run(`node ${masterInject}`, dir);
    }
  }

  // 3. Fix crashers
  const crasherScript = path.join(dir, 'scripts', 'automation', 'fix-crashers.js');
  if (fs.existsSync(crasherScript)) {
    run('node scripts/automation/fix-crashers.js', dir);
  }

  // 4. Run full validation, fix & sync
  const masterAuto = path.join(dir, 'scripts', 'master-automation.js');
  if (fs.existsSync(masterAuto)) {
    run('node scripts/master-automation.js --fix', dir);
  } else {
    // Fallback sync
    if (fs.existsSync(path.join(dir, 'package.json'))) {
      run('npm run sync || true', dir);
    }
  }

  // 5. Commit & Push
  run('git add .', dir);
  run('git commit -m "Auto-Omni-Sync: Injected issues, fixed crash logs, synced app.json"', dir);
  run('git push origin HEAD', dir);
}

function runOmniSync() {
  console.log('🚀 Starting Omni-Sync Automator across 3 branches...');
  processRepo('stable', REPOS.stable);
  processRepo('master', REPOS.master);
  processRepo('wifi', REPOS.wifi);
  console.log('\n✅ Omni-Sync Cycle Complete!');
}

runOmniSync();

