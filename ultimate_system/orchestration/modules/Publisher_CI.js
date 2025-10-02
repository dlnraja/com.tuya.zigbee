#!/usr/bin/env node
/*
 * Phase 4 – Publisher_CI.js
 * --------------------------------------------------------------
 * Executes the closing automation cycle: TODO processing, cache purge,
 * validation, git workflow, and metric consolidation. Designed to be
 * idempotent and safe for repeated invocations.
 */

const fs = require('fs');
const path = require('path');
const { execSync } = require('child_process');

const ROOT = path.resolve(__dirname, '../../..');
const STATE_DIR = path.resolve(__dirname, '../state');
const DRIVERS_DIR = path.join(ROOT, 'drivers');
const CATALOG_FILE = path.join(ROOT, 'catalog', 'categories.json');
const CACHE_DIRECTORIES = ['.homeybuild', '.homeycompose'];

function ensureDir(dirPath) {
  if (!fs.existsSync(dirPath)) {
    fs.mkdirSync(dirPath, { recursive: true });
  }
}

function readJsonSafe(filePath) {
  try {
    return JSON.parse(fs.readFileSync(filePath, 'utf8'));
  } catch (error) {
    return null;
  }
}

function writeJson(filePath, data) {
  fs.writeFileSync(filePath, JSON.stringify(data, null, 2), 'utf8');
}

function loadStateFile(name) {
  return readJsonSafe(path.join(STATE_DIR, name));
}

function countDrivers() {
  try {
    return fs.readdirSync(DRIVERS_DIR, { withFileTypes: true })
      .filter((entry) => entry.isDirectory())
      .length;
  } catch (error) {
    return 0;
  }
}

function collectManufacturers() {
  const manufacturers = new Set();
  try {
    const driverDirs = fs.readdirSync(DRIVERS_DIR, { withFileTypes: true })
      .filter((entry) => entry.isDirectory())
      .map((entry) => entry.name);
    driverDirs.forEach((driverId) => {
      const composePath = path.join(DRIVERS_DIR, driverId, 'driver.compose.json');
      if (!fs.existsSync(composePath)) return;
      const manifest = readJsonSafe(composePath);
      if (!manifest || !manifest.zigbee) return;
      const entry = manifest.zigbee.manufacturerName;
      if (Array.isArray(entry)) {
        entry.forEach((name) => typeof name === 'string' && manufacturers.add(name.trim()));
      } else if (typeof entry === 'string') {
        manufacturers.add(entry.trim());
      }
    });
  } catch (error) {
    // Ignore – fall back to collected entries so far
  }
  return manufacturers;
}

function purgeHomeyCaches() {
  CACHE_DIRECTORIES.forEach((dirName) => {
    const target = path.join(ROOT, dirName);
    if (!fs.existsSync(target)) return;
    try {
      fs.rmSync(target, { recursive: true, force: true });
      console.log(`     → Cache purgé: ${dirName}`);
    } catch (error) {
      console.warn(`     ⚠️ Échec purge ${dirName}: ${error.message}`);
    }
  });
}

function runCommand(label, command, options = {}) {
  console.log(`     → ${label}`);
  try {
    execSync(command, {
      cwd: ROOT,
      stdio: 'inherit',
      ...options,
    });
    return { success: true };
  } catch (error) {
    console.error(`       ❌ ${label} échoué: ${error.message}`);
    return { success: false, error };
  }
}

function collectTodoList() {
  const auditState = loadStateFile('audit_state.json');
  if (!auditState || !Array.isArray(auditState.outstandingPrompts)) return [];
  return auditState.outstandingPrompts;
}

function reorganizeScripts() {
  const rootEntries = fs.readdirSync(ROOT, { withFileTypes: true });
  const misplaced = rootEntries
    .filter((entry) => entry.isFile() && entry.name.endsWith('.js'))
    .map((entry) => entry.name)
    .filter((name) => !['app.js', 'package.json'].includes(name));

  if (!misplaced.length) return { moved: [] };

  const toolsDir = path.join(ROOT, 'ultimate_system', 'scripts');
  ensureDir(toolsDir);

  const moved = [];
  misplaced.forEach((fileName) => {
    const origin = path.join(ROOT, fileName);
    const destination = path.join(toolsDir, fileName);
    try {
      fs.renameSync(origin, destination);
      moved.push({ origin: path.relative(ROOT, origin), destination: path.relative(ROOT, destination) });
    } catch (error) {
      console.warn(`     ⚠️ Impossible de déplacer ${fileName}: ${error.message}`);
    }
  });

  return { moved };
}

function main() {
  console.log('⚙️  Phase 4 • Publisher_CI.js – validation et publication CI');

  const todoList = collectTodoList();
  console.log(`   • TODO restants: ${todoList.length}`);

  console.log('   • Réorganisation des scripts racine…');
  const reorg = reorganizeScripts();
  console.log(`     → Scripts déplacés: ${reorg.moved.length}`);

  console.log('   • Purge des caches Homey…');
  purgeHomeyCaches();

  console.log('   • Validation Homey CLI…');
  const validation = runCommand('homey app validate --level publish', 'homey app validate --level publish');

  let gitPushStatus = null;
  let gitAttempts = 0;
  if (!validation.success) {
    console.log('   • Validation échouée – exécution du processus git correctif');
    const pullResult = runCommand('git pull --rebase', 'git pull --rebase');
    if (pullResult.success) {
      gitAttempts += 1;
      const pushResult = runCommand('git push', 'git push');
      gitAttempts += 1;
      gitPushStatus = pushResult.success ? 'success_after_pull' : 'failed_after_pull';
    } else {
      gitPushStatus = 'pull_failed';
    }
  } else {
    console.log('   • Validation réussie – tentative de git push standard');
    const pushResult = runCommand('git push', 'git push');
    gitAttempts += 1;
    gitPushStatus = pushResult.success ? 'success' : 'failed';
  }

  const driverCount = countDrivers();
  const manufacturerCount = collectManufacturers().size;

  const state = {
    generatedAt: new Date().toISOString(),
    metrics: {
      drivers: driverCount,
      manufacturers: manufacturerCount,
      todoRemaining: todoList.length,
      scriptsMoved: reorg.moved.length,
      validationSuccess: validation.success,
      gitPushStatus,
      gitAttempts,
    },
    reorg,
    todoList,
  };

  const stateFile = path.join(STATE_DIR, 'publisher_ci_state.json');
  writeJson(stateFile, state);

  console.log(`   • Drivers finaux: ${driverCount}`);
  console.log(`   • Fabricants finaux: ${manufacturerCount}`);
  console.log(`   • Validation Homey: ${validation.success ? 'OK' : 'ÉCHEC'}`);
  console.log(`   • Tentatives git: ${gitAttempts} (${gitPushStatus})`);
  console.log(`   • État écrit dans ${path.relative(ROOT, stateFile)}`);
  console.log('✅ Phase 4 terminée – cycle complet achevé');
}

if (require.main === module) {
  try {
    main();
  } catch (error) {
    console.error('❌ Échec de la phase Publisher_CI :', error);
    process.exitCode = 1;
  }
}

module.exports = {
  main,
};
