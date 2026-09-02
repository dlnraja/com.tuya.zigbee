'use strict';

/**
 * P2399 — Moes cover motion guard: arm-before-TX + 25s for ZTS-EUR-C
 */

const assert = require('assert');
const fs = require('fs');
const path = require('path');

const ROOT = path.join(__dirname, '..', '..');
const cover = fs.readFileSync(path.join(ROOT, 'lib', 'devices', 'UnifiedCoverBase.js'), 'utf8');

assert.match(cover, /P2399/);
assert.match(cover, /moesZts \? 25000/);
assert.match(cover, /arm before TX|arm BEFORE TX|arm first/i);
// Guard armed before _sendTuyaDP for state up/down
const stateBlock = cover.match(/if \(this\._isPureTuyaDP\) \{[\s\S]*?_sendTuyaDP\(1, cmd/);
assert.ok(stateBlock, 'pure Tuya DP state path');
assert.match(stateBlock[0], /_armCoverMotionGuard\(state\)/);
const armIdx = stateBlock[0].indexOf('_armCoverMotionGuard');
const sendIdx = stateBlock[0].indexOf('_sendTuyaDP(1, cmd');
assert.ok(armIdx >= 0 && sendIdx > armIdx, 'arm before send');

console.log('p2399-cover-motion-guard: ok');
