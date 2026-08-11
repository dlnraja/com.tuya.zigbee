#!/usr/bin/env node
'use strict';

/**
 * bare-zigbee-device-gate.js
 *
 * P102 Phase 3: Fail CI if a driver still extends bare ZigBeeDevice outside
 * known exceptions / allowlist (hybrid leftovers pending migration).
 *
 * Built-in exceptions (never require allowlist entry):
 *   - wifi_*
 *   - virtual_*
 *   - generic_diy
 *   - diy_custom_zigbee
 *
 * Usage:
 *   node tools/ci/bare-zigbee-device-gate.js
 *   node tools/ci/bare-zigbee-device-gate.js --report
 *   node tools/ci/bare-zigbee-device-gate.js --json
 *   node tools/ci/bare-zigbee-device-gate.js --root C:/path/to/repo
 *
 * Exit 0 = clean (no NEW bare drivers outside allowlist)
 * Exit 1 = one or more bare ZigBeeDevice drivers outside allowlist
 */

const fs = require('fs');
const path = require('path');

const args = process.argv.slice(2);
let ROOT = path.join(__dirname, '..', '..');
const REPORT = args.includes('--report');
const JSON_MODE = args.includes('--json');
for (let i = 0; i < args.length; i++) {
  if (args[i] === '--root') ROOT = path.resolve(args[++i]);
}

const ALLOWLIST_PATH = path.join(__dirname, 'bare-zigbee-allowlist.json');
const FIXED_EXCEPTIONS = new Set(['generic_diy', 'diy_custom_zigbee']);

function isPrefixException(driverId) {
  return driverId.startsWith('wifi_') || driverId.startsWith('virtual_');
}

function loadAllowlist() {
  if (!fs.existsSync(ALLOWLIST_PATH)) {
    return new Set();
  }
  const raw = JSON.parse(fs.readFileSync(ALLOWLIST_PATH, 'utf8'));
  const list = Array.isArray(raw) ? raw : (raw.drivers || raw.allowlist || []);
  return new Set(list.map(String));
}

/**
 * True if device.js directly extends ZigBeeDevice (bare SDK base).
 * Ignores TuyaZigbeeDevice / Unified* bases even if they re-export ZigBeeDevice.
 */
function isBareZigBeeDevice(source) {
  // Direct: class Foo extends ZigBeeDevice
  if (/\bextends\s+ZigBeeDevice\b/.test(source)) return true;
  // Mixin wrapper still rooted on bare ZigBeeDevice:
  // class Foo extends SomeMixin(ZigBeeDevice)
  if (/\bextends\s+\w+\(\s*ZigBeeDevice\s*\)/.test(source)) return true;
  return false;
}

function scanDrivers() {
  const driversDir = path.join(ROOT, 'drivers');
  const bare = [];
  if (!fs.existsSync(driversDir)) return bare;

  for (const entry of fs.readdirSync(driversDir, { withFileTypes: true })) {
    if (!entry.isDirectory()) continue;
    const deviceJs = path.join(driversDir, entry.name, 'device.js');
    if (!fs.existsSync(deviceJs)) continue;
    let source;
    try {
      source = fs.readFileSync(deviceJs, 'utf8');
    } catch {
      continue;
    }
    if (!isBareZigBeeDevice(source)) continue;
    bare.push(entry.name);
  }
  return bare.sort();
}

function classify(driverId, allowlist) {
  if (isPrefixException(driverId)) return 'prefix_exception';
  if (FIXED_EXCEPTIONS.has(driverId)) return 'fixed_exception';
  if (allowlist.has(driverId)) return 'allowlisted';
  return 'violation';
}

function main() {
  const allowlist = loadAllowlist();
  const bare = scanDrivers();
  const rows = bare.map((id) => ({
    driver: id,
    status: classify(id, allowlist),
  }));

  const violations = rows.filter((r) => r.status === 'violation').map((r) => r.driver);
  const summary = {
    timestamp: new Date().toISOString(),
    root: ROOT,
    bareCount: bare.length,
    allowlistSize: allowlist.size,
    allowlisted: rows.filter((r) => r.status === 'allowlisted').length,
    prefixExceptions: rows.filter((r) => r.status === 'prefix_exception').length,
    fixedExceptions: rows.filter((r) => r.status === 'fixed_exception').length,
    violations,
    ok: violations.length === 0,
  };

  if (JSON_MODE) {
    process.stdout.write(JSON.stringify({ ...summary, drivers: rows }, null, 2) + '\n');
  } else if (REPORT) {
    console.log(`[bare-zigbee-device-gate] bare ZigBeeDevice drivers: ${bare.length}`);
    for (const row of rows) {
      console.log(`  ${row.status.padEnd(18)} ${row.driver}`);
    }
    console.log(`[bare-zigbee-device-gate] violations: ${violations.length}`);
  } else {
    console.log(`[bare-zigbee-device-gate] bare=${bare.length} allowlisted=${summary.allowlisted} exceptions=${summary.prefixExceptions + summary.fixedExceptions} violations=${violations.length}`);
    if (violations.length) {
      console.error('[bare-zigbee-device-gate] NEW bare ZigBeeDevice outside allowlist:');
      for (const id of violations) console.error(`  - ${id}`);
      console.error('Migrate to TuyaZigbeeDevice or add to tools/ci/bare-zigbee-allowlist.json');
    }
  }

  process.exit(violations.length ? 1 : 0);
}

main();
