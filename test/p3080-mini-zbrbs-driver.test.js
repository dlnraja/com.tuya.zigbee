'use strict';
/* eslint-env mocha */
// P3080: SONOFF|MINI-ZBRBS gets its own driver (one couple = one driver). Source: zhc sonoff.ts
// (windowCovering lift, coverInverted false) + interview docs/data/interviews/MINI-ZBRBS__SONOFF.json.
const assert = require('assert');
const fs = require('fs');
const path = require('path');

const root = path.join(__dirname, '..');
const dir = path.join(root, 'drivers', 'curtain_sonoff_mini_zbrbs');
const compose = () => JSON.parse(fs.readFileSync(path.join(dir, 'driver.compose.json'), 'utf8'));

describe('P3080 SONOFF MINI-ZBRBS dedicated driver', () => {
  it('declares the exact sourced couple only, standard ZCL 0x0102 and no 0xEF00', () => {
    const c = compose();
    assert.deepStrictEqual(c.zigbee.manufacturerName, ['SONOFF']);
    assert.deepStrictEqual(c.zigbee.productId, ['MINI-ZBRBS']);
    const clusters = c.zigbee.endpoints['1'].clusters;
    assert.ok(clusters.includes(258));
    assert.ok(!clusters.includes(61184));
    assert.strictEqual(c.class, 'windowcoverings');
  });
  it('no other driver matches SONOFF|MINI-ZBRBS', () => {
    const holders = [];
    for (const d of fs.readdirSync(path.join(root, 'drivers'))) {
      const f = path.join(root, 'drivers', d, 'driver.compose.json');
      if (!fs.existsSync(f)) {continue;}
      const z = JSON.parse(fs.readFileSync(f, 'utf8')).zigbee || {};
      if ((z.manufacturerName || []).includes('SONOFF') && (z.productId || []).includes('MINI-ZBRBS')) {holders.push(d);}
    }
    assert.deepStrictEqual(holders, ['curtain_sonoff_mini_zbrbs']);
  });
  it('uses system windowcoverings flow cards only (empty driver flow compose), has learnmode, is in app.json', () => {
    assert.deepStrictEqual(JSON.parse(fs.readFileSync(path.join(dir, 'driver.flow.compose.json'), 'utf8')), {});
    assert.ok(compose().zigbee.learnmode.instruction.en);
    assert.deepStrictEqual(compose().capabilities, ['windowcoverings_set']);
    const app = JSON.parse(fs.readFileSync(path.join(root, 'app.json'), 'utf8'));
    assert.ok(app.drivers.some((d) => d.id === 'curtain_sonoff_mini_zbrbs'));
  });
  it('device keeps pairing best effort: spec lift orientation, guarded registration, no throw', () => {
    const src = fs.readFileSync(path.join(dir, 'device.js'), 'utf8');
    assert.match(src, /invertPercentageLiftValue = true/);
    assert.match(src, /if \(!this\.hasCapability\('windowcoverings_set'\)\) \{return;\}/);
    assert.match(src, /try \{\s*this\.registerCapability\('windowcoverings_set'/);
    assert.ok(!/0xEF00|61184|dpMappings/.test(src));
  });
  it('credits the source', () => {
    assert.match(fs.readFileSync(path.join(root, 'CREDITS.md'), 'utf8'), /P3080.*curtain_sonoff_mini_zbrbs.*sonoff\.ts/);
  });
});
