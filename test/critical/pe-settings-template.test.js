'use strict';
/** P-KB4: Z2M-style options exposed through the shared template, all off by default; compose and app.json aligned. */
const assert = require('assert'); const fs = require('fs'); const path = require('path');
const ROOT = path.join(__dirname, '../..');
const T = JSON.parse(fs.readFileSync(path.join(ROOT, '.homeycompose/drivers/settings/pe_report_options.json'), 'utf8'));
const PE = require('../../lib/profile-engine/ProfileEngine');
describe('P-KB4 profile options settings template', () => {
  it('every option defaults to off/empty; only the layer switch is on', () => {
    for (const c of T.children) {
      if (c.id === 'profile_engine') assert.strictEqual(c.value, true);
      else assert.ok(c.value === 0 || c.value === false || c.value === '', c.id);
    }
  });
  it('ids match what ProfileLayerAttach reads', () => {
    const src = fs.readFileSync(path.join(ROOT, 'lib/profile-engine/ProfileLayerAttach.js'), 'utf8') + fs.readFileSync(path.join(ROOT, 'lib/profile-engine/transition.js'), 'utf8') + fs.readFileSync(path.join(ROOT, 'lib/profile-engine/groups.js'), 'utf8');
    for (const c of T.children) assert.ok(src.includes(`'${c.id}'`), c.id);
  });
  it('drivers extending the template carry it in app.json too (aligned), and stay few (size budget)', () => {
    const app = JSON.parse(fs.readFileSync(path.join(ROOT, 'app.json'), 'utf8'));
    const users = fs.readdirSync(path.join(ROOT, 'drivers')).filter((d) => { try { return fs.readFileSync(path.join(ROOT, 'drivers', d, 'driver.compose.json'), 'utf8').includes('"pe_report_options"'); } catch { return false; } });
    assert.ok(users.length >= 1 && users.length <= 40, `users=${users.length}`);
    for (const id of users) { const d = app.drivers.find((x) => x.id === id); assert.ok(d && JSON.stringify(d.settings).includes('"pe_debounce_ms"'), id); }
  });
  it('each profile match couple belongs to a driver that exposes the template', () => {
    const app = JSON.parse(fs.readFileSync(path.join(ROOT, 'app.json'), 'utf8'));
    for (const [k] of PE.load()) { const [mfr, pid] = k.split('|');
      const owners = app.drivers.filter((d) => (d.zigbee?.manufacturerName || []).some((m) => m.toLowerCase() === mfr) && (d.zigbee?.productId || []).some((p) => p.toUpperCase() === pid));
      for (const d of owners) assert.ok(JSON.stringify(d.settings).includes('"pe_debounce_ms"'), `${d.id} for ${k}`); }
  });
});
