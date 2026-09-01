'use strict';

/**
 * P2364 — button flow harvest gate (CI)
 */
const assert = require('assert');
const fs = require('fs');
const path = require('path');
const testApi = global.describe && global.it ? global : require('node:test');
const { describe, it } = testApi;

const ROOT = path.join(__dirname, '..', '..');
const DATE = new Date().toISOString().slice(0, 10);

describe('P2364 button flow harvest', () => {
  it('smart_knob has 1-gang Ngang flow triggers', () => {
    const flow = JSON.parse(fs.readFileSync(path.join(ROOT, 'drivers/smart_knob/driver.flow.compose.json'), 'utf8'));
    assert.ok(flow.triggers.length >= 10);
    assert.ok(flow.triggers.some((t) => t.id === 'smart_knob_button_1gang_button_pressed'));
    assert.ok(flow.triggers.some((t) => t.id === 'smart_knob_battery_low'));
  });

  it('smart_knob driver registers flow cards', () => {
    const src = fs.readFileSync(path.join(ROOT, 'drivers/smart_knob/driver.js'), 'utf8');
    assert.match(src, /registerButtonFlowCards\(this, 'smart_knob', 1\)/);
  });

  it('scene_switch_6ch has 6gang declared triggers', () => {
    const flow = JSON.parse(fs.readFileSync(path.join(ROOT, 'drivers/scene_switch_6ch/driver.flow.compose.json'), 'utf8'));
    assert.ok(flow.triggers.some((t) => t.id === 'scene_switch_6ch_button_6gang_button_1_pressed'));
    assert.ok(flow.triggers.some((t) => t.id === 'scene_switch_6ch_button_pressed'));
    assert.ok(flow.triggers.length >= 34);
  });

  it('harvest report exists with 50+ button drivers', () => {
    const summaryPath = path.join(ROOT, 'reports', `button-flow-harvest-${DATE}`, 'summary.json');
    assert.ok(fs.existsSync(summaryPath), `run npm run button:harvest — missing ${summaryPath}`);
    const summary = JSON.parse(fs.readFileSync(summaryPath, 'utf8'));
    assert.ok(summary.driverCount >= 50);
    assert.ok(summary.totalTriggers >= 800);
    assert.deepEqual(summary.appLevelButtonTriggersMissing, []);
  });
});
