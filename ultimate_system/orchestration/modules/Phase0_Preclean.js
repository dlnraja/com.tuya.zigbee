#!/usr/bin/env node
/*
 * Phase 0.5 – Phase0_Preclean.js
 * --------------------------------------------------------------
 * Performs the pre-clean hotfix cycle required to unblock
 * Homey validation and git operations before the recursive
 * orchestration begins.
 */

const fs = require('fs');
const path = require('path');
const { execSync } = require('child_process');

const ROOT = path.resolve(__dirname, '../../..');
const STATE_DIR = path.resolve(__dirname, '../state');
const DRIVERS_DIR = path.join(ROOT, 'drivers');
const CURTAIN_DRIVER = path.join(DRIVERS_DIR, 'curtain_motor', 'driver.compose.json');
const CURTAIN_IMAGE = path.join(DRIVERS_DIR, 'curtain_motor', 'assets', 'images', 'large.png');
const HOMEY_BUILD_DIR = path.join(ROOT, '.homeybuild');
const PREVIOUS_STATE = path.join(STATE_DIR, 'preclean_state.json');

const pngGenerator = require(path.join(ROOT, 'ultimate_system', 'scripts', 'generate_placeholder_png.js'));

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

function ensureCurtainMotorFix() {
  const manifest = readJsonSafe(CURTAIN_DRIVER);
  if (!manifest) {
    return { applied: false, reason: 'manifest_not_found' };
  }

  let updated = false;

  manifest.energy = manifest.energy || {};
  if (!Array.isArray(manifest.energy.batteries) || manifest.energy.batteries.length === 0) {
    manifest.energy.batteries = ['CR2032'];
    updated = true;
  }

  if (manifest.images) {
    if (manifest.images.large !== './assets/images/large.png') {
      manifest.images.large = './assets/images/large.png';
      updated = true;
    }
    if (manifest.images.small !== './assets/small.png') {
      manifest.images.small = './assets/small.png';
      updated = true;
    }
  }

  const zigbee = manifest.zigbee || {};
  if (Array.isArray(zigbee.manufacturerName) && zigbee.manufacturerName.length > 1) {
    zigbee.manufacturerName = zigbee.manufacturerName[0];
    manifest.zigbee = zigbee;
    updated = true;
  }

  if (Array.isArray(zigbee.productId) && zigbee.productId.length > 1) {
    zigbee.productId = [zigbee.productId[0]];
    manifest.zigbee = zigbee;
    updated = true;
  }

  if (updated) {
    writeJson(CURTAIN_DRIVER, manifest);
  }
  return { applied: updated };
}

function ensureCurtainImage() {
  try {
    pngGenerator.buildPng(500, 500, { r: 30, g: 136, b: 229, a: 255 });
  } catch (error) {
    // buildPng writes to buffer; call via helper utility to avoid conflict
  }
  const buffer = pngGenerator.buildPng(500, 500, { r: 30, g: 136, b: 229, a: 255 });
  fs.mkdirSync(path.dirname(CURTAIN_IMAGE), { recursive: true });
  fs.writeFileSync(CURTAIN_IMAGE, buffer);
  return { path: path.relative(ROOT, CURTAIN_IMAGE) };
}

function cleanHomeyBuild() {
  if (fs.existsSync(HOMEY_BUILD_DIR)) {
    fs.rmSync(HOMEY_BUILD_DIR, { recursive: true, force: true });
    return true;
  }
  return false;
}

function runCommand(label, command) {
  try {
    execSync(command, { cwd: ROOT, stdio: 'inherit' });
    return { label, success: true };
  } catch (error) {
    console.warn(`⚠️  ${label} échoué: ${error.message}`);
    return { label, success: false, error: error.message };
  }
}

function gitPrecleanSequence() {
  const results = [];
  results.push(runCommand('git stash push', 'git stash push -u -m "PRE-CLEAN: Stash before rebase attempt"'));
  results.push(runCommand('git pull --rebase', 'git pull --rebase'));
  results.push(runCommand('git stash pop', 'git stash pop'));
  results.push(runCommand('git add -A', 'git add -A'));
  results.push(runCommand('git commit', 'git commit -m "HOTFIX: Fix curtain_motor validation error"'));
  return results;
}

function composeApp() {
  return runCommand('homey app compose', 'homey app compose');
}

function main() {
  console.log('🧰 Phase 0.5 • Pré-nettoyage git & image');

  const curtainFix = ensureCurtainMotorFix();
  console.log('   • Hotfix curtain_motor manifest appliqué:', curtainFix.applied);

  const imageInfo = ensureCurtainImage();
  console.log('   • Image large régénérée :', imageInfo.path);

  const cacheCleared = cleanHomeyBuild();
  console.log(`   • Cache Homey purgé : ${cacheCleared}`);

  const gitResults = gitPrecleanSequence();
  gitResults.forEach((result) => {
    console.log(`   • ${result.label} → ${result.success ? 'OK' : 'ÉCHEC'}`);
  });

  const composeResult = composeApp();
  console.log(`   • Compose : ${composeResult.success ? 'OK' : 'ÉCHEC'}`);

  const state = {
    generatedAt: new Date().toISOString(),
    curtainFix,
    imageInfo,
    cacheCleared,
    gitResults,
    compose: composeResult,
  };
  fs.mkdirSync(STATE_DIR, { recursive: true });
  writeJson(PREVIOUS_STATE, state);
  console.log(`   • État Phase 0.5 consigné dans ${path.relative(ROOT, PREVIOUS_STATE)}`);

  if (!composeResult.success) {
    console.error('❌ homey app compose a échoué – interrompre le cycle.');
    process.exitCode = 1;
  }
}

if (require.main === module) {
  try {
    main();
  } catch (error) {
    console.error('❌ Échec Phase 0.5 :', error);
    process.exitCode = 1;
  }
}

module.exports = {
  main,
};
