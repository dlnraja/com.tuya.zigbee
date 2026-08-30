'use strict';
/**
 * P2329 — Moes curtain Cover Controller pairs as Unknown Zigbee (#533 salvagr)
 * WHY: interview clusters are 0/4/5/61184 only; compose required 6+258 → Homey
 * refuses driver match (same class of bug as Homey forum "clear endpoints").
 */
const assert = require('assert');
const fs = require('fs');
const path = require('path');

const ROOT = path.join(__dirname, '..', '..');

describe('P2329 curtain_motor Moes EF00 pairing clusters', () => {
  it('compose endpoints match Moes ZTS interview (no 6/258 required)', () => {
    const c = JSON.parse(fs.readFileSync(path.join(ROOT, 'drivers/curtain_motor/driver.compose.json'), 'utf8'));
    const clusters = c.zigbee.endpoints['1'].clusters.map(Number);
    assert.deepEqual(clusters.slice().sort((a, b) => a - b), [0, 4, 5, 61184]);
    assert.ok(!clusters.includes(6), 'onOff 6 must not be required for EF00 curtain');
    assert.ok(!clusters.includes(258), 'windowCovering 258 must not be required');
    const mfrs = c.zigbee.manufacturerName || [];
    assert.ok(mfrs.some((m) => /5slehgeo/i.test(m)));
    assert.ok((c.zigbee.productId || []).includes('TS0601'));
  });

  it('wall_dimmer_tuya has no bare setTimeout fallback', () => {
    const src = fs.readFileSync(path.join(ROOT, 'drivers/wall_dimmer_tuya/device.js'), 'utf8');
    assert.doesNotMatch(src, /(?<!homey\.)setTimeout\(resolve,\s*delays\[i\]\)/);
    assert.match(src, /safeSetTimeout|homey\.setTimeout/);
  });
});
