#!/usr/bin/env node
'use strict';

/**
 * Alias / baseline helper for bare-zigbee-device-gate.js
 * Prefer: npm run check:bare-zigbee
 *
 * --update-baseline rewrites tools/ci/bare-zigbee-allowlist.json from current tree.
 */

const fs = require('fs');
const path = require('path');
const { spawnSync } = require('child_process');

const ROOT = path.resolve(__dirname, '..', '..');
const GATE = path.join(__dirname, 'bare-zigbee-device-gate.js');
const ALLOWLIST_PATH = path.join(__dirname, 'bare-zigbee-allowlist.json');
const DRIVERS = path.join(ROOT, 'drivers');
const EXEMPT_ID = /^(wifi_|virtual_)/;

if (process.argv.includes('--update-baseline')) {
  const bare = [];
  for (const id of fs.readdirSync(DRIVERS)) {
    if (EXEMPT_ID.test(id) || id === 'generic_diy' || id === 'diy_custom_zigbee') {continue;}
    const file = path.join(DRIVERS, id, 'device.js');
    if (!fs.existsSync(file)) {continue;}
    const src = fs.readFileSync(file, 'utf8');
    if (/\bextends\s+ZigBeeDevice\b/.test(src) || /\bextends\s+\w+\(\s*ZigBeeDevice\s*\)/.test(src)) {
      bare.push(id);
    }
  }
  bare.sort();
  fs.writeFileSync(ALLOWLIST_PATH, `${JSON.stringify({
    updated: new Date().toISOString(),
    note: 'Legacy bare ZigBeeDevice drivers still migrating to TuyaZigbeeDevice/Unified*. New drivers MUST NOT be added here.',
    drivers: bare,
  }, null, 2)}\n`);
  console.log(`Updated allowlist with ${bare.length} drivers`);
  process.exit(0);
}

const extra = process.argv.slice(2);
const r = spawnSync(process.execPath, [GATE, ...extra], { stdio: 'inherit' });
process.exit(r.status == null ? 1 : r.status);
