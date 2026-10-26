'use strict';
// P3068: the lifecycle harness waits SETTLE ms (default 300) after delete before counting WeakRef-alive
// devices; the p3065 timer-sweep test passes a settle long enough for in-flight onNodeInit chains
// (raced at 150 ms, still running after delete under 4× parallel CI load) to finish. Without it,
// bastien-home Node 22 run 40349012562 failed "dead devices accumulate: 11 -> 18" while a 4 s settle
// showed the count bounded (1-3) — timing, not a leak. timersLeft stays strict (0..2).
const test = require('node:test');
const assert = require('node:assert');
const fs = require('fs');
const path = require('path');
const ROOT = path.join(__dirname, '../..');

test('harness settle after delete is configurable, default unchanged (300 ms)', () => {
  const src = fs.readFileSync(path.join(ROOT, 'scripts/perf/p3065-lifecycle-leak-harness.js'), 'utf8');
  assert.match(src, /devs\.length=0;await new Promise\(r=>setTimeout\(r,\+process\.env\.SETTLE\|\|300\)\)/);
});

test('p3065 timer-sweep lifecycle test gives in-flight init chains time to settle', () => {
  const src = fs.readFileSync(path.join(ROOT, 'test/critical/p3065-owned-timer-sweep.test.js'), 'utf8');
  const m = src.match(/SETTLE: '(\d+)'/);
  assert.ok(m, 'SETTLE env passed to the harness');
  assert.ok(+m[1] >= 2000 && +m[1] <= 5000, `settle ${m[1]} ms`);
  assert.match(src, /last\.timersLeft <= 2/); // armed-interval check stays strict
});
