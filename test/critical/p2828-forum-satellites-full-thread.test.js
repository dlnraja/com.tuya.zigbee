'use strict';

/**
 * P2828 — Full T26439 + satellite threads silent harvest Contre quoi
 * Topics: 26439 (full), 89271 archive, 150690 Relax Moes, 156967 Moes,
 * 154092 Zemismart, 120477 rain, 146667 HOBEIAN, 99614 Nous, multi-silent digest.
 * Contre quoi:
 * - OCR invent 9em5sfh / tgvtvdox / w8jwczz / TZE28C100000_ wrong pad
 * - wall_remote_3_gang TS0043 loses powerCfg/E000 (battery+scene dead)
 * - w8jwkczz+TS0043 / tgvtvdoc+TS0207 / 3mzb0sdz curtain drift
 * Dual-app: BOTH. No invent pid. No forum POST.
 */

const { describe, it } = require('node:test');
const assert = require('node:assert/strict');
const fs = require('fs');
const path = require('path');

const ROOT = path.join(__dirname, '..', '..');

function compose(id) {
  return JSON.parse(fs.readFileSync(path.join(ROOT, 'drivers', id, 'driver.compose.json'), 'utf8'));
}

function hasMfr(driverId, needle) {
  return (compose(driverId).zigbee?.manufacturerName || [])
    .some((m) => String(m).toLowerCase().includes(String(needle).toLowerCase()));
}

function hasPid(driverId, pid) {
  return (compose(driverId).zigbee?.productId || [])
    .some((p) => String(p).toLowerCase() === String(pid).toLowerCase());
}

describe('P2828 forum satellites + full T26439 silent treat', () => {
  it('wall_remote_3_gang EP1–3 have powerCfg+OnOff+E000 (Moes TS0043)', () => {
    const eps = compose('wall_remote_3_gang').zigbee?.endpoints || {};
    for (const ep of ['1', '2', '3']) {
      const clusters = (eps[ep]?.clusters || []).map(Number);
      for (const c of [0, 1, 6, 57344]) {
        assert.ok(clusters.includes(c), `EP${ep} missing cluster ${c}`);
      }
      assert.ok((eps[ep]?.bindings || []).map(Number).includes(6), `EP${ep} OnOff bind`);
    }
  });

  it('_TZ3000_w8jwkczz+TS0043 on wall_remote_3_gang (not OCR w8jwczz)', () => {
    assert.ok(hasMfr('wall_remote_3_gang', 'w8jwkczz'));
    assert.ok(hasPid('wall_remote_3_gang', 'TS0043'));
    assert.ok(!hasMfr('wall_remote_3_gang', 'w8jwczz'));
  });

  it('_TZ3210_tgvtvdoc+TS0207 on rain_sensor (not OCR tgvtvdox)', () => {
    assert.ok(hasMfr('rain_sensor', 'tgvtvdoc'));
    assert.ok(hasPid('rain_sensor', 'TS0207'));
    assert.ok(!hasMfr('rain_sensor', 'tgvtvdox'));
  });

  it('Zemismart ZM16B short+long 3mzb0sdz on curtain_motor', () => {
    assert.ok(hasMfr('curtain_motor', '_TZE284_3mzb0sdz') || hasMfr('curtain_motor', '3mzb0sdz'));
    const mfrs = (compose('curtain_motor').zigbee?.manufacturerName || []).map((m) => String(m).toLowerCase());
    assert.ok(mfrs.some((m) => m.includes('3mzb0sdz')));
    assert.ok(mfrs.some((m) => m.includes('tze2841000000_3mzb0sdz') || m.includes('_tze2841000000_3mzb0sdz')));
    assert.ok(hasPid('curtain_motor', 'TS0601'));
  });

  it('LCD OCR 9em5sfh never invented; 9ern5sfh stays lcd', () => {
    assert.ok(hasMfr('lcdtemphumidsensor', '9ern5sfh'));
    assert.ok(!hasMfr('lcdtemphumidsensor', '9em5sfh'));
    for (const d of fs.readdirSync(path.join(ROOT, 'drivers'))) {
      const p = path.join(ROOT, 'drivers', d, 'driver.compose.json');
      if (!fs.existsSync(p)) continue;
      const raw = fs.readFileSync(p, 'utf8');
      assert.ok(!/9em5sfh/i.test(raw), `invent OCR in ${d}`);
    }
  });

  it('verified satellite couples stay home', () => {
    assert.ok(hasMfr('scene_switch_4', 'zgyzgdua') && hasPid('scene_switch_4', 'TS0044'));
    assert.ok(hasMfr('button_wireless_1', '4upl1fcj') && hasPid('button_wireless_1', 'TS0041'));
    assert.ok(hasMfr('switch_2gang', 'zmy4lslw') && hasPid('switch_2gang', 'TS0002'));
    assert.ok(hasMfr('smartPlug_DinRail', 'cayepv1a'));
    assert.ok(hasMfr('soil_sensor', 'npj9bug3'));
  });

  it('registry locks P2828 OCR + Moes/rain', () => {
    const reg = JSON.parse(fs.readFileSync(path.join(ROOT, 'data/user-misattribution-registry.json'), 'utf8'));
    const ids = (reg.cases || []).map((c) => c.id);
    assert.ok(ids.includes('p2828-ocr-9em5sfh-not-invent'));
    assert.ok(ids.includes('p2828-w8jwkczz-ts0043-wall-remote-3'));
    assert.ok(ids.includes('p2828-tgvtvdoc-ts0207-rain'));
  });

  it('harvest artifacts present (silent treat evidence)', () => {
    assert.ok(fs.existsSync(path.join(ROOT, 'reports/forum-t26439-2026-10-16/COUPLE_AGG.json')));
    assert.ok(fs.existsSync(path.join(ROOT, 'reports/forum-satellites-2026-10-16/FLEET_GAP.json')));
    assert.ok(fs.existsSync(path.join(ROOT, '.github/state/forum/multi-silent-digest.json')));
  });

  it('npm check:p2828 wired', () => {
    const pkg = JSON.parse(fs.readFileSync(path.join(ROOT, 'package.json'), 'utf8'));
    assert.ok(pkg.scripts['check:p2828']);
  });
});
