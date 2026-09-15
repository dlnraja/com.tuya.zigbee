'use strict';

/**
 * P2502 BOTH — SMART ADAPT BootBudget defer (Peter OOM complementary)
 * Contre quoi: SMART ADAPT must not run under heap critical on stable LTS.
 */

const { describe, it } = require('node:test');
const assert = require('node:assert/strict');
const fs = require('fs');
const path = require('path');

const ROOT = path.join(__dirname, '..', '..');

describe('P2502 SMART ADAPT BootBudget defer (stable BOTH)', () => {
  it('TuyaZigbeeDevice defers under heap critical', () => {
    const src = fs.readFileSync(path.join(ROOT, 'lib/tuya/TuyaZigbeeDevice.js'), 'utf8');
    assert.match(src, /P2502/);
    assert.match(src, /isHeapCritical\(\)/);
    assert.match(src, /shouldStartHeavyFeatures\(\)/);
  });

  it('UniversalZigbeeDevice defers under heap critical', () => {
    const src = fs.readFileSync(path.join(ROOT, 'lib/UniversalZigbeeDevice.js'), 'utf8');
    assert.match(src, /P2502/);
    assert.match(src, /isHeapCritical\(\)/);
  });

  it('BootBudget exports heap gates', () => {
    const BootBudget = require('../../lib/performance/BootBudget');
    assert.equal(typeof BootBudget.isHeapCritical, 'function');
    assert.equal(typeof BootBudget.shouldStartHeavyFeatures, 'function');
  });
});
