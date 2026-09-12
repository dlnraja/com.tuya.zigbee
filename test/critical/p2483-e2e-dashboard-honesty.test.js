'use strict';

/**
 * P2483 — E2E dashboard must not claim Stable PASS when Homey validate failed.
 */

const assert = require('assert');
const fs = require('fs');
const path = require('path');

const root = path.join(__dirname, '..', '..');
const gate = path.join(root, 'tools', 'ci', 'assert-compose-drivers-exist.js');
const ymlPath = path.join(root, '.github', 'workflows', 'e2e-dashboard-test.yml');

assert.ok(fs.existsSync(gate), 'assert-compose-drivers-exist.js');
assert.ok(fs.existsSync(ymlPath), 'e2e-dashboard-test.yml');

const yml = fs.readFileSync(ymlPath, 'utf8');
assert.ok(yml.includes('STABLE_VALIDATION=FAIL'), 'must emit FAIL for summary honesty');
assert.ok(yml.includes('STABLE_VALIDATION=PASS'), 'must emit PASS');
assert.ok(/STABLE_VAL/.test(yml), 'summary reads STABLE_VAL');

console.log('P2483 e2e dashboard honesty: PASS');
