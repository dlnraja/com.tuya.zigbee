'use strict';
// P3075: the placeholder "Dynamic card switch_2gang_gangx_scene_b4ab3" got a real title
// (id kept for user flows), and the BSEED 2-gang physical scene path now triggers the
// declared _scene_switch cards instead of an id that never existed.
const { describe, it } = require('../_support/dual-runner');
const assert = require('assert');
const fs = require('fs');
const path = require('path');
const ROOT = path.join(__dirname, '..', '..');

describe('P3075 switch scene card: real title, triggered ids exist', () => {
  const flow = JSON.parse(fs.readFileSync(path.join(ROOT, 'drivers/switch/driver.flow.compose.json'), 'utf8'));
  const ids = new Set(Object.values(flow).flat().map((c) => c.id));
  it('no flow card anywhere carries a placeholder "Dynamic card" title', () => {
    const bad = [];
    for (const d of fs.readdirSync(path.join(ROOT, 'drivers'))) {
      const p = path.join(ROOT, 'drivers', d, 'driver.flow.compose.json');
      if (!fs.existsSync(p)) {continue;}
      const j = JSON.parse(fs.readFileSync(p, 'utf8'));
      for (const c of Object.values(j).flat()) {
        for (const k of ['title', 'titleFormatted']) {
          for (const v of Object.values((c && c[k]) || {})) {
            if (/^(Dynamic card|Carte dynamique) /.test(v)) {bad.push(`${d}:${c.id}`);}
          }
        }
      }
    }
    assert.deepStrictEqual(bad, []);
  });
  it('the any-gang card keeps its id and has en/fr/de/nl titles', () => {
    const c = flow.triggers.find((x) => x.id === 'switch_2gang_gangx_scene_b4ab3');
    assert.ok(c, 'id kept for existing user flows');
    assert.strictEqual(c.title.en, 'Scene triggered on any gang');
    for (const l of ['en', 'fr', 'de', 'nl']) {assert.ok(c.title[l] && c.titleFormatted[l], l);}
  });
  it('device.js only triggers scene ids that are declared', () => {
    const src = fs.readFileSync(path.join(ROOT, 'drivers/switch/device.js'), 'utf8');
    assert.ok(src.includes('`switch_2gang_gang${epNum}_scene_switch`'));
    assert.ok(!/`switch_2gang_gang\$\{epNum\}_scene`/.test(src), 'undeclared bare _scene id gone');
    for (const n of [1, 2]) {assert.ok(ids.has(`switch_2gang_gang${n}_scene_switch`));}
    assert.ok(src.includes("'switch_2gang_gangx_scene_b4ab3'"));
  });
});
