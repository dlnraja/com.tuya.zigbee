'use strict';

/**
 * P2660 — Local-first doctrine gate (all apps)
 * Contre quoi: cloud-first defaults, missing SSOT, Zigbee requiring OpenAPI
 */

const fs = require('fs');
const path = require('path');
const { spawnSync } = require('child_process');

const ROOT = path.join(__dirname, '..', '..');
const SSOT = path.join(ROOT, 'config/architecture/local-first-ssot.json');
const HUMAN = path.join(ROOT, 'docs/architecture/LOCAL_FIRST_SSOT.md');
const POLICY = path.join(ROOT, 'lib/wifi/WiFiConnectionPolicy.js');
const RESOLVER = path.join(ROOT, 'lib/wifi/LocalFirstResolver.js');
const BRIDGE = path.join(ROOT, 'lib/tuya-local/TuyaZigbeeBridge.js');

function fail(msg) {
  console.error('[P2660]', msg);
  process.exit(1);
}

if (!fs.existsSync(SSOT)) fail('missing config/architecture/local-first-ssot.json');
if (!fs.existsSync(HUMAN)) fail('missing docs/architecture/LOCAL_FIRST_SSOT.md');

const ssot = JSON.parse(fs.readFileSync(SSOT, 'utf8'));
if (ssot._meta?.id !== 'P2660-local-first-ssot') fail('SSOT id mismatch');
if (ssot._meta?.classify !== 'BOTH') fail('SSOT must classify BOTH');
if (!Array.isArray(ssot.mandate?.priorityOrder) || ssot.mandate.priorityOrder[0] !== 'homey_zigbee_mesh') {
  fail('priorityOrder must start with homey_zigbee_mesh');
}
if (ssot.layers?.wifiLan?.defaults?.cloudFallback !== false) {
  fail('SSOT wifiLan.defaults.cloudFallback must be false');
}

const policy = fs.readFileSync(POLICY, 'utf8');
if (!/cloudFallback:\s*false/.test(policy)) fail('WiFiConnectionPolicy must default cloudFallback false');
if (!/strategy:\s*'local_first'/.test(policy)) fail('WiFiConnectionPolicy must default strategy local_first');

const resolver = fs.readFileSync(RESOLVER, 'utf8');
if (!/TRANSPORT_LAN\s*=\s*'lan'/.test(resolver)) fail('LocalFirstResolver missing LAN transport');
if (!/local_first/.test(resolver)) fail('LocalFirstResolver must mention local_first');

const bridge = fs.readFileSync(BRIDGE, 'utf8');
if (!/CONTROL_PATH_DOCTRINE/.test(bridge)) fail('TuyaZigbeeBridge missing CONTROL_PATH_DOCTRINE');
if (!/zigbeeEndDeviceHomey/.test(bridge)) fail('CONTROL_PATH_DOCTRINE missing zigbeeEndDeviceHomey');

// Spot-check: zigbee switch driver must not hard-require TuyaCloudAPI
const switchDev = path.join(ROOT, 'drivers/switch_1gang/device.js');
if (fs.existsSync(switchDev)) {
  const src = fs.readFileSync(switchDev, 'utf8');
  if (/require\(['"][^'"]*TuyaCloudAPI['"]\)/.test(src)) {
    fail('switch_1gang must not require TuyaCloudAPI (Zigbee local-first)');
  }
}

const r = spawnSync(process.execPath, ['--test', path.join(ROOT, 'test/critical/p2660-local-first-doctrine.test.js')], {
  cwd: ROOT,
  encoding: 'utf8',
});
process.stdout.write(r.stdout || '');
process.stderr.write(r.stderr || '');
if (r.status !== 0) fail('unit test failed');

console.log('[P2660] PASS local-first doctrine gate');
