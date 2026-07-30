'use strict';

/**
 * Tests — anti-purge regression guard (P1-P91 spirit, v9.0.368)
 * The recurring historical failure mode of this project is fingerprint
 * purges: a mfr disappears from every driver and users get
 * "Unknown Zigbee device" (issues #183, #511, P92.20, …).
 *
 * Guard: every fingerprint routed in mfs_db MUST be claimed by at least
 * one driver in app.json — otherwise the device cannot pair at all.
 */

const assert = require('assert');
const fs = require('fs');
const path = require('path');

const testApi = global.describe && global.it ? global : require('node:test');
const { describe, it } = testApi;

const ROOT = path.join(__dirname, '..');
const app = require(path.join(ROOT, 'app.json'));

describe('anti-purge regression guard', () => {
  it('every mfs_db fingerprint is claimed by at least one driver in app.json', function () {
    if (typeof this.timeout === 'function') {this.timeout(60000);}
    const allClaims = new Set();
    for (const d of app.drivers) {
      for (const m of d.zigbee?.manufacturerName || []) {allClaims.add(String(m).toLowerCase());}
    }
    const mfs = JSON.parse(fs.readFileSync(path.join(ROOT, 'data', 'mfs_db.json'), 'utf8'));
    const unclaimed = [];
    for (const fp of Object.keys(mfs)) {
      // ignorer les pseudo-entrées non-zigbee (marques, placeholders)
      if (!/^[A-Z]?_?(tz|ty|tze)[a-z0-9]{2,5}_/i.test(fp) && !fp.startsWith('_T')) {continue;}
      if (!allClaims.has(fp.toLowerCase())) {unclaimed.push(fp);}
    }
    assert.deepStrictEqual(unclaimed, [],
      `${unclaimed.length} empreinte(s) mfs_db non couvertes: ${unclaimed.slice(0, 10).join(', ')}`);
  });
});
