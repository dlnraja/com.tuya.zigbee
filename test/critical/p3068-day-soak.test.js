'use strict';
// P3068: simulated-24 h soak (app-wide memory guard). N devices of the 5 common drivers init, take reports,
// then every armed Homey interval fires a full day's worth of ticks (ceil(24 h / period), capped at 288 —
// 5-min granularity) interleaved with one report per device per round. Periodic paths (health checks,
// maintenance, caches, pollers) must not grow the heap over the day, and delete must disarm every interval.
const test = require('node:test');
const assert = require('node:assert');
const fs = require('fs');
const os = require('os');
const path = require('path');
const { execFileSync } = require('child_process');

const ROOT = path.resolve(__dirname, '..', '..');
const HARNESS = path.join(ROOT, 'scripts/perf/p3065-lifecycle-leak-harness.js');
const DAY = { N: 40, E: 50, C: 2 };
const DAY_GROWTH_MB = 6; // heap after the simulated day vs after the reports (measured ~0.3 MB for 20 devices)
const DAY_PEAK_MB = 60; // Homey kills the app near 64 MB

test('P3068 harness has the DAY mode (interval callbacks kept, afterDay reported)', () => {
  const src = fs.readFileSync(HARNESS, 'utf8');
  assert.match(src, /t\._ms=ms;/);
  assert.doesNotMatch(src, /t\._f=f/, 'the harness must not retain interval callbacks (keeps deleted devices alive)');
  assert.match(src, /process\.env\.DAY/);
  assert.match(src, /afterDay:hday,/);
});

test('P3068 soak: simulated 24 h of Homey intervals keeps the heap bounded', { timeout: 300000 }, () => {
  const dir = fs.mkdtempSync(path.join(os.tmpdir(), 'p3068-day-'));
  const outFile = path.join(dir, 'out.json');
  const env = { ...process.env, OUT: outFile, DAY: '1', SETTLE: '1000' };
  delete env.DRV; delete env.SNAP; delete env.FLOOD; delete env.DAY_CAP;
  try {
    execFileSync(process.execPath, ['--expose-gc', '-r', path.join(ROOT, 'test', '_support', 'shipped-payload-preload.js'),
      HARNESS, ROOT, String(DAY.N), String(DAY.E), String(DAY.C)], { cwd: ROOT, stdio: 'ignore', timeout: 280000, env });
    const r = JSON.parse(fs.readFileSync(outFile, 'utf8'));
    const msg = JSON.stringify({ timers: r.dayTimers, rounds: r.dayRounds, cycles: r.cycles.map((c) => [c.afterEvents, c.afterDay, c.afterDelete, c.timersLeft]) });
    assert.ok(r.dayTimers > 0, `no Homey interval armed — DAY mode measured nothing ${msg}`);
    assert.ok(r.dayRounds >= 24, `day shorter than 24 hourly ticks ${msg}`);
    for (const c of r.cycles) {
      assert.ok(c.afterDay <= DAY_PEAK_MB, `peak ${c.afterDay} MB > ${DAY_PEAK_MB} ${msg}`);
      assert.ok(c.afterDay - c.afterEvents <= DAY_GROWTH_MB, `simulated day grew the heap ${msg}`);
      assert.strictEqual(c.timersLeft, 0, `intervals still armed after delete ${msg}`);
    }
  } finally { fs.rmSync(dir, { recursive: true, force: true }); }
});
