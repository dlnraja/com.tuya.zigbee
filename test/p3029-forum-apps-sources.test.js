'use strict';

/**
 * P3029 Contre quoi: losing the Homey Community Apps-category technique sources from the
 * incremental forum scan, or letting one of them become reply-allowed (read-only only).
 * Also pins the Cadabi couple TS0505B/_TZB210_3zfp8mki (official dev, topic 160757 post 788018)
 * to a single driver.
 */

const { describe, it } = require('node:test');
const assert = require('node:assert/strict');
const fs = require('fs');
const path = require('path');

const ROOT = path.join(__dirname, '..');
const SRC = fs.readFileSync(path.join(ROOT, 'tools/ci/forum-silent-multi-scan.js'), 'utf8');
const IDS = [156, 160590, 160757, 76161, 160554, 158462, 158852, 153712];

describe('P3029 forum Apps-category sources', () => {
  for (const id of IDS) {
    it(`topic ${id} is scanned read-only`, () => {
      const re = new RegExp(`\\{ id: ${id}, name: '[^']+', replyAllowed: false \\}`);
      assert.ok(re.test(SRC), `missing read-only entry for ${id}`);
    });
  }

  it('no duplicate topic ids', () => {
    const ids = [...SRC.matchAll(/\{ id: (\d+),/g)].map((m) => m[1]);
    assert.equal(ids.length, new Set(ids).size);
  });

  it('Cadabi couple TS0505B/_TZB210_3zfp8mki lives in exactly one driver', () => {
    const hits = [];
    for (const d of fs.readdirSync(path.join(ROOT, 'drivers'))) {
      const f = path.join(ROOT, 'drivers', d, 'driver.compose.json');
      if (!fs.existsSync(f)) { continue; }
      const z = (JSON.parse(fs.readFileSync(f, 'utf8')).zigbee) || {};
      const m = (z.manufacturerName || []).some((x) => String(x).toLowerCase() === '_tzb210_3zfp8mki');
      const p = (z.productId || []).some((x) => String(x).toUpperCase() === 'TS0505B');
      if (m && p) { hits.push(d); }
    }
    assert.deepEqual(hits, ['light_bulb_rgb_rgbw']);
  });
});
