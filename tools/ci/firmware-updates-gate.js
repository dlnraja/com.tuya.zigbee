#!/usr/bin/env node
'use strict';

/**
 * firmware-updates-gate.js (P194 / P2359)
 *
 * Homey Device Updates (v13.2+): files[].name is a basename under
 * drivers/<id>/assets/firmware/<name>.
 *
 * Checks every firmwareUpdates / driver.firmware.compose.json entry:
 *   - file exists under assets/firmware/ (.bin or .zigbee)
 *   - sha256 + size match
 *   - OTA magic 0x0BEEF11E and header fields match
 *   - device.manufacturerName/productId ⊆ driver zigbee lists (sacred couple)
 *   - no leftover bins in the wrong place
 *   - plug/breaker images do not advertise button/curtain productIds
 *   - wakeInstruction present for sleepy OTA drivers (SSOT)
 *   - coverage vs SSOT expected drivers (--coverage)
 *
 * Usage: node tools/ci/firmware-updates-gate.js [--json] [--coverage]
 */

const fs = require('fs');
const path = require('path');
const crypto = require('crypto');

const ROOT = path.resolve(__dirname, '..', '..');
const DRIVERS = path.join(ROOT, 'drivers');
const SSOT_PATH = path.join(ROOT, 'config', 'architecture', 'homey-device-updates.json');
const JSON_MODE = process.argv.includes('--json');
const COVERAGE = process.argv.includes('--coverage') || JSON_MODE;
const OTA_MAGIC = 0x0BEEF11E;
const FW_EXT = /\.(bin|zigbee)$/i;

const BUTTON_PIDS = new Set(['TS0041', 'TS0042', 'TS0043', 'TS0044', 'TS004F', 'TS0215A']);
const COVER_PIDS = new Set(['TS130F']);
const errors = [];
const warnings = [];

function add(list, msg) { list.push(msg); }

function loadSsot() {
  try {
    return JSON.parse(fs.readFileSync(SSOT_PATH, 'utf8'));
  } catch {
    return { coveredDriversExpected: [], safety: { wakeInstructionRequiredFor: [] } };
  }
}

function listDrivers() {
  return fs.readdirSync(DRIVERS).filter((id) => {
    const dir = path.join(DRIVERS, id);
    return fs.statSync(dir).isDirectory() && !id.startsWith('.');
  });
}

function readJson(file) {
  try { return JSON.parse(fs.readFileSync(file, 'utf8')); } catch { return null; }
}

function otaPath(driverId, name) {
  return path.join(DRIVERS, driverId, 'assets', 'firmware', name);
}

function legacyPath(driverId, name) {
  return path.join(DRIVERS, driverId, name);
}

function parseHeader(buf) {
  if (!Buffer.isBuffer(buf) || buf.length < 56 || buf.readUInt32LE(0) !== OTA_MAGIC) return null;
  return {
    manufacturerCode: buf.readUInt16LE(10),
    imageType: buf.readUInt16LE(12),
    fileVersion: buf.readUInt32LE(14),
  };
}

function collectFirmwareMeta(driverId) {
  const compose = readJson(path.join(DRIVERS, driverId, 'driver.compose.json')) || {};
  const fwCompose = readJson(path.join(DRIVERS, driverId, 'driver.firmware.compose.json')) || {};
  const updates = []
    .concat((compose.firmwareUpdates && compose.firmwareUpdates.updates) || [])
    .concat(fwCompose.updates || []);
  const wakeInstruction = fwCompose.wakeInstruction
    || compose.firmwareUpdates?.wakeInstruction
    || null;
  return { compose, fwCompose, updates, wakeInstruction };
}

