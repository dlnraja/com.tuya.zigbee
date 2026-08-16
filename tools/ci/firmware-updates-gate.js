#!/usr/bin/env node
'use strict';

/**
 * firmware-updates-gate.js (P194)
 *
 * Homey v13.2+ native OTA: files[].name is a basename; Homey resolves
 * drivers/<id>/assets/firmware/<name>. The generator used to drop bins in
 * the driver root, which is how wall_curtain_switch failed Homey Validate.
 *
 * Checks every firmwareUpdates / driver.firmware.compose.json entry:
 *   - file exists under assets/firmware/
 *   - sha256 + size match
 *   - OTA magic 0x0BEEF11E and header fields match
 *   - device.manufacturerName/productId ⊆ driver zigbee lists
 *   - no leftover bins in the wrong driver
 *   - plug/breaker images do not advertise button/curtain productIds
 *
 * Usage: node tools/ci/firmware-updates-gate.js [--json]
 */

const fs = require('fs');
const path = require('path');
const crypto = require('crypto');

const ROOT = path.resolve(__dirname, '..', '..');
const DRIVERS = path.join(ROOT, 'drivers');
const JSON_MODE = process.argv.includes('--json');
const OTA_MAGIC = 0x0BEEF11E;

const BUTTON_PIDS = new Set(['TS0041', 'TS0042', 'TS0043', 'TS0044', 'TS004F', 'TS0215A']);
const COVER_PIDS = new Set(['TS130F']);
const errors = [];
const warnings = [];

function add(list, msg) { list.push(msg); }

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

function collectUpdates(driverId) {
  const updates = [];
  const compose = readJson(path.join(DRIVERS, driverId, 'driver.compose.json'));
  const fwCompose = readJson(path.join(DRIVERS, driverId, 'driver.firmware.compose.json'));
  for (const src of [compose, fwCompose]) {
    for (const u of (src && src.firmwareUpdates && src.firmwareUpdates.updates) || (src && src.updates) || []) {
      updates.push({ compose, update: u });
    }
  }
  return updates;
}

function main() {
  const drivers = listDrivers();
  const claimedBins = new Set();

  for (const driverId of drivers) {
    const updates = collectUpdates(driverId);
    if (!updates.length) continue;
    const compose = readJson(path.join(DRIVERS, driverId, 'driver.compose.json')) || {};
    const mfrs = new Set((compose.zigbee && compose.zigbee.manufacturerName) || []);
    const pids = new Set((compose.zigbee && compose.zigbee.productId) || []);

    for (const { update } of updates) {
      const device = update.device || {};
      for (const m of [].concat(device.manufacturerName || [])) {
        if (!mfrs.has(m)) add(errors, `${driverId}: OTA mfr ${m} not in driver zigbee.manufacturerName`);
      }
      for (const p of [].concat(device.productId || [])) {
        if (!pids.has(p)) add(errors, `${driverId}: OTA productId ${p} not in driver zigbee.productId`);
      }

      const fileName = ((update.files || [])[0] || {}).name;
      const imageHint = String(fileName || '').toLowerCase();
      const advertised = new Set([].concat(device.productId || []));
      if (/plug|breaker/.test(imageHint)) {
        const bad = [...advertised].filter((p) => BUTTON_PIDS.has(p) || COVER_PIDS.has(p));
        if (bad.length) add(errors, `${driverId}: plug/breaker image advertises ${bad.join(',')} (brick risk)`);
      }

      for (const f of update.files || []) {
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
        if (!name.toLowerCase().endsWith('.bin')) continue;
        const full = path.normalize(path.join(dir, name));
        if (rel === '.' && !claimedBins.has(path.normalize(otaPath(driverId, name)))) {
          add(warnings, `${driverId}: orphan OTA bin at driver root (${name})`);
        }
        if (rel === 'assets/firmware' && !claimedBins.has(full)) {
          add(warnings, `${driverId}: orphan OTA bin in assets/firmware (${name})`);
        }
      }
    }
  }

  const report = {
    timestamp: new Date().toISOString(),
    errors: errors.length,
    warnings: warnings.length,
    errorDetails: errors,
    warningDetails: warnings,
  };

  if (JSON_MODE) console.log(JSON.stringify(report, null, 2));
  else {
    console.log('═══════════════════════════════════════════════');
    console.log('  Firmware / OTA gate (P194)');
    console.log('═══════════════════════════════════════════════');
    for (const w of warnings) console.log(`  ~ ${w}`);
    if (errors.length) {
      for (const e of errors) console.log(`  ❌ ${e}`);
      console.log(`\nFAILED: ${errors.length}`);
    } else console.log('  ✅ firmwareUpdates paths and headers OK');
  }
  if (errors.length) process.exit(1);
}

main();
