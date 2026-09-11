'use strict';

/**
 * P2467 — Moes ZTS dead motor (#533 / diag d05e6530 @ 9.0.874)
 * Root: UnifiedCoverBase created TuyaEF00Manager but never called initialize(zclNode)
 * (start()/init() do not exist) → no BoundCluster RX, no mcuSyncTime, weak TX path.
 */

const assert = require('assert');
const fs = require('fs');
const path = require('path');

const ROOT = path.join(__dirname, '..', '..');
const coverPath = path.join(ROOT, 'lib', 'devices', 'UnifiedCoverBase.js');
const curtainPath = path.join(ROOT, 'drivers', 'curtain_motor', 'device.js');
const mgrPath = path.join(ROOT, 'lib', 'tuya', 'TuyaEF00Manager.js');

const cover = fs.readFileSync(coverPath, 'utf8');
const curtain = fs.readFileSync(curtainPath, 'utf8');
const mgr = fs.readFileSync(mgrPath, 'utf8');

assert.ok(cover.includes('async _setupTuyaDPMode'), 'P2467: _setupTuyaDPMode must be async');
assert.ok(cover.includes('tuyaEF00Manager.initialize'), 'P2467: must call initialize(zclNode)');
assert.ok(cover.includes('P2467'), 'P2467 marker in UnifiedCoverBase');
assert.ok(cover.includes('_sendMoesMcuSyncTime'), 'P2467: mcuSyncTime helper');
assert.ok(cover.includes('_ensureMoesMcuReady'), 'P2467: MCU ready gate');
assert.ok(cover.includes('5slehgeo'), 'P2467: Moes force pure EF00');
assert.ok(cover.includes('skipWake'), 'P2467b: skip wake-up ping for Moes ZTS');

assert.ok(curtain.includes('P2467 Moes MCU time-sync'), 'P2467: curtain_motor arms time sync');
assert.ok(curtain.includes('_isMoesZtsEurC()') && /mainsPowered[\s\S]{0,400}_isMoesZtsEurC\(\)/.test(curtain), 'P2467b: Moes forced mainsPowered');
assert.ok(!/buildPayload\(fmt[\s\S]{0,200}only logs/.test(curtain), 'P2467: no log-only time sync');

assert.ok(mgr.includes('device?.zclNode'), 'P2467: _sendDPRaw falls back to device.zclNode');
assert.ok(mgr.includes('mcuSyncTime'), 'P2467: sendTimeSync prefers mcuSyncTime');
assert.ok(mgr.includes('TY_DATA_REQUEST'), 'P2467: seq16 frame comment in sendTuyaDP');

console.log('P2467 Moes EF00 initialize + mcuSyncTime: PASS');
