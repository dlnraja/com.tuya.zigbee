'use strict';

/**
 * P2836 Contre quoi: Homey #zigbee tag → Sonoff SWV couples stay on
 * water_valve_garden (ZCL); never button_wireless_4 / EF00 water_valve_smart phantoms.
 */

const { describe, it } = require('node:test');
const assert = require('node:assert/strict');
const fs = require('fs');
const path = require('path');

const ROOT = path.join(__dirname, '..', '..');

function compose(driver) {
  return JSON.parse(fs.readFileSync(path.join(ROOT, 'drivers', driver, 'driver.compose.json'), 'utf8'));
}

function hasMfr(driver, name) {
  const mfrs = compose(driver).zigbee?.manufacturerName || [];
  return mfrs.some((m) => String(m).toLowerCase() === String(name).toLowerCase());
}

function hasPid(driver, pid) {
  const pids = compose(driver).zigbee?.productId || [];
  return pids.some((p) => String(p).toUpperCase() === String(pid).toUpperCase());
}

describe('P2836 forum #zigbee tag — Sonoff SWV', () => {
  it('SSOT + harvest script exist', () => {
    assert.ok(fs.existsSync(path.join(ROOT, 'config/architecture/forum-zigbee-tag-ssot.json')));
    assert.ok(fs.existsSync(path.join(ROOT, 'tools/ci/p2836-forum-zigbee-tag-harvest.js')));
  });

  it('UNION: SONOFF/eWeLink + SWV-ZFU on water_valve_garden (ZCL 0/1/6)', () => {
    assert.ok(hasMfr('water_valve_garden', 'SONOFF'));
    assert.ok(hasMfr('water_valve_garden', 'eWeLink'));
    assert.ok(hasPid('water_valve_garden', 'SWV-ZFU'));
    assert.ok(hasPid('water_valve_garden', 'SWV'));
    // Contre quoi: no TS0601 on garden — avoids SONOFF|TS0601 / eWeLink|TS0601 couple collisions
    assert.equal(hasPid('water_valve_garden', 'TS0601'), false);
    const clusters = compose('water_valve_garden').zigbee?.endpoints?.['1']?.clusters || [];
    assert.ok(clusters.includes(6), 'garden must keep OnOff cluster 6 for Sonoff SWV');
  });

  it('Contre quoi: SWV pids stripped from button_wireless_4 and water_valve_smart', () => {
    assert.equal(hasPid('button_wireless_4', 'SWV-ZFU'), false);
    assert.equal(hasPid('button_wireless_4', 'SWV-ZN'), false);
    assert.equal(hasPid('water_valve_smart', 'SWV-ZFU'), false);
    assert.equal(hasPid('water_valve_smart', 'SWV'), false);
  });

  it('misattribution registry locks Sonoff SWV → garden', () => {
    const reg = JSON.parse(fs.readFileSync(path.join(ROOT, 'data/user-misattribution-registry.json'), 'utf8'));
    const hit = (reg.cases || []).find((c) => c.id === 'p2836-sonoff-swv-water-valve-garden');
    assert.ok(hit);
    assert.equal(hit.canonicalDriver, 'water_valve_garden');
    assert.ok((hit.forbiddenDrivers || []).includes('button_wireless_4'));
    assert.ok((hit.forbiddenDrivers || []).includes('water_valve_smart'));
  });

  it('silent scan includes #zigbee satellite topic ids', () => {
    const src = fs.readFileSync(path.join(ROOT, 'tools/ci/forum-silent-multi-scan.js'), 'utf8');
    for (const id of [157743, 160737, 101901, 36418]) {
      assert.ok(src.includes(String(id)), `DEFAULT_TOPICS must include ${id}`);
    }
  });
});
