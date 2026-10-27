'use strict';
// P3062: the fingerprint hint for _TZE200_amp6tsvy|TS0601 must agree with the compose owner
// (switch_1gang, Moes ZTS-EU1). Sources quoted in lib/DeviceFingerprintDB.js.
const { describe, it } = require('../_support/dual-runner');
const assert = require('assert');
const fs = require('fs');
const path = require('path');

describe('P3062 _TZE200_amp6tsvy hint matches its compose driver', () => {
  it('hint points at switch_1gang, mains, no MULTIGANG profile; _TZE204_ twin untouched', () => {
    const src = fs.readFileSync(path.join(__dirname, '../../lib/DeviceFingerprintDB.js'), 'utf8');
    const line = src.split('\n').find((l) => l.includes("'_TZE200_amp6tsvy|TS0601'"));
    assert.ok(line, 'hint line present');
    assert.ok(/driver: 'switch_1gang'/.test(line));
    assert.ok(/powerSource: 'mains'/.test(line));
    assert.ok(!/MULTIGANG/.test(line));
    const twin = src.split('\n').find((l) => l.includes("'_TZE204_amp6tsvy|TS0601'"));
    // P3077 b16: the _TZE204 twin follows the 1-gang family (Z2M moes.ts, ZHA TuyaSingleSwitchTO)
    assert.ok(/switch_1gang/.test(twin) && !/switch_2gang/.test(twin));
  });
  it('switch_1gang compose owns the couple', () => {
    const c = require('../../drivers/switch_1gang/driver.compose.json');
    const mfr = (c.zigbee.manufacturerName || []).map((m) => m.toLowerCase());
    assert.ok(mfr.includes('_tze200_amp6tsvy'));
    assert.ok((c.zigbee.productId || []).includes('TS0601'));
  });
});
