#!/usr/bin/env node
/**
 * Intelligent Version Scanner
 * Scans git history to extract all manufacturerNames ever used
 * and intelligently enriches the current project
 */

const { execSync } = require('child_process');
const fs = require('fs');
const path = require('path');

const DRIVERS_PATH = path.join(__dirname, '..', 'drivers');

// Get current manufacturerNames
function getCurrentManufacturers() {
  const mfrs = new Set();
  const drivers = fs.readdirSync(DRIVERS_PATH);

  for (const driver of drivers) {
    const composePath = path.join(DRIVERS_PATH, driver, 'driver.compose.json');
    if (fs.existsSync(composePath)) {
      try {
        const compose = JSON.parse(fs.readFileSync(composePath, 'utf8'));
        (compose.zigbee?.manufacturerName || []).forEach(m => mfrs.add(m));
      } catch (e) { }
    }
  }
  return mfrs;
}

// Get git commits with driver changes
function getDriverCommits(limit = 100) {
  try {
    const output = execSync(
      `git log --oneline --all -${limit} -- drivers/`,
      { encoding: 'utf8', cwd: path.join(__dirname, '..') }
    );
    return output.trim().split('\n').filter(l => l).map(l => l.split(' ')[0]);
  } catch (e) {
    console.error('Error getting commits:', e.message);
    return [];
  }
}

// Extract manufacturerNames from a specific commit
function extractFromCommit(commitHash) {
  const mfrs = new Set();

  try {
    // Get list of driver.compose.json files at that commit
    const files = execSync(
      `git ls-tree -r --name-only ${commitHash} -- drivers/`,
      { encoding: 'utf8', cwd: path.join(__dirname, '..') }
    ).trim().split('\n').filter(f => f.endsWith('driver.compose.json'));

    for (const file of files) {
      try {
        const content = execSync(
          `git show ${commitHash}:${file}`,
          { encoding: 'utf8', cwd: path.join(__dirname, '..') }
        );
        const compose = JSON.parse(content);
        (compose.zigbee?.manufacturerName || []).forEach(m => mfrs.add(m));
      } catch (e) { }
    }
  } catch (e) { }

  return mfrs;
}

// Determine best driver for a manufacturerName
function findBestDriver(mfr, driverMfrMap) {
  // Check if it matches a pattern from existing drivers
  for (const [driver, existingMfrs] of Object.entries(driverMfrMap)) {
    // Check prefix similarity
    const prefix = mfr.substring(0, 7);
    const matchCount = existingMfrs.filter(m => m.startsWith(prefix)).length;
    if (matchCount >= 3) return driver;
  }

  // Fallback based on prefix patterns
  if (mfr.includes('_TZE200_') || mfr.includes('_TZE204_')) {
    if (mfr.includes('trv') || mfr.includes('valve')) return 'radiator_valve';
    return null; // TS0601 devices need manual mapping
  }

  return null;
}

// Build driver -> manufacturerNames map
function buildDriverMap() {
  const map = {};
  const drivers = fs.readdirSync(DRIVERS_PATH);

  for (const driver of drivers) {
    const composePath = path.join(DRIVERS_PATH, driver, 'driver.compose.json');
    if (fs.existsSync(composePath)) {
      try {
        const compose = JSON.parse(fs.readFileSync(composePath, 'utf8'));
        map[driver] = compose.zigbee?.manufacturerName || [];
      } catch (e) { }
    }
  }
  return map;
}

// Add manufacturerName to driver
function addToDriver(driverName, mfr) {
  const composePath = path.join(DRIVERS_PATH, driverName, 'driver.compose.json');
  if (!fs.existsSync(composePath)) return false;

  try {
    const compose = JSON.parse(fs.readFileSync(composePath, 'utf8'));
    if (!compose.zigbee?.manufacturerName) return false;
    if (compose.zigbee.manufacturerName.includes(mfr)) return false;

    compose.zigbee.manufacturerName.push(mfr);
    fs.writeFileSync(composePath, JSON.stringify(compose, null, 2));
    return true;
  } catch (e) {
    return false;
  }
}

// Main function
async function main() {
  console.log('🔍 Intelligent Version Scanner\n');
  console.log('='.repeat(60));

  const currentMfrs = getCurrentManufacturers();
  console.log(`\n📦 Current: ${currentMfrs.size} manufacturerNames`);

  console.log('\n📜 Scanning git history...');
  const commits = getDriverCommits(50);
  console.log(`   Found ${commits.length} commits with driver changes`);

  const historicalMfrs = new Set();
  let scanned = 0;

  for (const commit of commits.slice(0, 30)) {
    const mfrs = extractFromCommit(commit);
    mfrs.forEach(m => historicalMfrs.add(m));
    scanned++;
    if (scanned % 10 === 0) {
      console.log(`   Scanned ${scanned} commits, found ${historicalMfrs.size} unique mfrs`);
    }
  }

  console.log(`\n📊 Historical: ${historicalMfrs.size} manufacturerNames total`);

  // Find lost manufacturerNames
  const lost = [...historicalMfrs].filter(m => !currentMfrs.has(m));
  console.log(`\n⚠️  Lost manufacturerNames: ${lost.length}`);

  if (lost.length > 0) {
    const driverMap = buildDriverMap();
    let restored = 0;
    const restorations = {};

    for (const mfr of lost) {
      const driver = findBestDriver(mfr, driverMap);
      if (driver && addToDriver(driver, mfr)) {
        restored++;
        if (!restorations[driver]) restorations[driver] = [];
        restorations[driver].push(mfr);
        console.log(`   ✅ Restored ${mfr} to ${driver}`);
      }
    }

    console.log('\n' + '='.repeat(60));
    console.log(`\n✅ Restored ${restored} manufacturerNames from history`);

    if (Object.keys(restorations).length > 0) {
      console.log('\n📊 By driver:');
      for (const [driver, mfrs] of Object.entries(restorations)) {
        console.log(`   ${driver}: +${mfrs.length}`);
      }
    }

    // Save report
    const report = {
      timestamp: new Date().toISOString(),
      currentCount: currentMfrs.size,
      historicalCount: historicalMfrs.size,
      lostCount: lost.length,
      restoredCount: restored,
      lost: lost.sort(),
      restorations
    };

    const reportPath = path.join(__dirname, 'version-scan-report.json');
    fs.writeFileSync(reportPath, JSON.stringify(report, null, 2));
    console.log(`\n📄 Report: ${reportPath}`);
  }
}

main().catch(console.error);
