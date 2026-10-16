'use strict';

/**
 * P2827 — Silent enrich from Homey T26439 around #5520 (Johan app thread)
 * Sources (read-only): FrankP TS0042, Axel nqqylykc dimmer, Dragan crq3r3la radar,
 * Mates qja6nq5z knob, Kizabgd LCD typo 9em5sfh→9ern5sfh, Maarten curtain gang2.
 * Contre quoi:
 * - wall_remote_2_gang EP1 missing powerCfg/E000 (battery + scene dead)
 * - tzvbimpq+TS0042 leaves button_wireless_2 / registry
 * - nqqylykc drifts off wall_dimmer_tuya
 * - crq3r3la loses CK-BL702 productId / presence settings path
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

describe('P2827 T26439 #5520 Johan inspire enrich', () => {
  it('wall_remote_2_gang EP1 has powerCfg+OnOff+E000 (Johan TS0042 interview shape)', () => {
    const ep1 = compose('wall_remote_2_gang').zigbee?.endpoints?.['1'];
    const clusters = (ep1?.clusters || []).map(Number);
    for (const c of [0, 1, 6, 57344]) assert.ok(clusters.includes(c), `cluster ${c}`);
    assert.ok((ep1?.bindings || []).map(Number).includes(6));
  });

  it('_TZ3000_tzvbimpq+TS0042 on button_wireless_2 (FrankP / Johan #986)', () => {
    assert.ok(hasMfr('button_wireless_2', 'tzvbimpq'));
    assert.ok((compose('button_wireless_2').zigbee?.productId || []).includes('TS0042'));
  });

  it('_TZE284/_TZE204_nqqylykc+TS0601 on wall_dimmer_tuya (Axel #5516)', () => {
    assert.ok(hasMfr('wall_dimmer_tuya', 'nqqylykc'));
    const src = fs.readFileSync(path.join(ROOT, 'drivers/wall_dimmer_tuya/device.js'), 'utf8');
    assert.match(src, /toTuyaBrightness/);
  });

  it('_TZE200_crq3r3la + CK-BL702-MWS-01 on presence_sensor_radar (Dragan #5534)', () => {
    assert.ok(hasMfr('presence_sensor_radar', 'crq3r3la'));
    const pids = compose('presence_sensor_radar').zigbee?.productId || [];
    assert.ok(pids.some((p) => /CK-BL702-MWS-01/i.test(p)));
  });

  it('_TZ3000_qja6nq5z+TS004F stays smart_knob_rotary (Mates #5532)', () => {
    assert.ok(hasMfr('smart_knob_rotary', 'qja6nq5z'));
  });

  it('LCD typo 9em5sfh is NOT invented; 9ern5sfh stays lcdtemphumidsensor', () => {
    assert.ok(hasMfr('lcdtemphumidsensor', '9ern5sfh'));
    assert.ok(!hasMfr('lcdtemphumidsensor', '9em5sfh'));
    assert.ok(!hasMfr('climate_sensor', '9em5sfh'));
  });

  it('registry locks P2827 sacred couples', () => {
    const reg = JSON.parse(fs.readFileSync(path.join(ROOT, 'data/user-misattribution-registry.json'), 'utf8'));
    const ids = (reg.cases || []).map((c) => c.id);
    assert.ok(ids.includes('p2827-t26439-tzvbimpq-ts0042-button2'));
    assert.ok(ids.includes('p2827-t26439-nqqylykc-wall-dimmer'));
    assert.ok(ids.includes('p2827-t26439-crq3r3la-presence-radar'));
  });

  it('npm check:p2827 wired', () => {
    const pkg = JSON.parse(fs.readFileSync(path.join(ROOT, 'package.json'), 'utf8'));
    assert.ok(pkg.scripts['check:p2827']);
  });
});
