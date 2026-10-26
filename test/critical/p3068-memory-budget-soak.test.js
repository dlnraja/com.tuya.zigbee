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
const SOAK = { N: 40, E: 150, C: 3 };
const SOAK_PEAK_MB = 60; // absolute ceiling for 40 devices after reports (measured ~44-48)
const REPORT_GROWTH_MB = 8; // heap after M reports vs right after init
const CYCLE_DRIFT_MB = 4; // residual heap growth across C create/delete cycles

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
  const ignored = fs.readFileSync(path.join(ROOT, '.homeyignore'), 'utf8').split(/\r?\n/)
    .map((l) => l.trim()).filter((l) => /^data\/[^*!#\s]+$/.test(l)).map((l) => path.join(ROOT, l.replace(/\/$/, '')));
  const preload = path.join(dir, 'shipped-payload.js');
  fs.writeFileSync(preload, `'use strict';
const fs = require('fs'); const IGN = ${JSON.stringify(ignored)};
const hidden = (p) => { const s = String(p); return IGN.some((i) => s === i || s.startsWith(i + require('path').sep)); };
const ex = fs.existsSync; fs.existsSync = (p) => (hidden(p) ? false : ex(p));
`);
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
    const drift = r.cycles[r.cycles.length - 1].afterDelete - r.cycles[0].afterDelete;
    assert.ok(drift <= CYCLE_DRIFT_MB, `heap drift ${drift.toFixed(1)} MB over ${SOAK.C} cycles ${msg}`);
  } finally { fs.rmSync(dir, { recursive: true, force: true }); }
});
