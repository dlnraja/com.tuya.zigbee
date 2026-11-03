'use strict';
// P3252 (KB daily 2026-11-03): three wrong-class couples moved to the driver their upstream model needs,
// exact mfr+pid only, and pinned so the publish compactor keeps them.
const assert = require('assert');
const path = require('path');
const fs = require('fs');

const root = path.join(__dirname, '..');
const compose = (id) => JSON.parse(fs.readFileSync(path.join(root, 'drivers', id, 'driver.compose.json'), 'utf8')).zigbee;
const has = (z, mfr) => z.manufacturerName.some((m) => m.toLowerCase() === mfr.toLowerCase());
const sacred = require('../config/architecture/publish-sacred-keep-couples.json').couples;

const MOVES = [
  { mfr: '_TZE200_ojzhk75b', from: 'water_tank_monitor', to: 'wall_dimmer_tuya' }, // Z2M TS0601_dimmer_1_gang_1
  { mfr: '_TZE200_wzk0x7fq', from: 'curtain_motor', to: 'vibration_sensor' }, // Z2M HOBEIAN ZG-102ZM
  { mfr: '_TZE284_qoi1aqxg', from: 'button_wireless', to: 'curtain_motor' }, // Z2M Moes FWJZCEH18A001
];

describe('P3252 wrong-class moves (exact couple)', () => {
  for (const m of MOVES) {
    it(`${m.mfr}|TS0601 lives in ${m.to}, not ${m.from}`, () => {
      const to = compose(m.to);
      assert.ok(has(to, m.mfr), `${m.mfr} missing from ${m.to}`);
      assert.ok(to.productId.includes('TS0601'));
      assert.ok(!has(compose(m.from), m.mfr), `${m.mfr} still in ${m.from}`);
    });
  }
  it('moved couples that compaction would drop are pinned in the sacred keep list', () => {
    for (const mfr of ['_TZE200_wzk0x7fq', '_TZE284_qoi1aqxg']) {
      assert.ok(sacred.some((c) => c.mfr === mfr && c.pid === 'TS0601'), `${mfr} not pinned`);
    }
  });
});
