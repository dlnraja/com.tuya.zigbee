'use strict';

/**
 * P2571 — T26439 → OUR app Contre quoi
 *
 * Contre quoi:
 * - Hejhome c8ipbljq bleed back to switch_3gang
 * - knob dimmer tgeqdjgk bleed back to switch_1gang
 * - vvmbj46n collision lcdtemphumidsensor_3
 * - radar ex3rcdha / bed seq9cm6u misrouted
 * - harvest/enrich invent pid or forum POST
 */

const { describe, it } = require('node:test');
const assert = require('node:assert/strict');
const fs = require('fs');
const path = require('path');

const ROOT = path.join(__dirname, '..', '..');

function compose(driverId) {
  return JSON.parse(fs.readFileSync(path.join(ROOT, 'drivers', driverId, 'driver.compose.json'), 'utf8'));
}

function hasCouple(driverId, mfrTail, pid) {
  const z = compose(driverId).zigbee || {};
  const mfrOk = (z.manufacturerName || []).some((m) => {
    const parts = String(m).split('_');
    return parts[parts.length - 1].toLowerCase() === mfrTail.toLowerCase();
  });
  const pidOk = (z.productId || []).some((p) => String(p).toUpperCase() === String(pid).toUpperCase());
  return mfrOk && pidOk;
}

function hasTail(driverId, mfrTail) {
  const z = compose(driverId).zigbee || {};
  return (z.manufacturerName || []).some((m) => {
    const parts = String(m).split('_');
    return parts[parts.length - 1].toLowerCase() === mfrTail.toLowerCase();
  });
}

describe('P2571 T26439 complementary OUR app', () => {
  it('harvest + enrich tools exist and stay silent/complementary', () => {
    const harvest = fs.readFileSync(path.join(ROOT, 'tools/ci/p2571-t26439-deep-harvest.js'), 'utf8');
    const enrich = fs.readFileSync(path.join(ROOT, 'tools/ci/p2571-t26439-complementary-enrich.js'), 'utf8');
    assert.ok(harvest.includes('notJohanRepo') || harvest.includes('Never touches Johan'));
    assert.ok(harvest.includes('forumPost: false') || harvest.includes('Never posts'));
    assert.ok(enrich.includes('ComplementaryMerge'));
    assert.ok(enrich.includes('appendExactIdentityForms'));
    assert.ok(enrich.includes('neverInventPid') || enrich.includes('Never invent') || enrich.includes('invent pid'));
    assert.ok(!enrich.includes('forum-responder') && !enrich.includes('post-forum'));
  });

  it('Hejhome Pika c8ipbljq locks on 6-gang EF00 only', () => {
    assert.equal(hasCouple('wall_switch_6_gang_tuya', 'c8ipbljq', 'TS0601'), true);
    assert.equal(hasTail('switch_3gang', 'c8ipbljq'), false);
  });

  it('knob dimmer tgeqdjgk locks on wall_dimmer_tuya only', () => {
    assert.equal(hasCouple('wall_dimmer_tuya', 'tgeqdjgk', 'TS0601'), true);
    assert.equal(hasCouple('wall_dimmer_tuya', 'tgeqdjgk', 'TS0601') && hasTail('switch_1gang', 'tgeqdjgk'), false);
    assert.equal(hasTail('switch_1gang', 'tgeqdjgk'), false);
  });

  it('LCD vvmbj46n single driver (no _3 collision)', () => {
    assert.equal(hasCouple('lcdtemphumidsensor', 'vvmbj46n', 'TS0601'), true);
    assert.equal(hasTail('lcdtemphumidsensor_3', 'vvmbj46n'), false);
  });

  it('radar / bed / soil / lux tip couples stay correct', () => {
    assert.equal(hasCouple('presence_sensor_radar', 'ex3rcdha', 'TS0601'), true);
    assert.equal(hasCouple('presence_sensor_radar', 'debczeci', 'TS0601'), true);
    assert.equal(hasCouple('bed_sensor', 'seq9cm6u', 'TS0601'), true);
    assert.equal(hasCouple('soil_sensor', 'myd45weu', 'TS0601'), true);
    assert.equal(hasCouple('light_sensor_outdoor', 'aaeasoll', 'TS0601'), true);
  });

  it('m1cvyneb sacred dimmer untouched', () => {
    assert.equal(hasCouple('wall_dimmer_tuya', 'm1cvyneb', 'TS0601'), true);
  });
});
