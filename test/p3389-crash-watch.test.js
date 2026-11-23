'use strict';
// P3389 (t1023u, lead 6): free GHA crash watch. Fail-before: script and workflow absent.
const assert = require('assert');
const fs = require('fs');
const os = require('os');
const path = require('path');

const ROOT = path.join(__dirname, '..');
const SCRIPT = path.join(ROOT, 'scripts', 'ci', 'crash-watch.cjs');
const WF = path.join(ROOT, '.github', 'workflows', 'crash-watch.yml');

function fixture(dir) {
  const report = {
    diagnostics: [
      { id: 'a', subj: '[com.dlnraja.tuya.zigbee.bastien] crash', date: '2026-11-07T11:11:05.000Z', appVersion: '1.0.229', logIdShort: 'e3d59e07',
        errs: ['FATAL ERROR: Reached heap limit Allocation failed - JavaScript heap out of memory'], crashInfo: { stackTraces: ['v8::internal::JsonParser<unsigned short>::ParseJsonValue', 'Received signal 6 SIGABRT'] },
        driversInLog: ['switch_1gang', 'switch_4gang'], userMessage: 'tout bloque, write me at someone@example.com' },
      { id: 'b', subj: 'diag', date: '2026-11-03T10:00:00.000Z', appVersion: '9.0.1600', logIdShort: 'b3f8c2c6', logHighlights: ['App stopped: too much CPU'], driversInLog: ['power_clamp_meter'] },
      { id: 'c', subj: 'Build #435 has been created', date: '2026-11-22T07:36:11.000Z', appVersion: null, userMessage: 'OOM SIGABRT in my message only' },
    ],
  };
  const f = path.join(dir, 'r1', '.github', 'state', 'diagnostics-report.json');
  fs.mkdirSync(path.dirname(f), { recursive: true });
  fs.writeFileSync(f, JSON.stringify(report));
}

describe('P3389 crash watch', () => {
  it('flags OOM / SIGABRT / JsonParser / CPU-limit per app version, ignores the user message, keeps ids anonymous', () => {
    const { run } = require(SCRIPT);
    const dir = fs.mkdtempSync(path.join(os.tmpdir(), 'p3389-cw-'));
    fixture(dir);
    const opts = { reports: dir, ledger: path.join(dir, 'l.json'), candidates: path.join(dir, 'c.json'), now: '2026-11-22T12:00:00.000Z' };
    const r = run(opts);
    const keys = Object.keys(r.ledger.entries).sort();
    assert.deepStrictEqual(keys, [
      'cpu-limit|com.dlnraja.tuya.zigbee|9.0.1600',
      'oom-heap|com.dlnraja.tuya.zigbee.bastien|1.0.229',
      'oom-json-two-byte|com.dlnraja.tuya.zigbee.bastien|1.0.229',
      'sigabrt|com.dlnraja.tuya.zigbee.bastien|1.0.229',
    ]);
    assert.deepStrictEqual(r.ledger.entries['cpu-limit|com.dlnraja.tuya.zigbee|9.0.1600'].drivers, ['power_clamp_meter']);
    assert.strictEqual(r.fresh.length, 4);
    assert.strictEqual(Object.keys(r.candidates.items).length, 4);
    const written = fs.readFileSync(opts.ledger, 'utf8') + fs.readFileSync(opts.candidates, 'utf8');
    assert.ok(!/example\.com|tout bloque/.test(written), 'no user text or address in the ledger');
    // second run over the same reports: nothing new, counts unchanged (idempotent)
    const r2 = run(opts);
    assert.strictEqual(r2.fresh.length, 0);
    assert.strictEqual(r2.ledger.entries['sigabrt|com.dlnraja.tuya.zigbee.bastien|1.0.229'].count, 1);
    assert.match(r2.md, /Crash watch \(P3389\)/);
  });

  it('workflow: free, GITHUB_TOKEN only, kill switch, pinned actions, no posting', () => {
    const y = fs.readFileSync(WF, 'utf8');
    assert.match(y, /vars\.CRASH_WATCH_DISABLED != 'true'/);
    assert.match(y, /config\/ci\/crash-watch\.json/);
    const secrets = [...y.matchAll(/secrets\.([A-Z0-9_]+)/g)].map((m) => m[1]);
    assert.deepStrictEqual([...new Set(secrets)], ['GITHUB_TOKEN']);
    for (const m of y.matchAll(/uses:\s*([^\s#]+)/g)) { assert.match(m[1], /@[0-9a-f]{40}$/, `unpinned ${m[1]}`); }
    assert.ok(!/gh (issue|pr) (create|comment)|discourse|forum/i.test(y.replace(/FORUM_AUTO_POST: '0'/, '')), 'posts nothing');
    assert.match(y, /safe-auto-commit\.js --id=crash-watch/);
  });
});
