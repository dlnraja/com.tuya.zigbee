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
    assert.match(appJs, /_scheduleDeferredMasterFeaturesRetry/);
    assert.match(appJs, /adaptiveCacheMemory/);
    assert.doesNotMatch(onInit, /_scanForPhantomDevices\(\)/);
  });

  it('retries heavy engines later instead of dropping features', () => {
    const appJs = fs.readFileSync(path.join(__dirname, '..', '..', 'app.js'), 'utf8');
    assert.match(appJs, /RETRY_MS/);
    assert.match(appJs, /Deferred feature engines started \(retry/);
    assert.match(appJs, /Availability scan skipped/);
  });

  it('scales cache down under heap pressure without removing the optimizer', () => {
    assert.strictEqual(BootBudget.adaptiveCacheMemory(10 * 1024 * 1024), 8 * 1024 * 1024);
    assert.strictEqual(BootBudget.adaptiveCacheMemory(30 * 1024 * 1024), 4 * 1024 * 1024);
    assert.strictEqual(BootBudget.adaptiveCacheMemory(50 * 1024 * 1024), 2 * 1024 * 1024);
    assert.strictEqual(BootBudget.isHeapCritical(52 * 1024 * 1024), true);
    assert.strictEqual(BootBudget.shouldTxSleepy({ mainsPowered: true }, 10 * 1024 * 1024), true);
    assert.strictEqual(BootBudget.shouldTxSleepy({ mainsPowered: false }, 10 * 1024 * 1024), false);
    assert.strictEqual(BootBudget.shouldTxSleepy({ mainsPowered: true }, 60 * 1024 * 1024), false);
  });

  it('does not eager-load mfs_db or fingerprints.json in onInit', () => {
    const appJs = fs.readFileSync(path.join(__dirname, '..', '..', 'app.js'), 'utf8');
    const onInit = appJs.slice(appJs.indexOf('async onInit()'), appJs.indexOf('_scheduleDeferredMasterFeatures'));
    assert.doesNotMatch(onInit, /mfs_db\.json/);
    assert.doesNotMatch(onInit, /fingerprints\.json/);
  });

  it('IntelligentLazyLoad facade is Homey-safe and wraps BootBudget', () => {
    const Lazy = require('../../lib/performance/IntelligentLazyLoad');
    assert.strictEqual(Lazy.BootBudget, BootBudget);
    assert.equal(typeof Lazy.loadJsonBuffer, 'function');
    assert.equal(typeof Lazy.whenHeapAllows, 'function');
  });
});
