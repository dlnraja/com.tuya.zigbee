'use strict';

/**
 * Tests — P3040 pairing trace: runs the real onNodeInit of 5 representative drivers in the
 * virtual-clock harness (scripts/perf/pairing-trace.js) and holds the measured gains.
 * Before P3040 (2026-10-25): peak TX/s 10-18, total TX in 120 s 21-76 (seeded jitter), motion_sensor init
 * threw ReferenceError lastLuxValue.
 */

const assert = require('assert');
const path = require('path');
const { execFileSync } = require('child_process');

const testApi = global.describe && global.it ? global : require('node:test');
const { describe, it } = testApi;

const ROOT = path.join(__dirname, '..');

describe('P3040 — pairing trace ceilings', function () {
  if (this && typeof this.timeout === 'function') {this.timeout(60000);}
  let res;
  const run = () => {
    if (!res) {
      const out = execFileSync(process.execPath, [path.join(ROOT, 'scripts/perf/pairing-trace.js'), '--json'], { cwd: ROOT, encoding: 'utf8', stdio: ['ignore', 'pipe', 'ignore'], timeout: 55000 });
      res = Object.fromEntries(JSON.parse(out).map((d) => [d.driver, d]));
    }
    return res;
  };

  it('motion_sensor first start no longer throws lastLuxValue ReferenceError', () => {
    const m = run().motion_sensor;
    assert.ok(!m.errors.some((e) => /lastLuxValue/.test(e)), m.errors.join(' | '));
  });

  it('no driver bursts more than 16 requests in one second (was 10-18)', () => {
    for (const d of Object.values(run())) {assert.ok(d.txPeak1s <= 16, `${d.driver} peak ${d.txPeak1s}`);}
  });

  it('total requests in the first 120 s stay below the pre-P3040 levels', () => {
    const before = { climate_sensor: 55, presence_sensor_radar: 35, plug_energy_monitor: 29, motion_sensor: 76, water_valve_smart: 21 };
    for (const [id, n] of Object.entries(before)) {
      assert.ok(run()[id].txTotal < n, `${id} ${run()[id].txTotal} >= ${n}`);
    }
  });
});
