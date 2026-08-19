'use strict';

const assert = require('assert');
const fs = require('fs');
const path = require('path');

const ROOT = path.join(__dirname, '..', '..');
const testApi = global.describe && global.it ? global : require('node:test');
const { describe, it } = testApi;

describe('P218 device-truth catalog', () => {
  const jsonPath = path.join(ROOT, 'docs/knowledge/device-truth.json');
  const mdPath = path.join(ROOT, 'docs/knowledge/DEVICE_TRUTH.md');

  it('catalog exists with 400+ drivers and locked couples', () => {
    const j = JSON.parse(fs.readFileSync(jsonPath, 'utf8'));
    assert.ok(j.driverCount >= 400, `driverCount ${j.driverCount}`);
    assert.ok(j.lockCount >= 20, `lockCount ${j.lockCount}`);
    assert.ok(j.drivers.wall_dimmer_tuya);
    assert.ok(j.drivers.button_emergency_sos);
    assert.ok(j.drivers.switch_temp_sensor);
    assert.ok((j.drivers.wall_dimmer_tuya.productIds || []).includes('TS0601'));
    assert.ok((j.drivers.button_emergency_sos.batteries || []).length > 0);
  });

  it('markdown teaches lookup and publish≠forum', () => {
    const md = fs.readFileSync(mdPath, 'utf8');
    assert.match(md, /manufacturerName \+ productId/);
    assert.match(md, /Publish.*Homey App Store/);
    assert.match(md, /Do not post/);
    assert.match(md, /wall_dimmer_tuya/);
  });

  it('cursor rule and mandate point at the catalog', () => {
    const rule = fs.readFileSync(path.join(ROOT, '.cursor/rules/device-truth.mdc'), 'utf8');
    const mandate = fs.readFileSync(path.join(ROOT, 'AI_CONTEXT_MANDATE.md'), 'utf8');
    const cursorrules = fs.readFileSync(path.join(ROOT, '.cursorrules'), 'utf8');
    assert.match(rule, /alwaysApply: true/);
    assert.match(rule, /device-truth\.json/);
    assert.match(mandate, /docs\/knowledge\/DEVICE_TRUTH\.md/);
    assert.match(cursorrules, /docs\/knowledge\/DEVICE_TRUTH\.md/);
  });
});
