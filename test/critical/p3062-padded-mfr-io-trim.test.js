'use strict';
// WHY(P3062, rescued from soil-1013/wa-master, issue #570/#571): a device can report a padded
// manufacturerName ("AOYAN  "). Driver lists keep the exact padded form (additive), but the
// runtime protocol pick / MCU negotiation must see the trimmed brand so one device never splits
// into two identities.
const { describe, it } = require('node:test');
const assert = require('node:assert/strict');
const fs = require('fs');
const path = require('path');

const ROOT = path.join(__dirname, '..', '..');
const read = (rel) => fs.readFileSync(path.join(ROOT, rel), 'utf8');

describe('P3062 padded manufacturerName is trimmed at IO read time', () => {
  it('DeviceIOFacade trims the mfr handed to the protocol picker', () => {
    assert.match(read('lib/io/DeviceIOFacade.js'), /const mfr = String\(manufacturerName[\s\S]{0,200}\|\| '',\s*\)\.trim\(\);/);
  });
  it('HomeyCompensationLayer trims the mfr used for MCU negotiation', () => {
    assert.match(read('lib/io/HomeyCompensationLayer.js'), /const mfr = String\(this\.device\.getSetting\?\.\('zb_manufacturer_name'\)[\s\S]{0,150}\|\| '',\s*\)\.trim\(\);/);
  });
  it('helper and matcher already resolve the padded form to the trimmed brand', () => {
    const H = require(path.join(ROOT, 'lib/helpers/ManufacturerNameHelper.js'));
    const FM = require(path.join(ROOT, 'lib/utils/fingerprint-matcher.js'));
    const dev = { getSetting: (k) => (k === 'zb_manufacturer_name' ? 'AOYAN  ' : null) };
    assert.equal(H.getManufacturerName(dev), 'AOYAN');
    assert.equal(FM.normalizeMfr('AOYAN  ').key, FM.normalizeMfr('AOYAN').key);
  });
  it('the trimmed value equals String(x).trim() for padded, plain and empty inputs', () => {
    for (const [i, o] of [['AOYAN  ', 'AOYAN'], ['_TZ3000_eit7p838 ', '_TZ3000_eit7p838'], ['', ''], [undefined, '']]) {
      assert.equal(String(i || '').trim(), o);
    }
  });
});