function main() {
  const ssot = loadSsot();
  const drivers = listDrivers();
  const claimedBins = new Set();
  const covered = [];
  const updateCount = { drivers: 0, updates: 0, files: 0 };

  for (const driverId of drivers) {
    const { compose, fwCompose, updates, wakeInstruction } = collectFirmwareMeta(driverId);
    if (!updates.length) continue;
    covered.push(driverId);
    updateCount.drivers += 1;
    updateCount.updates += updates.length;

    const mfrsLc = new Set(((compose.zigbee && compose.zigbee.manufacturerName) || []).map((m) => String(m).toLowerCase()));
    const pids = new Set((compose.zigbee && compose.zigbee.productId) || []);

    const wakeNeed = (ssot.safety?.wakeInstructionRequiredFor || []).includes(driverId);
    if (wakeNeed && !(wakeInstruction && (wakeInstruction.en || typeof wakeInstruction === 'string'))) {
      add(errors, `${driverId}: sleepy OTA driver missing wakeInstruction (Homey Device Updates)`);
    }
    // Homey schema: firmwareUpdates requires updates[] — never wake-only
    if ((compose.firmwareUpdates || fwCompose)
      && !updates.length
      && (wakeInstruction || compose.firmwareUpdates || Object.keys(fwCompose || {}).length)) {
      add(errors, `${driverId}: firmwareUpdates/wake without updates[] (Homey schema)`);
    }

    for (const update of updates) {
      const device = update.device || {};
      const mfrList = [].concat(device.manufacturerName || []);
      const pidList = [].concat(device.productId || []);
      if (!mfrList.length) add(errors, `${driverId}: OTA update missing device.manufacturerName`);
      if (!pidList.length) add(errors, `${driverId}: OTA update missing device.productId (sacred couple)`);

      for (const m of mfrList) {
        if (!mfrsLc.has(String(m).toLowerCase())) add(errors, `${driverId}: OTA mfr ${m} not in driver zigbee.manufacturerName`);
      }
      for (const p of pidList) {
        if (!pids.has(p)) add(errors, `${driverId}: OTA productId ${p} not in driver zigbee.productId`);
      }

      if (!update.changelog || !(update.changelog.en || typeof update.changelog === 'string')) {
        add(errors, `${driverId}: OTA update missing changelog.en`);
      }

      const fileName = ((update.files || [])[0] || {}).name;
      const imageHint = String(fileName || '').toLowerCase();
      const advertised = new Set(pidList);
      if (/plug|breaker/.test(imageHint)) {
        const bad = [...advertised].filter((p) => BUTTON_PIDS.has(p) || COVER_PIDS.has(p));
        if (bad.length) add(errors, `${driverId}: plug/breaker image advertises ${bad.join(',')} (brick risk)`);
      }

      for (const f of update.files || []) {
        updateCount.files += 1;
        const dest = otaPath(driverId, f.name);
        const legacy = legacyPath(driverId, f.name);
        claimedBins.add(path.normalize(dest));
        if (!fs.existsSync(dest)) {
          if (fs.existsSync(legacy)) {
            add(errors, `${driverId}: ${f.name} is in the driver root; Homey looks in assets/firmware/`);
          } else {
            add(errors, `${driverId}: missing assets/firmware/${f.name}`);
          }
          continue;
        }
        const buf = fs.readFileSync(dest);
        const sha = crypto.createHash('sha256').update(buf).digest('hex');
        if (f.integrity !== `sha256:${sha}`) add(errors, `${driverId}: ${f.name} sha256 mismatch`);
        if (Number(f.size) !== buf.length) add(errors, `${driverId}: ${f.name} size ${buf.length} != ${f.size}`);
        const header = parseHeader(buf);
        if (!header) add(errors, `${driverId}: ${f.name} missing OTA magic 0x0BEEF11E`);
        else {
          if (header.manufacturerCode !== f.manufacturerCode) add(errors, `${driverId}: header mfr ${header.manufacturerCode} != ${f.manufacturerCode}`);
          if (header.imageType !== f.imageType) add(errors, `${driverId}: header imageType ${header.imageType} != ${f.imageType}`);
          if (header.fileVersion !== f.fileVersion) add(errors, `${driverId}: header fileVersion ${header.fileVersion} != ${f.fileVersion}`);
        }
      }
    }
  }

  for (const driverId of drivers) {
    for (const rel of ['assets/firmware', '.']) {
      const dir = path.join(DRIVERS, driverId, rel);
      if (!fs.existsSync(dir)) continue;
      for (const name of fs.readdirSync(dir)) {
        if (!FW_EXT.test(name)) continue;
        const full = path.normalize(path.join(dir, name));
        if (rel === '.' && !claimedBins.has(path.normalize(otaPath(driverId, name)))) {
          add(warnings, `${driverId}: orphan OTA file at driver root (${name})`);
        }
        if (rel === 'assets/firmware' && !claimedBins.has(full)) {
          add(warnings, `${driverId}: orphan OTA file in assets/firmware (${name})`);
        }
      }
    }
  }

  const expected = ssot.coveredDriversExpected || [];
  const missingExpected = expected.filter((id) => !covered.includes(id));
  for (const id of missingExpected) {
    add(warnings, `SSOT expected OTA driver missing coverage: ${id}`);
  }

  const report = {
    timestamp: new Date().toISOString(),
    patch: 'P2359',
    news: ssot._meta?.news || 'https://homey.app/en-fr/news/introducing-device-updates/',
    errors: errors.length,
    warnings: warnings.length,
    errorDetails: errors,
    warningDetails: warnings,
    coverage: {
      driversWithOta: covered.sort(),
      updateCount,
      expectedMissing: missingExpected,
      expectedHit: expected.filter((id) => covered.includes(id)),
      expectedTotal: expected.length,
      coveragePct: expected.length
        ? Math.round((expected.filter((id) => covered.includes(id)).length / expected.length) * 100)
        : 100,
    },
  };

  const stateDir = path.join(ROOT, '.github', 'state');
  try {
    fs.mkdirSync(stateDir, { recursive: true });
    fs.writeFileSync(path.join(stateDir, 'firmware-updates-gate.json'), `${JSON.stringify(report, null, 2)}\n`);
  } catch { /* ignore */ }

  if (JSON_MODE) console.log(JSON.stringify(report, null, 2));
  else {
    console.log('═══════════════════════════════════════════════');
    console.log('  Firmware / Device Updates gate (P194/P2359)');
    console.log('═══════════════════════════════════════════════');
    if (COVERAGE) {
      console.log(`  Coverage: ${report.coverage.coveragePct}% SSOT (${report.coverage.expectedHit.length}/${report.coverage.expectedTotal})`);
      console.log(`  Drivers with OTA: ${covered.length} | updates: ${updateCount.updates} | files: ${updateCount.files}`);
    }
    for (const w of warnings) console.log(`  ~ ${w}`);
    if (errors.length) {
      for (const e of errors) console.log(`  ❌ ${e}`);
      console.log(`\nFAILED: ${errors.length}`);
    } else console.log('  ✅ firmwareUpdates paths, headers, wakeInstruction OK');
  }
  if (errors.length) process.exit(1);
}

main();
