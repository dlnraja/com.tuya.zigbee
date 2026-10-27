'use strict';
// P3039d ratchet (27/10, CI-PR): the parasitic baseline may be re-keyed when a pid moves between
// drivers, but it must never grow, and a moved combo must not stay listed under its old driver.
const { describe, it } = require('../_support/dual-runner');
const assert = require('assert');
const fs = require('fs');
const path = require('path');

const ROOT = path.join(__dirname, '..', '..');
const base = JSON.parse(fs.readFileSync(path.join(ROOT, '.github/mfr-multi-driver-parasitic-baseline.json'), 'utf8')).parasitic;

describe('P3039d parasitic baseline ratchet', () => {
  it('never grows past 1825 combos', () => {
    assert.ok(base.length <= 1825, `baseline grew to ${base.length}`);
  });
  it('HOBEIAN ZG-101ZD combos follow the pid to smart_knob_zg101zd', () => {
    const set = new Set(base);
    assert.ok(set.has('hobeian|ZG-101ZD@smart_knob_zg101zd'));
    assert.ok(!set.has('hobeian|ZG-101ZD@button_wireless_1'));
    assert.ok(!set.has('hobeian|zg-101zd@button_wireless_1'));
  });
});
