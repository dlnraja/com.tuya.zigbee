'use strict';

/**
 * P2768 — Homey loads repair views only from drivers/<id>/repair/<view>.html.
 * Every driver declaring a "configure" repair view must ship that file, and the
 * view must talk to the TuyaLocalDriver.onRepair handlers and close the session.
 */

const { describe, it } = require('node:test');
const assert = require('node:assert/strict');
const fs = require('fs');
const path = require('path');

const root = path.join(__dirname, '../..');
const driversDir = path.join(root, 'drivers');

function driversWithConfigureRepair() {
  const out = [];
  for (const id of fs.readdirSync(driversDir)) {
    const f = path.join(driversDir, id, 'driver.compose.json');
    if (!fs.existsSync(f)) {continue;}
    let j;
    try { j = JSON.parse(fs.readFileSync(f, 'utf8')); } catch (_e) { continue; }
    if ((j.repair || []).some((r) => r && r.id === 'configure')) {out.push(id);}
  }
  return out;
}

describe('P2768 WiFi repair views', () => {
  const ids = driversWithConfigureRepair();

  it('at least one driver declares a configure repair view', () => {
    assert.ok(ids.length > 0);
  });

  it('every declared configure repair view exists under repair/', () => {
    const missing = ids.filter((id) => !fs.existsSync(path.join(driversDir, id, 'repair', 'configure.html')));
    assert.deepEqual(missing, []);
  });

  it('repair views emit configure / refresh_key and close with Homey.done()', () => {
    for (const id of ids) {
      const html = fs.readFileSync(path.join(driversDir, id, 'repair', 'configure.html'), 'utf8');
      assert.match(html, /emit\(\s*'configure'/, `${id}: emits configure`);
      assert.match(html, /emit\(\s*'refresh_key'/, `${id}: emits refresh_key`);
      assert.match(html, /\.done\(\)/, `${id}: calls Homey.done()`);
      assert.match(html, /onHomeyReady/, `${id}: Homey webview entry point`);
    }
  });

  it('TuyaLocalDriver.onRepair registers the handlers used by the view', () => {
    const src = fs.readFileSync(path.join(root, 'lib/tuya-local/TuyaLocalDriver.js'), 'utf8');
    const body = src.slice(src.indexOf('async onRepair('));
    assert.match(body, /setHandler\('configure'/);
    assert.match(body, /setHandler\('refresh_key'/);
  });

  it('.homeyignore does not exclude repair views', () => {
    const f = path.join(root, '.homeyignore');
    if (!fs.existsSync(f)) {return;}
    assert.doesNotMatch(fs.readFileSync(f, 'utf8'), /(^|\/)repair\b/m);
  });
});
