'use strict';

/**
 * P2475 — EF00 TX / mcuSyncTime must arm initialize first; rejoin re-sync.
 * Contre quoi: hollow EF00 cluster (P2467 class) + epoch mismatch on mcuSyncTime.
 */

const assert = require('assert');
const fs = require('fs');
const path = require('path');

const ROOT = path.join(__dirname, '..', '..');
const mgr = fs.readFileSync(path.join(ROOT, 'lib', 'tuya', 'TuyaEF00Manager.js'), 'utf8');
const base = fs.readFileSync(path.join(ROOT, 'lib', 'devices', 'BaseUnifiedDevice.js'), 'utf8');

assert.ok(mgr.includes('_ensureEf00ReadyForTx'), 'P2475: ensure EF00 ready helper');
assert.ok(/async sendDP\([\s\S]{0,400}_ensureEf00ReadyForTx/.test(mgr), 'P2475: sendDP arms EF00 before TX');
assert.ok(/async sendTimeSync\([\s\S]{0,500}_ensureEf00ReadyForTx/.test(mgr), 'P2475: sendTimeSync arms EF00');
assert.ok(mgr.includes('epoch2000') || mgr.includes('useEpoch2000'), 'P2475: epoch 1970/2000 aware mcuSyncTime');
assert.ok(base.includes('P2475') && base.includes('endDeviceAnnounce'), 'P2475: rejoin MCU re-sync marker');
assert.ok(base.includes('sendTimeSync') && base.includes('_p2475LastMcuSyncMs'), 'P2475: throttled re-sync store');

console.log('P2475 EF00 initialize + MCU re-sync: PASS');
