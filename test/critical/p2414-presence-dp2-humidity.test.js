'use strict';

/**
 * P2414 — presence/radar must not invent measure_humidity from DP2 (diag c5165a37)
 */

const assert = require('assert');
const fs = require('fs');
const path = require('path');

const ROOT = path.join(__dirname, '..', '..');
const ef00 = fs.readFileSync(path.join(ROOT, 'lib', 'tuya', 'TuyaEF00Manager.js'), 'utf8');
assert.ok(ef00.includes('isPresenceRadarDriver'), 'presence radar guard missing');
assert.ok(ef00.includes('P2414'), 'P2414 WHY tag missing');
assert.ok(/isDimmerDriver \|\| isPresenceRadarDriver/.test(ef00), 'DP2 humidity null for presence');

const health = fs.readFileSync(path.join(ROOT, 'scripts', 'ci', 'version-health-check.js'), 'utf8');
assert.ok(health.includes('VERSION_HEALTH_SOFT_EXPECT') || health.includes('softExpect'), 'soft-expect health');
assert.ok(health.includes('P139'), 'P139 soft-expect note');

console.log('P2414 presence DP2 + version-health soft-expect: PASS');
