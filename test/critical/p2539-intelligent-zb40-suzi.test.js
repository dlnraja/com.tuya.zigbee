'use strict';

/**
 * P2539 — Intelligent Zigbee 4.0 / Suzi / Green Power integration Contre quoi.
 * BOTH: awareness + classifier; never invent sacred couples / compose tags.
 */

const { describe, it } = require('node:test');
const assert = require('node:assert/strict');
const fs = require('fs');
const path = require('path');

const ROOT = path.join(__dirname, '..', '..');
const evo = require(path.join(ROOT, 'lib/utils/zigbee-tuya-evolution.js'));

describe('P2539 intelligent Zigbee 4.0 / Suzi integration', () => {
  it('SSOT marks Zigbee 4.0 awareness + Suzi not on Homey 2.4 GHz today', () => {
    const ssot = evo.loadEvolutionSsot();
    assert.equal(ssot.patch, 'P2539');
    assert.equal(ssot.doctrine.suziNotDropInOnExistingHomey, true);
    assert.equal(ssot.intelligentIntegration.homeyCapabilityToday.suziSubGhz, false);
    assert.equal(ssot.intelligentIntegration.homeyCapabilityToday.zigbee24ghz, true);
    assert.equal(ssot.intelligentIntegration.homeyCapabilityToday.tuyaEf00Hybrid, true);
    const suzi = ssot.derivatives.find((d) => d.id === 'suzi');
    assert.equal(suzi.replaces24ghz, false);
  });

  it('classifyHomeyRadioCapability: normal Tuya couple stays 2.4 GHz capable', () => {
    const c = evo.classifyHomeyRadioCapability({
      mfr: '_TZE284_m1cvyneb',
      productId: 'TS0601',
    });
    assert.equal(c.radioClass, 'homey_zigbee_24ghz_tuya_capable');
    assert.equal(c.suziSupportedOnThisHomey, false);
    assert.equal(c.refuseInventPid, true);
    assert.equal(c.homeyAppHandlesDevice, true);
  });

  it('classifyHomeyRadioCapability: Suzi invent identity is refused (not a couple)', () => {
    const c = evo.classifyHomeyRadioCapability({
      mfr: 'SUZI_LONG_RANGE',
      productId: 'SUBGHZ01',
    });
    assert.equal(c.radioClass, 'suzi_not_on_homey_24ghz');
    assert.equal(c.homeyAppHandlesDevice, false);
    assert.ok(c.warnings.length >= 1);
  });

  it('classifyHomeyRadioCapability: Green Power EP 242 soft path', () => {
    const c = evo.classifyHomeyRadioCapability({
      mfr: '_TZ3000_example',
      productId: 'TS004F',
      endpointIds: [1, 242],
    });
    assert.equal(c.radioClass, 'green_power_endpoint_present');
    assert.equal(c.greenPowerEndpointPresent, true);
  });

  it('IntelligentProtocolDetect attaches radioCapability without invent', () => {
    const { applyIntelligentProtocol } = require(
      path.join(ROOT, 'lib/protocol/IntelligentProtocolDetect.js')
    );
    const device = {
      getSettings: () => ({ zb_manufacturer_name: '_TZ3000_l9brjwau', zb_model_id: 'TS0002' }),
      getStore: () => ({}),
      getData: () => ({}),
      log() {},
    };
    const info = applyIntelligentProtocol(device, { endpoints: { 1: { clusters: {} } } });
    assert.ok(info.radioCapability);
    assert.equal(info.radioCapability.refuseInventPid, true);
    assert.equal(device._radioCapability.radioClass, info.radioCapability.radioClass);
  });

  it('diagnostics brief includes intelligentIntegration one-liner', () => {
    const brief = evo.getDiagnosticsRfBrief();
    assert.ok(brief.intelligentIntegration?.oneLiner);
    assert.match(brief.intelligentIntegration.oneLiner, /Suzi|Zigbee 4\.0/i);
    assert.equal(brief.intelligentIntegration.suziOnHomeyToday, false);
  });

  it('assertHomeyImplications still green (no compose invent)', () => {
    const result = evo.assertHomeyImplications({ scanDrivers: true });
    assert.equal(result.ok, true, result.failures.join(' | '));
  });
});
