'use strict';
// P3068: memory budget gates (Homey Pro app heap ~64 MB; Bastien's OOMs hit Mark-Compact at 62.9 MB).
// 1. startup: module-load heap of app.js + every driver/device module (scripts/perf/boot-heap.js) stays
//    under BOOT_BUDGET_MB — catches a new eager require of a big table / data file at boot.
// 2. soak: N devices × M attribute/DP reports × C create/delete cycles in the P3065 lifecycle harness —
//    reports must not grow the heap, deleted devices must give their memory and Homey intervals back.
// Each run writes into its own mkdtemp dir (safe when suites run in parallel).
// The soak emulates the shipped payload: data/ files listed in .homeyignore (mfs_db.json 5 MB,
// community-sync/…) are not on the Homey, so the harness sees them as absent (a source-tree-only
// 5 MB parse would otherwise add a one-off ~14 MB that never happens on a real Homey).
const test = require('node:test');
const assert = require('node:assert');
const fs = require('fs');
const os = require('os');
const path = require('path');
const { execFileSync } = require('child_process');

const ROOT = path.resolve(__dirname, '..', '..');
const BOOT_BUDGET_MB = 40; // measured 26/10: master 31.2, stable-v5 32.7, bastien-home 33.5
const SOAK = { N: 40, E: 150, C: 5 }; // P3068b: 1 warm-up cycle + 4 measured (was 3)
const SOAK_PEAK_MB = 60; // absolute ceiling for 40 devices after reports (measured ~44-48)
const REPORT_GROWTH_MB = 8; // heap after M reports vs right after init
const CYCLE_DRIFT_MB = 4; // residual heap growth across the measured cycles (after warm-up)
// P3068b: same warm-up baseline as the owned-timer sweep. Cycle 1 pays one-off costs (lazy requires, JIT code
// space, sampler/LRU tables filling to their caps): master strict 40375787419 saw afterDelete 36.3 -> 39.6 -> 40.6
// (+3.3 then +1.0, converging) while 6 local cycles plateau at 36.1/37.7/36.2/37.1/37.6/37.9. A real per-device
// leak (40 devices/cycle) grows linearly, so we gate the post-warm-up drift AND slope, plus a loose cap incl. warm-up.
const WARMUP_CYCLES = 1;
const CYCLE_SLOPE_MB = 1.0; // least-squares MB/cycle over the measured cycles
const TOTAL_DRIFT_MB = 8; // first -> last afterDelete including warm-up (catches a big one-cycle leak)
function evalDrift(afterDelete) {
  const m = afterDelete.slice(WARMUP_CYCLES);
  const n = m.length; const xm = (n - 1) / 2; const ym = m.reduce((a, b) => a + b, 0) / n;
  let num = 0; let den = 0;
  m.forEach((y, x) => { num += (x - xm) * (y - ym); den += (x - xm) ** 2; });
  const slope = den ? num / den : 0;
  const drift = m[n - 1] - m[0];
  const total = afterDelete[afterDelete.length - 1] - afterDelete[0];
  return { slope, drift, total, ok: drift <= CYCLE_DRIFT_MB && slope <= CYCLE_SLOPE_MB && total <= TOTAL_DRIFT_MB };
}

test('P3068b soak evaluator: warm-up plateau passes, linear per-cycle leak fails', () => {
  assert.ok(evalDrift([36.3, 39.6, 40.6]).ok, 'CI 40375787419 warm-up series must pass');
  assert.ok(evalDrift([36.1, 37.7, 36.2, 37.1, 37.6, 37.9]).ok, 'local plateau must pass');
  assert.ok(!evalDrift([36, 37.5, 39, 40.5, 42]).ok, '1.5 MB/cycle leak must fail (slope)');
  assert.ok(!evalDrift([36, 37, 38.1, 39.2, 40.3, 41.4]).ok, 'steady 1.1 MB/cycle leak must fail');
  assert.ok(!evalDrift([36, 45, 45.2, 45.1, 45.3]).ok, 'one-cycle 9 MB jump must fail (total)');
});

test('P3068 startup memory budget: module-load heap under budget', { timeout: 120000 }, () => {
  const out = execFileSync(process.execPath, ['--expose-gc', path.join(ROOT, 'scripts/perf/boot-heap.js')], {
    cwd: ROOT, encoding: 'utf8', stdio: ['ignore', 'pipe', 'ignore'], timeout: 110000,
  });
  const m = out.match(/heap=([\d.]+)MB loadErrors=(\d+)/);
  assert.ok(m, `boot-heap output not recognised: ${out.slice(-300)}`);
  const heap = Number(m[1]);
  assert.ok(heap <= BOOT_BUDGET_MB, `boot heap ${heap} MB > budget ${BOOT_BUDGET_MB} MB`);
});

test('P3068 soak: N devices × M reports × C cycles keep the heap bounded', { timeout: 300000 }, () => {
  const dir = fs.mkdtempSync(path.join(os.tmpdir(), 'p3068-soak-'));
  const outFile = path.join(dir, 'out.json');
  const preload = path.join(ROOT, 'test', '_support', 'shipped-payload-preload.js'); // P3068: shipped data/ only
  const env = { ...process.env, OUT: outFile };
  delete env.DRV; delete env.SNAP; delete env.FLOOD; // default 5 common drivers
  try {
    execFileSync(process.execPath, ['--expose-gc', '-r', preload, path.join(ROOT, 'scripts/perf/p3065-lifecycle-leak-harness.js'),
      ROOT, String(SOAK.N), String(SOAK.E), String(SOAK.C)], {
      cwd: ROOT, stdio: 'ignore', timeout: 280000, env,
    });
    const r = JSON.parse(fs.readFileSync(outFile, 'utf8'));
    assert.strictEqual(r.cycles.length, SOAK.C);
    const msg = JSON.stringify(r.cycles.map((c) => [c.afterInit, c.afterEvents, c.afterDelete, c.timersLeft]));
    for (const c of r.cycles) {
      assert.ok(c.afterEvents <= SOAK_PEAK_MB, `peak ${c.afterEvents} MB > ${SOAK_PEAK_MB} ${msg}`);
      assert.ok(c.afterEvents - c.afterInit <= REPORT_GROWTH_MB, `reports grew heap ${msg}`);
      assert.strictEqual(c.timersLeft, 0, `Homey intervals still armed after delete ${msg} ${JSON.stringify(r.timerSrc)}`);
    }
    const d = evalDrift(r.cycles.map((c) => c.afterDelete));
    assert.ok(d.ok, `heap drift ${d.drift.toFixed(1)} MB (slope ${d.slope.toFixed(2)} MB/cycle, total ${d.total.toFixed(1)}) over ${SOAK.C - WARMUP_CYCLES} cycles after ${WARMUP_CYCLES} warm-up ${msg}`);
  } finally { fs.rmSync(dir, { recursive: true, force: true }); }
});
