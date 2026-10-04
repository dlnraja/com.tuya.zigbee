'use strict';
/* eslint-env mocha */
// User decision 2026-10-04: exact-pair placements may keep the old driver's couple, but only as
// documented, reviewed entries. Every entry must carry couple, drivers, reason, source and date.
const assert = require('assert');
const fs = require('fs');
const path = require('path');

const root = path.join(__dirname, '..');
const allow = JSON.parse(fs.readFileSync(path.join(root, 'data', 'native-matrix-reviewed-duals.json'), 'utf8'));

describe('native-matrix reviewed exceptions', () => {
  it('every entry is complete and points to existing drivers holding the couple', () => {
    for (const e of allow.entries) {
      for (const k of ['couple', 'drivers', 'reason', 'source', 'date']) { assert.ok(e[k], `${e.couple} ${k}`); }
      assert.match(e.couple, /^_[A-Za-z0-9]+_[a-z0-9]{8}\|[A-Z0-9_]+$/);
      const [mfr, pid] = e.couple.split('|');
      for (const d of e.drivers) {
        const z = JSON.parse(fs.readFileSync(path.join(root, 'drivers', d, 'driver.compose.json'), 'utf8')).zigbee;
        assert.ok(z.manufacturerName.some((m) => m.toLowerCase() === mfr.toLowerCase()), `${d} lacks ${mfr}`);
        assert.ok([].concat(z.productId).includes(pid), `${d} lacks ${pid}`);
      }
    }
  });
});
