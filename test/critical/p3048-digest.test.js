'use strict';
// P3048: AI-free digest — versions, failures, health trends (flaky, repeated, cap margins), reply candidates.
const test = require('node:test');
const assert = require('node:assert');
const fs = require('fs');
const os = require('os');
const path = require('path');
const D = require(path.join(__dirname, '..', '..', 'scripts', 'automation', 'digest.cjs'));

test('combos: unique-string cartesian product per driver, over-cap list', () => {
  const dir = fs.mkdtempSync(path.join(os.tmpdir(), 'p3048-d-'));
  const mk = (id, z) => { fs.mkdirSync(path.join(dir, id)); fs.writeFileSync(path.join(dir, id, 'driver.compose.json'), JSON.stringify({ zigbee: z })); };
  mk('a', { manufacturerName: ['_TZ1', '_TZ1', '_TZ2'], productId: ['TS0601'] });
  mk('b', { manufacturerName: ['m1', 'm2', 'm3'], productId: ['p1', 'p2'] });
  mk('c', { manufacturerName: 'solo', productId: ['', 'p'] });
  const r = D.combos(dir, { total: 17000, perDriver: 5 });
  assert.strictEqual(r.total, 2 + 6 + 1);
  assert.deepStrictEqual(r.maxDriver, { id: 'b', n: 6 });
  assert.deepStrictEqual(r.over, [{ id: 'b', n: 6 }]);
});
test('trends: flaky = recovered by a re-run, repeated = same failure signature >= 2', () => {
  const now = Date.parse('2026-10-25T12:00:00Z');
  const e = (status, sig, name = 'Node 22 runtime tests', at = '2026-10-24T12:00:00Z') => ({ at, workflow: 'ci-collect', status, data: { name, sig } });
  const t = D.trends([e('recovered', 'x'), e('fail', 's1'), e('fail', 's1'), e('fail', 's2'), e('fail', 's1', 'old', '2026-10-01T00:00:00Z')], now);
  assert.deepStrictEqual(t.flaky, [{ workflow: 'Node 22 runtime tests', recovered: 1 }]);
  assert.deepStrictEqual(t.repeated, [{ workflow: 'Node 22 runtime tests', sig: 's1', n: 2 }]);
});
test('render: French markdown with margins under 17000 / 1008, no send', () => {
  const md = D.render({ generatedParis: '25/10/2026 12:00', branches: [{ branch: 'master', app: 'a', version: '9.0.1' }], failures: [],
    packageCombos: { total: 15000, maxDriver: 1000, maxDriverId: 'x', source: 'platform-budget' },
    combos: { total: 1, maxDriver: { id: 'a', n: 1 }, over: [] }, trends: { flaky: [], repeated: [] }, replies: { candidates: [] }, journalCount: 0 });
  assert.match(md, /marge 2000/);
  assert.match(md, /marge 8\)/);
  assert.match(md, /sans IA/);
  assert.strictEqual(D.CAPS.total, 17000);
  assert.strictEqual(D.CAPS.perDriver, 1008);
});
