'use strict';
// P3090 (issue #559, diag ab72bfb5): TS011F _TZ3210_w0qqde0g plug paired on plug_energy_monitor
// showed no energy and ignored on/off. Two causes in UnifiedPlugBase: the ZCL energy listeners
// looked up `seMetering`/`haElectricalMeasurement` only (zigbee-clusters names them `metering` /
// `electricalMeasurement`), and onoff went out as Tuya DP1 although the node has no 0xEF00.
const { describe, it } = require('../_support/dual-runner');
const assert = require('assert');
const fs = require('fs');
const path = require('path');

const SRC = fs.readFileSync(path.join(__dirname, '..', '..', 'lib', 'devices', 'UnifiedPlugBase.js'), 'utf8');

function zclOnly(ctx) {
  const m = SRC.match(/_p3090ZclOnlyOnOff\(\) \{([\s\S]*?)\n  \}\n/);
  assert.ok(m, 'helper present');
  return new Function(m[1]).call(ctx); // eslint-disable-line no-new-func
}

describe('P3090 TS011F plug: ZCL energy cluster names + ZCL onoff when no 0xEF00', () => {
  it('energy listeners accept the zigbee-clusters names', () => {
    assert.ok(SRC.includes('endpoint?.clusters?.seMetering || endpoint?.clusters?.metering'));
    assert.ok(SRC.includes('endpoint?.clusters?.haElectricalMeasurement || endpoint?.clusters?.electricalMeasurement'));
  });
  it('TS011F with onOff and without EF00 is driven over ZCL', () => {
    const ctx = { zclNode: { endpoints: { 1: { clusters: { onOff: {}, metering: {}, electricalMeasurement: {} } } } },
      getSetting: () => 'TS011F', getData: () => ({}) };
    assert.strictEqual(zclOnly(ctx), true);
  });
  it('a node with 0xEF00, or a TS0601, keeps the DP path', () => {
    const ef = { zclNode: { endpoints: { 1: { clusters: { onOff: {}, tuya: {} } } } }, getSetting: () => 'TS011F', getData: () => ({}) };
    assert.strictEqual(zclOnly(ef), false);
    const dp = { zclNode: { endpoints: { 1: { clusters: { onOff: {} } } } }, getSetting: () => 'TS0601', getData: () => ({}) };
    assert.strictEqual(zclOnly(dp), false);
  });
  it('the DP send is gated by the helper', () => {
    assert.ok(SRC.includes('this._isPureTuyaDP && this.tuyaEF00Manager && !this._p3090ZclOnlyOnOff()'));
  });
});
