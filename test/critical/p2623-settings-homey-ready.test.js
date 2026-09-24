'use strict';
/**
 * P2623 — Homey App Settings must call Homey.ready() BEFORE heavy UI/mesh/LAN.
 * Contre quoi: blank infinite loader / white page when Configure is opened.
 * Dual-app: BOTH (+ Bastien house track).
 *
 * P2717 supersedes the head-stub + __tuyaSettingsBoot pattern with Athom-canonical
 * body-end onHomeyReady → ready() then bootSettingsUi. Keep this file as a thin
 * alias so check:p2623 stays green; full matrix lives in p2717-*.test.js.
 */
const { describe, it } = require('node:test');
const assert = require('node:assert');
const fs = require('fs');
const path = require('path');

const ROOT = path.join(__dirname, '..', '..');
const SETTINGS = path.join(ROOT, 'settings', 'index.html');

describe('P2623 settings Homey.ready early boot (compat → P2717)', () => {
  it('settings/index.html exists', () => {
    assert.ok(fs.existsSync(SETTINGS), 'settings/index.html missing');
  });

  it('defines onHomeyReady and calls ready() before heavy boot', () => {
    const html = fs.readFileSync(SETTINGS, 'utf8');
    assert.ok(html.includes('P2623') || html.includes('P2717'), 'must document P2623/P2717');
    assert.ok(/function\s+onHomeyReady\s*\(/.test(html), 'onHomeyReady required');
    assert.ok(/homey\.ready\s*\(/.test(html), 'homey.ready() required');
    assert.ok(/function\s+bootSettingsUi\s*\(/.test(html), 'deferred boot via bootSettingsUi');

    const start = html.lastIndexOf('function onHomeyReady');
    const assign = html.indexOf('window.onHomeyReady', start);
    const body = html.slice(start, assign > start ? assign : start + 800);
    const readyIdx = body.indexOf('homey.ready');
    const bootIdx = body.indexOf('bootSettingsUi');
    assert.ok(readyIdx > 0 && bootIdx > readyIdx, 'Homey.ready() must run before bootSettingsUi');
  });

  it('does not auto-scan LAN or mesh on open (freeze WebView)', () => {
    const html = fs.readFileSync(SETTINGS, 'utf8');
    assert.ok(
      !/setTimeout\s*\(\s*function\s*\(\s*\)\s*\{\s*refreshWifiLanMap/.test(html),
      'must not auto-call refreshWifiLanMap on open'
    );
    const headEnd = html.indexOf('</head>');
    const head = html.slice(0, headEnd);
    assert.ok(!head.includes('zigbee-map.js'), 'zigbee-map.js must not load in <head>');
    assert.ok(
      !/<script[^>]+src=["']zigbee-map\.js["']/.test(html),
      'must not sync-load zigbee-map.js'
    );
    assert.ok(
      html.includes('btn-show-mesh') || html.includes('do NOT auto-scan') || html.includes('loadZigbeeMapScript'),
      'mesh/LAN must be deferred (button or explicit no-auto)'
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
