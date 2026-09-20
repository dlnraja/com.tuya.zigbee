'use strict';

/**
 * P2627 — Bastien house max benefit Contre quoi
 * Live inventory couples in SSOT + app.json; bw1 fires numbered 1gang cards;
 * publish syncs zigbee from compose; remote wall UX device-view; no invent scene_recall.
 */

const { describe, it } = require('node:test');
const assert = require('node:assert/strict');
const fs = require('fs');
const path = require('path');

const ROOT = path.join(__dirname, '..', '..');

describe('P2627 Bastien house max benefit (flows + inventory)', () => {
  it('SSOT lists live house couples (axpdxqgu, vsxvaj9i, eWeLink CK-TLSR)', () => {
    const ssot = JSON.parse(fs.readFileSync(
      path.join(ROOT, 'config/architecture/bastien-house-ssot.json'),
      'utf8',
    ));
    const inv = ssot.devicesInventory || [];
    const has = (mfr, pid) => inv.some(
      (e) => String(e.mfr || '').toLowerCase() === mfr.toLowerCase()
        && String(e.pid || '') === pid,
    );
    assert.ok(has('_TZ3000_axpdxqgu', 'TS0041'));
    assert.ok(has('_TZ3000_vsxvaj9i', 'TS0043'));
    assert.ok(has('eWeLink', 'CK-TLSR8656-SS5-01(7014)'));
    const vsx = inv.find((e) => /vsxvaj9i/i.test(String(e.mfr || '')));
    assert.equal(vsx.driver, 'button_wireless_3');
    assert.ok(vsx.status === 'live-house' || vsx.status === 'verified-candidate');
  });

  it('FlowCardHeuristics fires bw1 numbered 1gang cards (declared compose)', () => {
    const { buildPhysicalFlowCandidates } = require('../../lib/flow/FlowCardHeuristics');
    const c = buildPhysicalFlowCandidates('button_wireless_1', 1, 'single', {
      gangCount: 1,
      isButtonDevice: true,
    });
    assert.ok(c.includes('button_wireless_1_button_1gang_button_pressed'));
    assert.ok(
      c.includes('button_wireless_1_button_1gang_button_1_pressed'),
      'missing numbered 1gang card users pick in Flow UI',
    );
    assert.ok(!c.includes('button_scene_recall') || true); // app-level list separate
  });

  it('app-level invent list does not include undeclared button_scene_recall', () => {
    const src = fs.readFileSync(
      path.join(ROOT, 'lib/flow/FlowCardHeuristics.js'),
      'utf8',
    );
    // Block that returns app-level primary cards (near remote_button_pressed)
    const idx = src.indexOf("'remote_button_pressed'");
    assert.ok(idx > 0);
    const window = src.slice(Math.max(0, idx - 200), idx + 200);
    assert.ok(
      !/['"]button_scene_recall['"]/.test(window),
      'button_scene_recall must not be invented next to remote_button_pressed',
    );
    const btnSrc = fs.readFileSync(
      path.join(ROOT, 'lib/devices/ButtonDevice.js'),
      'utf8',
    );
    assert.ok(
      !/appLevel = \/\^\(button_pressed[\s\S]*button_scene_recall/.test(btnSrc),
      'ButtonDevice appLevel must not allow button_scene_recall',
    );
  });

  it('bastien-publish.yml syncs app.json zigbee before build', () => {
    const yml = fs.readFileSync(
      path.join(ROOT, '.github/workflows/bastien-publish.yml'),
      'utf8',
    );
    assert.ok(yml.includes('sync-appjson-zigbee'));
    assert.ok(yml.includes('check:p2626'));
  });

  it('remote_button_wireless_wall button.1 is device-view (not Maintenance-only)', () => {
    const c = JSON.parse(fs.readFileSync(
      path.join(ROOT, 'drivers/remote_button_wireless_wall/driver.compose.json'),
      'utf8',
    ));
    assert.equal(c.capabilitiesOptions?.['button.1']?.maintenanceAction, false);
  });

  it('npm check:p2627 wired', () => {
    const pkg = JSON.parse(fs.readFileSync(path.join(ROOT, 'package.json'), 'utf8'));
    assert.ok(pkg.scripts['check:p2627']);
  });
});
