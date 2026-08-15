'use strict';

const assert = require('assert');
const fs = require('fs');
const path = require('path');

const ROOT = path.join(__dirname, '..', '..');
const testApi = global.describe && global.it ? global : require('node:test');
const { describe, it } = testApi;

const {
  buildPhysicalFlowCandidates,
  resolveFlowCardId,
  findDeclaredCI,
  expandIdCaseVariants,
  preferOutboundManufacturerCase,
  buildAppLevelButtonCandidates,
} = require('../../lib/flow/FlowCardHeuristics');

describe('energy battery button flows + case-less IDs', () => {
  it('expands driverId case variants for Homey transforms', () => {
    const v = expandIdCaseVariants('Switch_1Gang');
    assert.ok(v.includes('Switch_1Gang'));
    assert.ok(v.includes('switch_1gang'));
    assert.ok(v.includes('SWITCH_1GANG'));
  });

  it('resolves flow card IDs case-insensitively to Homey declared casing', () => {
    const declared = new Set(['switch_1gang_physical_on', 'Button_Pressed']);
    assert.strictEqual(resolveFlowCardId(['SWITCH_1GANG_PHYSICAL_ON'], declared), 'switch_1gang_physical_on');
    assert.strictEqual(findDeclaredCI(declared, 'button_pressed'), 'Button_Pressed');
  });

  it('buildPhysicalFlowCandidates includes app-level cards and case variants', () => {
    const c = buildPhysicalFlowCandidates('Switch_2Gang', 1, 'single', { gangCount: 2 });
    assert.ok(c.some((id) => id.toLowerCase() === 'switch_2gang_physical_gang1_single'));
    assert.ok(c.includes('button_pressed'));
    assert.ok(c.includes('virtual_button_pressed'));
    assert.ok(buildAppLevelButtonCandidates('long').includes('button_long_press'));
  });

  it('preferOutboundManufacturerCase returns Tuya canonical form', () => {
    assert.strictEqual(preferOutboundManufacturerCase('_tz3000_ABCDEF12'), '_TZ3000_abcdef12');
    assert.strictEqual(preferOutboundManufacturerCase('_TZE200_pay2byax'), '_TZE200_pay2byax');
  });

  it('SmartBatteryManager commits via safeSetCapabilityValue', () => {
    const src = fs.readFileSync(path.join(ROOT, 'lib/managers/SmartBatteryManager.js'), 'utf8');
    assert.match(src, /async _safeSet\(/);
    assert.match(src, /safeSetCapabilityValue/);
    assert.doesNotMatch(src, /await this\.device\.setCapabilityValue\('measure_battery'/);
  });

  it('homeycompose declares battery_percent_below and virtual_press_button', () => {
    assert.ok(fs.existsSync(path.join(ROOT, '.homeycompose/flow/conditions/battery_percent_below.json')));
    assert.ok(fs.existsSync(path.join(ROOT, '.homeycompose/flow/actions/virtual_press_button.json')));
    const btn = JSON.parse(fs.readFileSync(path.join(ROOT, '.homeycompose/flow/triggers/button_pressed.json'), 'utf8'));
    assert.match(btn.args[0].filter, /onoff/);
  });
});
