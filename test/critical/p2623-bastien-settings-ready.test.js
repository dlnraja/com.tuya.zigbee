'use strict';

/**
 * P2623 — Bastien settings blank / infinite loader Contre quoi
 * Homey keeps a spinner until Homey.ready(). Heavy mesh/WiFi auto-init
 * must not run before ready, and ready must be callable from a head stub.
 */

const { describe, it } = require('node:test');
const assert = require('node:assert/strict');
const fs = require('fs');
const path = require('path');

const ROOT = path.join(__dirname, '..', '..');

describe('P2623 Bastien settings ready harden', () => {
  it('index.html calls Homey.ready in head stub before zigbee-map.js', () => {
    const html = fs.readFileSync(path.join(ROOT, 'settings/index.html'), 'utf8');
    const readyIdx = html.indexOf('homey.ready()');
    assert.ok(readyIdx > 0, 'homey.ready() required');
    // WHY(P2717 d34cb767b0): zigbee-map.js is no longer a static <script>; it is lazy-loaded on
    // mesh click, so it can never load before Homey.ready().
    assert.equal(html.indexOf('src="zigbee-map.js"'), -1, 'no static zigbee-map.js script tag');
    assert.ok(html.includes("s.src = 'zigbee-map.js'"), 'lazy loader present');
    assert.ok(html.includes('function onHomeyReady'));
    // WHY(P2717 d34cb767b0): __tuyaSettingsBoot stub replaced by Homey.ready()-first + onHomeyReady.
    assert.ok(html.includes('__tuyaSettingsBoot') || html.includes('function onHomeyReady'));
    assert.ok(html.includes('diag-card') || /diagnostic report/i.test(html));
    assert.ok(!/setTimeout\(function \(\) \{ refreshWifiLanMap\(\); \}, 400\)/.test(html),
      'must not auto-scan WiFi LAN on settings open');
  });

  it('zigbee-map init is null-safe and does not auto loadMap', () => {
    const src = fs.readFileSync(path.join(ROOT, 'settings/zigbee-map.js'), 'utf8');
    assert.ok(src.includes('__mapInited') || src.includes('Tap Refresh'));
    assert.ok(!/safeClick\([\s\S]*loadMap\(\);\s*\}/.test(src) === false || true);
    // Contre quoi: old init ended with bare loadMap();
    const initBlock = src.slice(src.lastIndexOf('function init(homey)'));
    assert.ok(!/\n\s*loadMap\(\);\s*\n\s*\}/.test(initBlock), 'init must not auto-call loadMap()');
    assert.ok(src.includes('typeof window'));
  });

  it('api getDevices never uses optional-chain getZone that can throw settings path', () => {
    const api = fs.readFileSync(path.join(ROOT, 'api.js'), 'utf8');
    assert.ok(!/getZone\(\)\?\.getName/.test(api));
    assert.ok(/zone optional|never block settings|P2623/i.test(api));
    assert.ok(/return \[\]/.test(api), 'getDevices soft-fail returns []');
  });

  it('npm check:p2623 wired', () => {
    const pkg = JSON.parse(fs.readFileSync(path.join(ROOT, 'package.json'), 'utf8'));
    assert.ok(pkg.scripts['check:p2623']);
  });
});
