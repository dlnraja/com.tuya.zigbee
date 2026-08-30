'use strict';

/**
 * P2324 — FCU OFF/setpoint (#532) + Moes curtain FPDB (#533)
 */
const assert = require('assert');
const { describe, it } = require('node:test');
const fs = require('fs');
const path = require('path');

describe('P2324 wall_thermostat FCU TX order', () => {
  const src = fs.readFileSync(path.join(__dirname, '../../drivers/wall_thermostat/device.js'), 'utf8');

  it('defines _ensureFcuManualForTx gated on confirmation', () => {
    assert.match(src, /_ensureFcuManualForTx/);
    assert.match(src, /_fcuManualDpConfirmed/);
    assert.match(src, /skip DP101 pre-TX/);
  });

  it('sends onoff DP1 before optional DP101', () => {
    const onoffBlock = src.match(/registerCapabilityListener\('onoff'[\s\S]{0,800}?finally/);
    assert.ok(onoffBlock, 'onoff listener');
    const body = onoffBlock[0];
    const dp1 = body.indexOf('BHT_DATA_POINTS.onOff');
    const dp101 = body.indexOf('_ensureFcuManualForTx');
    assert.ok(dp1 >= 0 && dp101 > dp1, 'DP1 before DP101 helper');
  });

  it('forces magic/heal on FCU init', () => {
    assert.match(src, /forceMagic:\s*true/);
    assert.match(src, /healZigbeeNodeIdentity/);
  });

  it('throws on sendDP soft-fail', () => {
    assert.match(src, /FCU\/BHT DP\$\{dp\} bool TX failed/);
  });
});

describe('P2324 curtain 5slehgeo lock', () => {
  it('DeviceFingerprintDB maps 5slehgeo → curtain_motor', () => {
    const db = fs.readFileSync(path.join(__dirname, '../../lib/DeviceFingerprintDB.js'), 'utf8');
    assert.match(db, /_TZE204_5slehgeo\|TS0601[\s\S]{0,120}curtain_motor/);
  });

  it('registry forbids TRV/generic for ZTS-EUR-C couple', () => {
    const reg = JSON.parse(fs.readFileSync(path.join(__dirname, '../../data/user-misattribution-registry.json'), 'utf8'));
    const hit = (reg.cases || []).find((e) => e && e.id === 'p2304-moes-zts-eur-c-curtain');
    assert.ok(hit, 'registry entry');
    assert.ok(hit.forbiddenDrivers.includes('radiator_valve'));
    assert.ok(hit.forbiddenDrivers.includes('generic_tuya'));
    assert.ok(!hit.forbiddenDrivers.includes('wall_thermostat'));
  });

  it('generic_tuya no longer steals mpbki2zm-TS0601 compound', () => {
    const raw = fs.readFileSync(path.join(__dirname, '../../drivers/generic_tuya/driver.compose.json'), 'utf8');
    assert.ok(!/_TZE204_mpbki2zm-TS0601/i.test(raw));
  });
});
