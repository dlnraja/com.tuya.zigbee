'use strict';
/**
 * P2623 — Homey App Settings must call Homey.ready() BEFORE heavy UI/mesh/LAN.
 * Contre quoi: blank infinite loader / white page when Configure is opened.
 * Dual-app: BOTH (+ Bastien house track).
 */
const { describe, it } = require('node:test');
const assert = require('node:assert');
const fs = require('fs');
const path = require('path');

const ROOT = path.join(__dirname, '..', '..');
const SETTINGS = path.join(ROOT, 'settings', 'index.html');

describe('P2623 settings Homey.ready early boot', () => {
  it('settings/index.html exists', () => {
    assert.ok(fs.existsSync(SETTINGS), 'settings/index.html missing');
  });

  it('defines onHomeyReady and calls ready() before heavy boot', () => {
    const html = fs.readFileSync(SETTINGS, 'utf8');
    assert.ok(html.includes('P2623'), 'must document P2623');
    assert.ok(/function\s+onHomeyReady\s*\(/.test(html), 'onHomeyReady required');
    assert.ok(/homey\.ready\s*\(/.test(html), 'homey.ready() required');
    assert.ok(html.includes('__tuyaSettingsBoot'), 'deferred boot via __tuyaSettingsBoot');

    const readyIdx = html.indexOf('homey.ready');
    const bootIdx = html.indexOf('window.__tuyaSettingsBoot = function');
    assert.ok(readyIdx > 0, 'ready() call present');
    assert.ok(bootIdx > readyIdx, 'Homey.ready stub must appear before __tuyaSettingsBoot definition');
  });

  it('does not auto-scan LAN or mesh on open (freeze WebView)', () => {
    const html = fs.readFileSync(SETTINGS, 'utf8');
    // Contre quoi: setTimeout(... refreshWifiLanMap) or TuyaZigbeeMap.init inside early path
    assert.ok(
      !/setTimeout\s*\(\s*function\s*\(\s*\)\s*\{\s*refreshWifiLanMap/.test(html),
      'must not auto-call refreshWifiLanMap on open'
    );
    // Mesh must be opt-in (btn-show-mesh) or at least not init in head before ready
    const headEnd = html.indexOf('</head>');
    const head = html.slice(0, headEnd);
    assert.ok(
      !head.includes('zigbee-map.js'),
      'zigbee-map.js must not load in <head> before onHomeyReady stub'
    );
    assert.ok(
      html.includes('btn-show-mesh') || html.includes('do NOT auto-scan'),
      'mesh/LAN must be deferred (button or explicit no-auto comment)'
    );
  });

  it('exposes window.onHomeyReady for Homey WebView', () => {
    const html = fs.readFileSync(SETTINGS, 'utf8');
    assert.ok(
      html.includes('window.onHomeyReady = onHomeyReady'),
      'window.onHomeyReady assignment required'
    );
  });
});
