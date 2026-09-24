'use strict';
/**
 * P2717 / P2623 — Homey App Settings: Athom-canonical Homey.ready() boot.
 *
 * Contre quoi: blank infinite loader / white page when Configure App is opened
 * (Athom hides WebView until Homey.ready(); heavy zigbee-map before ready traps spinner).
 *
 * Dual-app: BOTH (+ Bastien house track) — same boot contract on every settings/index.html.
 *
 * Docs: https://apps.developer.homey.app/advanced/custom-views/app-settings
 */
const { describe, it } = require('node:test');
const assert = require('node:assert');
const fs = require('fs');
const path = require('path');

const ROOT = path.join(__dirname, '..', '..');

/** Master always; stable/bastien when sibling clones exist (local dual-app layout). */
function settingsCandidates() {
  const list = [
    { label: 'master', file: path.join(ROOT, 'settings', 'index.html'), expectLazyMap: true },
    { label: 'stable', file: path.join(ROOT, '..', 'stable', 'settings', 'index.html'), expectLazyMap: false },
    { label: 'bastien', file: path.join(ROOT, '..', 'bastien', 'settings', 'index.html'), expectLazyMap: true },
  ];
  return list.filter((c) => fs.existsSync(c.file));
}

function extractOnHomeyReady(html) {
  const start = html.lastIndexOf('function onHomeyReady');
  if (start < 0) return '';
  const assign = html.indexOf('window.onHomeyReady', start);
  const end = assign > start ? assign : Math.min(start + 800, html.length);
  return html.slice(start, end);
}

function assertAthomSettingsBoot(html, label, expectLazyMap) {
  assert.ok(/function\s+onHomeyReady\s*\(/.test(html), `${label}: onHomeyReady required`);
  assert.ok(/homey\.ready\s*\(/.test(html), `${label}: homey.ready() required`);
  assert.ok(
    html.includes('window.onHomeyReady = onHomeyReady') || /window\.onHomeyReady\s*=\s*onHomeyReady/.test(html),
    `${label}: window.onHomeyReady assignment required`
  );

  // Contre quoi: old head-stub + __tuyaSettingsBoot race (spinner never dismisses)
  assert.ok(!html.includes('__tuyaSettingsBoot'), `${label}: must not use __tuyaSettingsBoot stub`);

  // ready() must run before bootSettingsUi body (source order inside onHomeyReady)
  const body = extractOnHomeyReady(html);
  assert.ok(body.length > 40, `${label}: onHomeyReady body parseable`);
  const readyIdx = body.indexOf('homey.ready');
  const bootIdx = body.indexOf('bootSettingsUi');
  assert.ok(readyIdx > 0, `${label}: ready() inside onHomeyReady`);
  assert.ok(bootIdx > readyIdx, `${label}: bootSettingsUi must follow ready() inside onHomeyReady`);

  // onHomeyReady at end of body (Athom docs), not a head-only stub
  const headEnd = html.indexOf('</head>');
  const bodyEnd = html.lastIndexOf('</body>');
  const onHomeyIdx = html.lastIndexOf('function onHomeyReady');
  assert.ok(onHomeyIdx > headEnd, `${label}: onHomeyReady must be after </head>`);
  assert.ok(onHomeyIdx < bodyEnd, `${label}: onHomeyReady must be before </body>`);

  // Never sync-load zigbee-map before ready
  assert.ok(
    !/<script[^>]+src=["']zigbee-map\.js["']/.test(html),
    `${label}: must not sync <script src="zigbee-map.js">`
  );
  const head = html.slice(0, headEnd);
  assert.ok(!head.includes('zigbee-map.js'), `${label}: zigbee-map must not be in <head>`);

  if (expectLazyMap) {
    assert.ok(html.includes('loadZigbeeMapScript'), `${label}: lazy map loader required`);
    assert.ok(
      html.includes('btn-show-mesh') || html.includes('do NOT auto-scan'),
      `${label}: mesh must be opt-in`
    );
  }

  assert.ok(
    !/setTimeout\s*\(\s*function\s*\(\s*\)\s*\{\s*refreshWifiLanMap/.test(html),
    `${label}: must not auto-call refreshWifiLanMap on open`
  );
}

describe('P2717 / P2623 settings Homey.ready Athom-canonical boot', () => {
  it('master settings/index.html exists', () => {
    assert.ok(fs.existsSync(path.join(ROOT, 'settings', 'index.html')), 'settings/index.html missing');
  });

  it('every available app track uses ready-first + no sync zigbee-map', () => {
    const candidates = settingsCandidates();
    assert.ok(candidates.length >= 1, 'at least master settings required');
    for (const c of candidates) {
      const html = fs.readFileSync(c.file, 'utf8');
      assert.ok(html.includes('P2717') || html.includes('P2623'), `${c.label}: document P2717/P2623`);
      assertAthomSettingsBoot(html, c.label, c.expectLazyMap);
    }
  });

  it('inline settings scripts parse as JS', () => {
    for (const c of settingsCandidates()) {
      const html = fs.readFileSync(c.file, 'utf8');
      const re = /<script(?![^>]*src=)[^>]*>([\s\S]*?)<\/script>/gi;
      let m;
      while ((m = re.exec(html))) {
        assert.doesNotThrow(() => {
          // eslint-disable-next-line no-new-func
          new Function(m[1]);
        }, `${c.label}: inline script must parse`);
      }
    }
  });
});
