'use strict';

/**
 * P2347 — Full batch: Gabriel verified-only, A_Tas MISSING_PID lock, Cam NEED_DIAG, Peter ABSENT
 */
const { describe, it } = require('node:test');
const assert = require('node:assert/strict');
const fs = require('fs');
const path = require('path');

const ROOT = path.join(__dirname, '../..');

function loadJson(rel) {
  return JSON.parse(fs.readFileSync(path.join(ROOT, rel), 'utf8'));
}

function couplePinned(mfr, pid, driverId) {
  const ssot = loadJson('config/architecture/publish-sacred-keep-couples.json');
  return ssot.couples.some(
    (c) => c.driverId === driverId
      && String(c.mfr).toLowerCase() === mfr.toLowerCase()
      && String(c.pid).toUpperCase() === pid.toUpperCase(),
  );
}

describe('P2347 Gabriel/A_Tas/Cam/Peter batch', () => {
  it('pins Gabriel 1-gang HS couples on wall_switch_1gang_1way', () => {
    for (const mfr of ['_TZ3000_OVYAISIP', '_TZ3000_PK8TGTDB']) {
      assert.ok(couplePinned(mfr, 'TS0001', 'wall_switch_1gang_1way'), mfr);
    }
  });

  it('pins Gabriel 2-gang couples on wall_switch_2gang_1way', () => {
    for (const mfr of ['_TZ3000_YWUBFUVT', '_TZ3000_KGXEJ1DV', '_TZ3000_JJDKHUEQ']) {
      assert.ok(couplePinned(mfr, 'TS0002', 'wall_switch_2gang_1way'), mfr);
    }
  });

  it('pins YERVJNLJ+TS0003 and R731ZLXK 6-gang', () => {
    assert.ok(couplePinned('_TZ3000_YERVJNLJ', 'TS0003', 'wall_switch_3gang_1way'));
    assert.ok(couplePinned('_TZE200_R731ZLXK', 'TS0601', 'wall_switch_6_gang_tuya'));
    assert.ok(couplePinned('_TZE284_R731ZLXK', 'TS0601', 'wall_switch_6_gang_tuya'));
  });

  it('Gabriel catalog has no Cartesian wall_dimmer DO_NOT_LOCK stubs', () => {
    const cat = loadJson('data/user-impact-catalog.json');
    const g = cat.users.Gabriel_Pedrosa_Mach;
    assert.ok(g.devices.length >= 15);
    const bad = g.devices.filter(
      (d) => d.driver === 'wall_dimmer_tuya'
        || (d.couple && /OVYAISIP\+TS000[23]|OVYAISIP\+TS0601|PK8TGTDB\+TS000[23]|PK8TGTDB\+TS0601/i.test(d.couple)),
    );
    assert.strictEqual(bad.length, 0, JSON.stringify(bad));
    assert.ok(Array.isArray(g.forbiddenInvent) && g.forbiddenInvent.length >= 2);
  });

  it('A_Tas catalog marks NEED_DIAG and Z2M couple source', () => {
    const a = loadJson('data/user-impact-catalog.json').users.A_Tas;
    assert.ok(a.devices[0].needDiag);
    assert.ok(/Z2M|MISSING_PID/i.test(a.devices[0].coupleSource || ''));
    assert.strictEqual(a.devices[0].couple, '_TZ3218_t9ynfz4x+TS0225');
  });

  it('Cam has motion lock + smart button NEED_DIAG', () => {
    const c = loadJson('data/user-impact-catalog.json').users.Cam;
    assert.ok(c.devices.some((d) => d.couple === 'HOBEIAN+ZG-204ZL'));
    const btn = c.devices.find((d) => d.needDiag && /button/i.test(d.tile || ''));
    assert.ok(btn);
    assert.strictEqual(btn.couple, null);
    assert.ok(couplePinned('_TZ3000_5bpeda8u', 'TS0041', 'button_wireless_1'));
  });

  it('Peter #2190 stays couple-absent with forbidden invent', () => {
    const p = loadJson('data/user-impact-catalog.json').users.Peter_van_Werkhoven;
    assert.ok(p.needDiag);
    assert.ok(p.devices.every((d) => d.couple == null));
    assert.ok(p.forbiddenInvent.some((x) => /k4ej3ww2/i.test(x)));
  });

  it('Peter_N routes soil MYD45WEU not wall_dimmer', () => {
    const n = loadJson('data/user-impact-catalog.json').users.Peter_N;
    assert.strictEqual(n.devices[0].driver, 'soil_sensor');
    assert.ok(/myd45weu/i.test(n.devices[0].couple));
  });
});
