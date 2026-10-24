'use strict';

/**
 * Contre quoi (#571 / #570 / forum #2101 / P2814):
 * QT-07S `_TZE284_myd45weu`+TS0601 and AOYAN AY-303Z stay on soil_sensor.
 * Homey pairing requires ALL declared clusters — ZG-303Z interview is
 * [0,3,61184,1026,1029,1], so compose must stay minimal [0,61184]
 * (never force Groups/Scenes 4/5 or OnOff 6 — that caused Unknown on HOBEIAN).
 * productId must stay soil-only — junk pids (TRV/ZBMINI/"Battery switch…")
 * inflate Athom cartesian and can reject the whole driver → Unknown despite FP.
 * Never invent pid.
 */

const { describe, it } = require('node:test');
const assert = require('node:assert/strict');
const fs = require('fs');
const path = require('path');

const ROOT = path.join(__dirname, '..', '..');
const compose = JSON.parse(
  fs.readFileSync(path.join(ROOT, 'drivers', 'soil_sensor', 'driver.compose.json'), 'utf8'),
);

// P3019: Arteco = Z2M ZS-SF00 soil fertility sensor (modelID "Arteco", manufacturerName "A89G12C").
const SOIL_PID_RE = /^(ts0601|zg-303z|zg-303zl|ay-303z|ay-302z|cs-201z|sgs02z|sg502z|arteco)$/i;

describe('P2811 soil QT-07S / AOYAN clusters + couples', () => {
  it('locks myd45weu + TS0601 and AOYAN + AY-303Z on soil_sensor', () => {
    const mfr = (compose.zigbee.manufacturerName || []).map(String);
    const pid = (compose.zigbee.productId || []).map(String);
    assert.ok(mfr.some((m) => /_tze284_myd45weu/i.test(m)));
    assert.ok(mfr.some((m) => /^aoyan$/i.test(m.trim())));
    assert.ok(pid.some((p) => /^ts0601$/i.test(p)));
    assert.ok(pid.some((p) => /^ay-303z$/i.test(p)));
  });

  it('endpoint 1 stays minimal [0,61184] — no 4/5/6 (ZG-303Z fit)', () => {
    const clusters = (compose.zigbee.endpoints?.['1']?.clusters || []).map(Number);
    for (const c of [0, 61184]) {
      assert.ok(clusters.includes(c), `missing cluster ${c}`);
    }
    assert.ok(!clusters.includes(4), 'must not require Groups 4 (breaks ZG-303Z)');
    assert.ok(!clusters.includes(5), 'must not require Scenes 5 (breaks ZG-303Z)');
    assert.ok(!clusters.includes(6), 'must not force OnOff 6 (Unknown risk)');
    const hobeianInterview = [0, 3, 61184, 1026, 1029, 1];
    assert.ok(
      clusters.every((c) => hobeianInterview.includes(c)),
      `compose [${clusters}] must fit HOBEIAN ZG-303Z interview`,
    );
  });

  it('productId is soil-only — no TRV/plug/junk strings (P2814)', () => {
    const pid = (compose.zigbee.productId || []).map(String);
    assert.ok(pid.length > 0 && pid.length <= 20, `pid count ${pid.length} should stay lean`);
    for (const p of pid) {
      assert.ok(SOIL_PID_RE.test(p), `junk/non-soil productId: ${JSON.stringify(p)}`);
      assert.ok(!/\s/.test(p), `whitespace in productId: ${JSON.stringify(p)}`);
    }
    assert.ok(!pid.some((p) => /battery switch/i.test(p)), 'Battery switch junk pid');
    assert.ok(!pid.some((p) => /^trv/i.test(p)), 'TRV pid on soil');
    assert.ok(!pid.some((p) => /zbmini/i.test(p)), 'ZBMINI pid on soil');
  });

  it('does not claim smoke/gas qaxkdgyt (Z2M JKD-816COM — smoke_sensor3)', () => {
    const mfr = (compose.zigbee.manufacturerName || []).map(String);
    assert.ok(!mfr.some((m) => /qaxkdgyt/i.test(m)), 'qaxkdgyt must not live on soil_sensor');
  });
});
