'use strict';
/* eslint-env mocha */
// #100 source-proposals batch: ZY-N1 sound sensor, Zosung IR, RGBCW floodlight, TS0002 power-on via 0x4003,
// and the light_bulb_rgb* decode repair (scales had been flipped to "* 1000" and HSV parsing returned NaN).
const assert = require('assert');
const fs = require('fs');
const path = require('path');
const { decode } = require('../lib/tuya/TuyaDpProfileCodec');

const root = path.join(__dirname, '..');
const read = (p) => fs.readFileSync(path.join(root, p), 'utf8');
const compose = (d) => JSON.parse(read(`drivers/${d}/driver.compose.json`));

describe('#100 source proposals', () => {
  it('inSet decodes the ZY-N1 DP101 debounced states', () => {
    const def = { kind: 'inSet', set: [0, 2, 3] };
    assert.strictEqual(decode(def, 0), true);
    assert.strictEqual(decode(def, 3), true);
    assert.strictEqual(decode(def, 1), false);
    assert.strictEqual(decode(def, 7), false);
  });

  it('sound_sensor_tuya is an exact-pair driver without mandatory EF00', () => {
    const j = compose('sound_sensor_tuya');
    assert.deepStrictEqual(j.zigbee.manufacturerName.filter((m) => m === m.toUpperCase().replace('R6KFL9TA', 'r6kfl9ta')), ['_TZE204_r6kfl9ta']);
    assert.deepStrictEqual(j.capabilities, ['measure_noise', 'alarm_generic']);
    assert.ok(!j.zigbee.endpoints['1'].clusters.includes(61184));
    const src = read('drivers/sound_sensor_tuya/device.js');
    assert.ok(src.includes("101: { cap: 'alarm_generic', kind: 'inSet', set: [0, 2, 3] }"));
    assert.ok(src.includes('sendEf00DpMaxFallback(this, 102'));
  });

  it('places the three other couples additively', () => {
    assert.ok(compose('light_bulb_rgb_rgbw').zigbee.manufacturerName.includes('_TZE284_oa1odmga'));
    assert.ok(compose('light_bulb_rgb_rgbw').zigbee.productId.includes('TS0601'));
    assert.ok(compose('switch_2gang').zigbee.manufacturerName.includes('_TZ3210_jqg2a5yn'));
    assert.ok(compose('ir_blaster').zigbee.manufacturerName.includes('_TZ3290_qazgdsae'));
  });

  it('TuyaOnOffCluster declares ZCL startUpOnOff (0x4003) and the switch base writes it before DP14', () => {
    // Read as text: requiring the cluster here would load zigbee-clusters under other suites' mocks.
    assert.ok(/startUpOnOff: \{ id: 0x4003, type: ZCLDataTypes\.enum8\(\{ off: 0, on: 1, toggle: 2, previous: 255 \}\) \}/.test(read('lib/clusters/TuyaOnOffCluster.js')));
    const base = read('lib/devices/UnifiedSwitchBase.js');
    assert.ok(/await this\._writeStartUpOnOff\(newSettings\[key\]\);\s*await this\._sendTuyaDP\(14/.test(base));
  });

  for (const d of ['light_bulb_rgb_rgbw', 'light_bulb_rgb', 'light_bulb_rgb_led']) {
    it(`${d} decodes DP3/DP4/DP5 on a 0-1 scale`, () => {
      const src = read(`drivers/${d}/device.js`);
      assert.ok(!/transform: \(v\) => Math\.max\(0\.01, v \* 1000\)/.test(src));
      assert.ok(!src.includes('substring(0, safeMultiply(4)'));
      assert.ok(src.includes('parseInt(raw.substring(0, 4), 16)'));
      assert.ok(src.includes("'light_hue', h / 360)"));
    });
  }
});
