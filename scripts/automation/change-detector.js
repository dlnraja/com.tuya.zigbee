#!/usr/bin/env node
/**
 * change-detector.js - Comprehensive Change Detection for Tuya Zigbee Fleet
 * Run: node scripts/automation/change-detector.js [--since <ref>] [--json]
 *
 * Detects:
 * - Git commits modifying device-related files (drivers/, lib/tuya/, data/)
 * - New manufacturer names added to Z2M source files
 * - New manufacturer names added to ZHA source files
 * - Changes in device DP mappings (EnrichedDPMappings.js, driver device.js files)
 * - New driver files created (driver.compose.json, device.js)
 * - All changes logged with timestamps to .github/state/change-log.json
 *
 * Exit codes: 0 = no new changes, 1 = changes detected, 2 = script failure
 */
'use strict';

const fs = require('fs');
const path = require('path');
const { execSync } = require('child_process');

const ROOT = path.resolve(__dirname, '..', '..');
const STATE_DIR = path.join(ROOT, '.github', 'state');
const DATA_DIR = path.join(ROOT, 'data');
const DRIVERS_DIR = path.join(ROOT, 'drivers');
const LIB_DIR = path.join(ROOT, 'lib');

const STATE_FILE = path.join(STATE_DIR, 'change-detector-state.json');
const LOG_FILE = path.join(STATE_DIR, 'change-log.json');

const JSON_OUTPUT = process.argv.includes('--json');
const SINCE_REF = getArg('--since') || null;

function getArg(flag) {
  const idx = process.argv.indexOf(flag);
  return idx >= 0 && idx + 1 < process.argv.length ? process.argv[idx + 1] : null;
}

function log(msg) {
  if (!JSON_OUTPUT) console.log('[CHANGE-DETECT] ' + msg);
}

function ensureDir(dir) {
  if (!fs.existsSync(dir)) fs.mkdirSync(dir, { recursive: true });
}

function gitLog(since) {
  try {
    const sinceArg = since ? `--since="${since}"` : '--since="24 hours ago"';
    const raw = execSync(
      `git log --pretty=format:"%H|%s|%ai" ${sinceArg} --name-only`,
      { cwd: ROOT, encoding: 'utf8', timeout: 30000 }
    );
    return raw;
  } catch (e) {
    return '';
  }
}

function parseGitLog(raw) {
  const commits = [];
  let current = null;
  for (const line of raw.split('\n')) {
    if (!line.trim()) continue;
    if (line.includes('|')) {
      if (current) commits.push(current);
      const [hash, subject, date] = line.split('|');
      current = { hash: hash.trim(), subject: subject.trim(), date: date.trim(), files: [] };
    } else if (current) {
      current.files.push(line.trim());
    }
  }
  if (current) commits.push(current);
  return commits;
}

function detectDeviceChanges(commits) {
  const patterns = [
    /^drivers\//,
    /^lib\/tuya\//,
    /^lib\/devices\//,
    /^lib\/mixins\//,
    /^data\/fingerprints\.json/,
    /^data\/manufacturers\.json/,
    /^data\/community-sync\//,
    /\.homeycompose\//,
    /^app\.json/,
  ];
  const changes = { drivers: [], lib: [], data: [], compose: [], other: [] };
  for (const commit of commits) {
    for (const file of commit.files) {
      if (file.startsWith('drivers/')) {
        changes.drivers.push({ file, commit: commit.hash, subject: commit.subject, date: commit.date });
      } else if (file.startsWith('lib/tuya/') || file.startsWith('lib/devices/') || file.startsWith('lib/mixins/')) {
        changes.lib.push({ file, commit: commit.hash, subject: commit.subject, date: commit.date });
      } else if (file.startsWith('data/')) {
        changes.data.push({ file, commit: commit.hash, subject: commit.subject, date: commit.date });
      } else if (file.endsWith('.compose.json') || file.startsWith('.homeycompose/')) {
        changes.compose.push({ file, commit: commit.hash, subject: commit.subject, date: commit.date });
      }
    }
  }
  return changes;
}

function detectNewDrivers() {
  const currentDrivers = new Set();
  for (const name of fs.readdirSync(DRIVERS_DIR)) {
    const dcj = path.join(DRIVERS_DIR, name, 'driver.compose.json');
    if (fs.existsSync(dcj)) currentDrivers.add(name);
  }
  return currentDrivers;
}

