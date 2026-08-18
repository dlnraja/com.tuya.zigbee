'use strict';

const assert = require('assert');
const testApi = global.describe && global.it ? global : require('node:test');
const { describe, it } = testApi;

const BootBudget = require('../../lib/performance/BootBudget');
const fs = require('fs');
const path = require('path');

describe('P2183 boot budget (Peter memory / greyed Flows)', () => {
  it('refuses heavy features when heap is already high', () => {
    assert.strictEqual(BootBudget.shouldStartHeavyFeatures(10 * 1024 * 1024), true);
    assert.strictEqual(BootBudget.shouldStartHeavyFeatures(42 * 1024 * 1024), false);
    assert.strictEqual(BootBudget.shouldStartHeavyFeatures(93.8 * 1024 * 1024), false);
  });

  it('defers ID database, UDP start, LiveData and energy history until after onInit', () => {
    const appJs = fs.readFileSync(path.join(__dirname, '..', '..', 'app.js'), 'utf8');
    assert.match(appJs, /_scheduleDeferredMasterFeatures/);
    assert.match(appJs, /ID database deferred/);
    assert.match(appJs, /UDP discovery deferred/);
    const onInit = appJs.slice(appJs.indexOf('async onInit()'), appJs.indexOf('_scheduleDeferredMasterFeatures'));
    assert.doesNotMatch(onInit, /buildDatabase\(\)/);
    assert.doesNotMatch(onInit, /_tuyaUDPDiscovery\.start/);
    assert.doesNotMatch(onInit, /energyHistoryStore\.initialize/);
    assert.match(appJs, /async _initDeferredMasterFeatures/);
  });
});
