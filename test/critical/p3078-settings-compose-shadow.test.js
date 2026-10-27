'use strict';
// P3078: a driver.settings.compose.json replaces the settings block of
// driver.compose.json at build time. The bot version bump rebuilds app.json
// from compose, so a setting written only in driver.compose.json silently
// disappears (9.0.1602 dropped adaptive lighting on 23 lights and the energy
// source label on 10 metered drivers). Keep these P3067 settings in the file
// that the build actually reads.
const assert = require('assert');
const fs = require('fs');
const path = require('path');

const ROOT = path.join(__dirname, '..', '..');
const GUARDED = ['adaptive_lighting', 'adaptive_brightness', 'energy_source'];
const flat = (s) => (s || []).flatMap((x) => (x.children ? x.children : [x]));

describe('P3078 settings survive a compose rebuild (driver.settings.compose.json wins)', () => {
  it('guarded settings declared in driver.compose.json are also in driver.settings.compose.json', () => {
    const dir = path.join(ROOT, 'drivers');
    const shadowed = [];
    for (const id of fs.readdirSync(dir)) {
      const sp = path.join(dir, id, 'driver.settings.compose.json');
      const cp = path.join(dir, id, 'driver.compose.json');
      if (!fs.existsSync(sp) || !fs.existsSync(cp)) { continue; }
      const compose = JSON.parse(fs.readFileSync(cp, 'utf8'));
      const have = new Set(flat(JSON.parse(fs.readFileSync(sp, 'utf8'))).map((x) => x.id));
      for (const s of flat(compose.settings)) {
        if (GUARDED.includes(s.id) && !have.has(s.id)) { shadowed.push(`${id}:${s.id}`); }
      }
    }
    assert.deepStrictEqual(shadowed, []);
  });
});