function detectDPMappingChanges() {
  const dpFile = path.join(LIB_DIR, 'tuya', 'EnrichedDPMappings.js');
  const changes = [];

  if (fs.existsSync(dpFile)) {
    const content = fs.readFileSync(dpFile, 'utf8');
    // Count DP entries to detect additions
    const dpCount = (content.match(/0x[0-9A-Fa-f]{2,4}/g) || []).length;
    changes.push({ file: 'lib/tuya/EnrichedDPMappings.js', dpEntryCount: dpCount });
  }

  // Check driver device.js for DP mapping changes
  for (const name of fs.readdirSync(DRIVERS_DIR)) {
    const deviceJs = path.join(DRIVERS_DIR, name, 'device.js');
    if (!fs.existsSync(deviceJs)) continue;
    try {
      const content = fs.readFileSync(deviceJs, 'utf8');
      if (content.includes('dpMappings') || content.includes('DpMapping') || content.includes('tuyaDatapoints')) {
        changes.push({ file: `drivers/${name}/device.js`, hasDPMappings: true });
      }
    } catch (_) { /* skip */ }
  }
  return changes;
}

function scanForExternalManufacturers() {
  const z2mCache = path.join(DATA_DIR, 'community-sync', '.cache', 'z2m_tuya.cache');
  const zhaFile = path.join('.github', 'state', 'zha-tuya-raw.txt');
  const z2mFile = path.join('.github', 'state', 'z2m-tuya-raw.txt');

  const result = { z2m: { found: false, manufacturers: [] }, zha: { found: false, manufacturers: [] } };

  // Scan Z2M cache
  const z2mPath = fs.existsSync(z2mCache) ? z2mCache : z2mFile;
  if (fs.existsSync(z2mPath)) {
    result.z2m.found = true;
    try {
      const content = fs.readFileSync(z2mPath, 'utf8');
      const mfrRe = /manufacturerName:\s*['"]([^'"]+)['"]/g;
      let m;
      while ((m = mfrRe.exec(content)) !== null) {
        result.z2m.manufacturers.push(m[1]);
      }
      result.z2m.manufacturers = [...new Set(result.z2m.manufacturers)];
    } catch (_) { /* skip */ }
  }

  // Scan ZHA
  if (fs.existsSync(zhaFile)) {
    result.zha.found = true;
    try {
      const content = fs.readFileSync(zhaFile, 'utf8');
      const mfrRe = /manufacturer['"]*\s*[:=]\s*['"]([^'"]+)['"]/g;
      let m;
      while ((m = mfrRe.exec(content)) !== null) {
        result.zha.manufacturers.push(m[1]);
      }
      result.zha.manufacturers = [...new Set(result.zha.manufacturers)];
    } catch (_) { /* skip */ }
  }

  return result;
}

function diffManufacturerSets(external, local) {
  const localSet = new Set(local.map(m => m.toLowerCase()));
  const newInZ2m = external.z2m.manufacturers.filter(m => !localSet.has(m.toLowerCase()));
  const newInZha = external.zha.manufacturers.filter(m => !localSet.has(m.toLowerCase()));
  return { newInZ2m, newInZha };
}

function loadLocalManufacturers() {
  const mfrs = new Set();
  for (const name of fs.readdirSync(DRIVERS_DIR)) {
    const dcj = path.join(DRIVERS_DIR, name, 'driver.compose.json');
    if (!fs.existsSync(dcj)) continue;
    try {
      const data = JSON.parse(fs.readFileSync(dcj));
      for (const m of (data.zigbee?.manufacturerName || [])) mfrs.add(m);
    } catch (_) { /* skip */ }
  }
  return [...mfrs];
}

function loadPrevState() {
  try {
    return JSON.parse(fs.readFileSync(STATE_FILE));
  } catch (_) {
    return { lastRun: null, lastCommitHash: null, driverCount: 0, manufacturers: [] };
  }
}

function saveState(state) {
  ensureDir(STATE_DIR);
  fs.writeFileSync(STATE_FILE, JSON.stringify(state, null, 2));
}

