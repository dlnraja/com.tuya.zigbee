'use strict';

/**
 * P2572 — Johan mega issues/PRs → OUR app Contre quoi
 */

const { describe, it } = require('node:test');
const assert = require('node:assert/strict');
const fs = require('fs');
const path = require('path');

const ROOT = path.join(__dirname, '..', '..');

function hasCouple(driverId, mfrTail, pid) {
  const z = JSON.parse(fs.readFileSync(path.join(ROOT, 'drivers', driverId, 'driver.compose.json'), 'utf8')).zigbee || {};
  const mfrOk = (z.manufacturerName || []).some((m) => {
    const parts = String(m).split('_');
    return parts[parts.length - 1].toLowerCase() === mfrTail.toLowerCase();
  });
  const pidOk = (z.productId || []).some((p) => String(p).toUpperCase() === String(pid).toUpperCase());
  return mfrOk && pidOk;
}

describe('P2572 Johan mega complementary OUR app', () => {
  it('dump pagination uses page= and mega enrich is complementary/silent', () => {
    const dump = fs.readFileSync(path.join(ROOT, 'tools/ci/johan-dump.js'), 'utf8');
    assert.ok(dump.includes("page: String(page)"));
    assert.ok(!dump.includes("params.set('after'"));
    const mega = fs.readFileSync(path.join(ROOT, 'tools/ci/p2572-johan-mega-complementary.js'), 'utf8');
    assert.ok(mega.includes('ComplementaryMerge'));
    assert.ok(mega.includes('neverInventPid') || mega.includes('Never invent'));
    assert.ok(mega.includes('refuseTs0601Generic') || mega.includes('refuse_ts0601_generic'));
    assert.ok(mega.includes('forumPost: false'));
    assert.ok(mega.includes('notJohanRepo'));
  });

  it('open Johan tip couples locked on OUR drivers', () => {
    assert.equal(hasCouple('presence_sensor_radar', 'gkfbdvyx', 'TS0601'), true);
    assert.equal(hasCouple('water_valve_smart', 'wt9agwf3', 'TS0601'), true);
    assert.equal(hasCouple('wall_switch_3gang_1way', 'zo0cfekv', 'TS0601'), true);
    assert.equal(hasCouple('button_wireless_1', 'b4awzgct', 'TS0041'), true);
    assert.equal(hasCouple('air_quality_co2', 'ogkdpgy2', 'TS0601'), true);
    assert.equal(hasCouple('plug_energy_monitor', 'ddigca5n', 'TS011F'), true);
  });

  it('sacred m1cvyneb dimmer + P2571 tip locks intact', () => {
    assert.equal(hasCouple('wall_dimmer_tuya', 'm1cvyneb', 'TS0601'), true);
    assert.equal(hasCouple('wall_switch_6_gang_tuya', 'c8ipbljq', 'TS0601'), true);
  });

  it('contact_sensor never claims TS0601 (P126); pay2byax ZG path retained', () => {
    const z = JSON.parse(fs.readFileSync(path.join(ROOT, 'drivers/contact_sensor/driver.compose.json'), 'utf8')).zigbee || {};
    assert.equal((z.productId || []).some((p) => String(p).toUpperCase() === 'TS0601'), false);
    assert.ok((z.manufacturerName || []).some((m) => /pay2byax/i.test(m)));
    assert.equal(hasCouple('contact_sensor_zigbee', 'pay2byax', 'TS0601'), true);
  });
});
