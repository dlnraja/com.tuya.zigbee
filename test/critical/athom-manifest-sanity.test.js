'use strict';
const { describe, it } = require('../_support/dual-runner'); // P3020: same file under node --test and mocha
/** P-KB3: Athom parse-safety guard (lesson 10/10: a {brightness} placeholder in a flow title broke master processing).
 *  Checks the source app.json: no {arg} curly placeholders in titles, no duplicate card/driver ids,
 *  every title has en, driver images exist and stay under 1 MB. */
const fs = require('fs'); const path = require('path'); const assert = require('assert');
const ROOT = path.join(__dirname, '../..');
describe('P-KB3 Athom manifest sanity', function () {
  this.timeout(20000);
  const app = JSON.parse(fs.readFileSync(path.join(ROOT, 'app.json'), 'utf8'));
  const cards = ['triggers', 'conditions', 'actions'].flatMap((k) => ((app.flow || {})[k] || []).map((c) => ({ k, c })));
  it('no {arg} curly placeholder that names a card arg', () => {
    const bad = [];
    for (const { c } of cards) { const a = (c.args || []).map((x) => x.name);
      for (const f of ['title', 'titleFormatted']) for (const s of Object.values(c[f] || {}))
        for (const m of String(s).matchAll(/\{([a-z_]+)\}/gi)) if (a.includes(m[1])) bad.push(`${c.id}:${m[0]}`); }
    assert.deepStrictEqual(bad, []);
  });
  it('no duplicate flow card ids per kind, no duplicate driver ids', () => {
    const seen = new Set(), dup = [];
    for (const { k, c } of cards) { const key = `${k}:${c.id}`; if (seen.has(key)) dup.push(key); seen.add(key); }
    const d = new Set(); for (const x of app.drivers || []) { if (d.has(x.id)) dup.push(`driver:${x.id}`); d.add(x.id); }
    assert.deepStrictEqual(dup, []);
  });
  it('every flow card title has an en string', () => {
    assert.deepStrictEqual(cards.filter(({ c }) => !c.title || typeof c.title.en !== 'string').map(({ c }) => c.id), []);
  });
  it('driver small/large images exist and are <= 1 MB', () => {
    const bad = [];
    for (const d of app.drivers || []) for (const [k, p] of Object.entries(d.images || {})) { if (k === 'xlarge') continue; // xlarge is optional and handled by the build (stable passes without it)
      const f = path.join(ROOT, String(p).replace(/^\//, ''));
      if (!fs.existsSync(f)) bad.push(`${d.id}: missing ${p}`); else if (fs.statSync(f).size > 1024 * 1024) bad.push(`${d.id}: oversize ${p}`);
    }
    assert.deepStrictEqual(bad, []);
  });
});
describe('P-KB4 ay204t capability options', () => {
  it('presence_radar_aoyan_ay204t lists options only for its declared capabilities (compose + app.json)', () => {
    const zf = path.join(ROOT, 'drivers/presence_radar_aoyan_ay204t/driver.compose.json'); if (!fs.existsSync(zf)) return;
    const z = JSON.parse(fs.readFileSync(zf, 'utf8'));
    const a = JSON.parse(fs.readFileSync(path.join(ROOT, 'app.json'), 'utf8')).drivers.find((d) => d.id === 'presence_radar_aoyan_ay204t');
    for (const d of [z, a].filter(Boolean)) assert.deepStrictEqual(Object.keys(d.capabilitiesOptions || {}).filter((k) => !d.capabilities.includes(k)), []);
  });
});
