'use strict';

/**
 * P2723 — Sleepy remotes must not get configureReporting via settings energy opt
 * Contre quoi: Bastien Zigbee tools showed 65–84% TX Error on TS0041/42/43 while
 * enable_battery_notifications + battery_report_interval + optimization_mode stayed on.
 * applyEnergyOptimization / requestBatteryUpdate must honor skipBatteryReporting.
 */

const { describe, it } = require('node:test');
const assert = require('node:assert/strict');
const fs = require('fs');
const path = require('path');

const ROOT = path.join(__dirname, '..', '..');
const BASE = path.join(ROOT, 'lib', 'devices', 'BaseUnifiedDevice.js');
const MIXIN = path.join(ROOT, 'lib', 'mixins', 'PhysicalButtonMixin.js');

describe('P2723 skipBatteryReporting blocks settings-driven battery TX', () => {
  it('applyEnergyOptimization guards skipBatteryReporting / noEf00Tx', () => {
    const src = fs.readFileSync(BASE, 'utf8');
    assert.match(src, /async applyEnergyOptimization\s*\(/);
    assert.match(
      src,
      /P2723 skip applyEnergyOptimization configureReporting \(skipBatteryReporting\)/,
    );
    // Contre quoi: guard must sit before the powerCluster.configureReporting call
    const start = src.indexOf('async applyEnergyOptimization');
    const guard = src.indexOf('P2723 skip applyEnergyOptimization', start);
    const call = src.indexOf('powerCluster.configureReporting', start);
    assert.ok(guard > start && call > guard, 'skip guard must precede powerCluster.configureReporting');
  });

  it('requestBatteryUpdate guards skipBatteryReporting', () => {
    const src = fs.readFileSync(BASE, 'utf8');
    assert.match(
      src,
      /P2723 skip requestBatteryUpdate ZCL read \(skipBatteryReporting\)/,
    );
  });

  it('Bastien house remotes keep skipBatteryReporting (axpdxqgu / dzwgk7e2 / vsxvaj9i)', () => {
    const src = fs.readFileSync(MIXIN, 'utf8');
    for (const mfr of ['_TZ3000_axpdxqgu', '_TZ3000_dzwgk7e2', '_TZ3000_vsxvaj9i']) {
      const re = new RegExp(`'${mfr}'\\s*:\\s*\\{[\\s\\S]*?skipBatteryReporting:\\s*true`);
      assert.match(src, re, mfr);
    }
  });
});