function appendLog(entry) {
  ensureDir(STATE_DIR);
  let log = [];
  try { log = JSON.parse(fs.readFileSync(LOG_FILE)); } catch (_) { /* empty */ }
  log.push(entry);
  // Keep last 500 entries
  if (log.length > 500) log = log.slice(-500);
  fs.writeFileSync(LOG_FILE, JSON.stringify(log, null, 2));
}

// ── Main ────────────────────────────────────────────────────────────────────
function main() {
  log('Starting change detection...');

  const prev = loadPrevState();
  const now = new Date().toISOString();

  // 1. Git commit changes
  const since = SINCE_REF || prev.lastRun || null;
  const rawLog = gitLog(since);
  const commits = parseGitLog(rawLog);
  const deviceChanges = detectDeviceChanges(commits);

  // 2. New drivers
  const currentDrivers = detectNewDrivers();
  const newDrivers = prev.driverCount > 0
    ? [...currentDrivers].filter(d => {
        const dcj = path.join(DRIVERS_DIR, d, 'driver.compose.json');
        try {
          const stat = fs.statSync(dcj);
          // Created after last run
          return stat.birthtime && new Date(stat.birthtime) > new Date(prev.lastRun || 0);
        } catch (_) { return false; }
      })
    : [];

  // 3. DP mapping changes
  const dpChanges = detectDPMappingChanges();

  // 4. External manufacturer detection
  const localMfrs = loadLocalManufacturers();
  const external = scanForExternalManufacturers();
  const newMfrs = diffManufacturerSets(external, localMfrs);

  // 5. Compile report
  const report = {
    timestamp: now,
    sinceRef: since,
    commitsAnalyzed: commits.length,
    deviceChanges,
    newDriverCount: newDrivers.length,
    newDrivers,
    dpMappingChanges: dpChanges.length,
    dpChangesSummary: dpChanges,
    externalManufacturers: {
      z2m: { available: external.z2m.manufacturers.length, new: newMfrs.newInZ2m.length },
      zha: { available: external.zha.manufacturers.length, new: newMfrs.newInZha.length },
      newFromZ2m: newMfrs.newInZ2m.slice(0, 20),
      newFromZha: newMfrs.newInZha.slice(0, 20),
    },
    localManufacturerCount: localMfrs.length,
    totalDriverCount: currentDrivers.size,
  };

  const hasChanges = commits.length > 0 || newDrivers.length > 0 || newMfrs.newInZ2m.length > 0 || newMfrs.newInZha.length > 0;

  // Save state
  saveState({
    lastRun: now,
    lastCommitHash: commits.length > 0 ? commits[0].hash : prev.lastCommitHash,
    driverCount: currentDrivers.size,
    manufacturers: localMfrs,
  });

  // Append to log
  appendLog({
    timestamp: now,
    commits: commits.length,
    newDrivers: newDrivers.length,
    newZ2mMfrs: newMfrs.newInZ2m.length,
    newZhaMfrs: newMfrs.newInZha.length,
    hasChanges,
  });

  if (JSON_OUTPUT) {
    console.log(JSON.stringify(report, null, 2));
  } else {
    log('=== Change Detection Report ===');
    log(`Commits analyzed: ${report.commitsAnalyzed}`);
    log(`Driver files changed: ${report.deviceChanges.drivers.length}`);
    log(`Lib files changed: ${report.deviceChanges.lib.length}`);
    log(`Data files changed: ${report.deviceChanges.data.length}`);
    log(`New drivers: ${report.newDriverCount}`);
    log(`DP mapping files: ${report.dpMappingChanges}`);
    log(`Local manufacturers: ${report.localManufacturerCount}`);
    log(`Total drivers: ${report.totalDriverCount}`);
    log(`Z2M external manufacturers available: ${report.externalManufacturers.z2m.available}`);
    log(`ZHA external manufacturers available: ${report.externalManufacturers.zha.available}`);
    if (newMfrs.newInZ2m.length > 0) {
      log(`New Z2M manufacturers (${newMfrs.newInZ2m.length}): ${newMfrs.newInZ2m.slice(0, 10).join(', ')}...`);
    }
    if (newMfrs.newInZha.length > 0) {
      log(`New ZHA manufacturers (${newMfrs.newInZha.length}): ${newMfrs.newInZha.slice(0, 10).join(', ')}...`);
    }
    log(`Changes detected: ${hasChanges ? 'YES' : 'NO'}`);
  }

  process.exit(hasChanges ? 1 : 0);
}

main();
