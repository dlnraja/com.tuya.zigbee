'use strict';
// P3253 (KB daily 2026-11-03): two wrong-class couples moved to the driver their upstream model needs,
// exact mfr+pid only, and pinned so the publish compactor keeps them.
const assert = require('assert');
const path = require('path');
const fs = require('fs');

const root = path.join(__dirname, '..');
const compose = (id) => JSON.parse(fs.readFileSync(path.join(root, 'drivers', id, 'driver.compose.json'), 'utf8')).zigbee;
const has = (z, mfr) => z.manufacturerName.some((m) => m.toLowerCase() === mfr.toLowerCase());
const sacred = require('../config/architecture/publish-sacred-keep-couples.json').couples;

const MOVES = [
  { mfr: '_TZE204_sdykkwsu', from: 'energy_meter_3phase', to: 'dimmer_2_gang_tuya' }, // Z2M AVATTO ZDMS16-US-W2
  { mfr: '_TZE204_zxkwaztm', from: 'curtain_motor', to: 'wall_thermostat' }, // Z2M Moes ZHT-S03
];

describe('P3253 wrong-class moves (exact couple)', () => {
  for (const m of MOVES) {
    it(`${m.mfr}|TS0601 lives in ${m.to}, not ${m.from}`, () => {
      const to = compose(m.to);
      assert.ok(has(to, m.mfr), `${m.mfr} missing from ${m.to}`);
      assert.ok(to.productId.includes('TS0601'));
      assert.ok(!has(compose(m.from), m.mfr), `${m.mfr} still in ${m.from}`);
    });
  }
  it('moved couples that compaction would drop are pinned in the sacred keep list', () => {
    for (const mfr of ['_TZE204_sdykkwsu', '_TZE204_zxkwaztm']) {
      assert.ok(sacred.some((c) => c.mfr === mfr && c.pid === 'TS0601'), `${mfr} not pinned`);
    }
  });
});
