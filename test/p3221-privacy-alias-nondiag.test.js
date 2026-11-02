'use strict';
// P3221: fetch-diags run 41438016752 privacy gate failed "secret-assignment@66" on a cached
// homey-app-diag/<uuid>.json whose uuid was already our own alias "[REDACTED_UUID:<hash>]" (gate read
// "UUID:<hash>" as a secret), and redact() of a raw uuid produced the broken "[REDACTED_UUID:[REDACTED_SECRET]".
// Also: c6d8ee46 is a forum post id, not a diag -> nonDiag, never found:false.
const assert = require('assert');
const fs = require('fs');
const os = require('os');
const path = require('path');
const p = require('../.github/scripts/privacy-redactor.js');
const { nonDiagInfo, sha16 } = require('../tools/ci/non-diag-ids');
const idx = require('../scripts/ci/homey-app-diag-index.js');

describe('P3221 privacy gate vs own aliases + non-diag ids', () => {
  it('gate accepts a file whose uuid is already an alias (offset 66 case)', () => {
    const s = JSON.stringify({ fetchedAt: '2026-11-02T11:49:59.169Z', uuid: '[REDACTED_UUID:a1b2c3d4e5]', found: true }, null, 2);
    assert.deepStrictEqual(p.findLeaks(s), []);
  });
  it('redact() of a raw uuid yields a clean alias, stable on re-run', () => {
    const once = p.redact('6eabd9c4-cd9c-4090-ba8d-3937d35de7ca');
    assert.match(once, /^\[REDACTED_UUID:[a-f0-9]{10}\]$/);
    assert.strictEqual(p.redact(once), once);
    assert.doesNotThrow(() => p.assertNoLeaks(JSON.stringify(p.redactObject({ uuid: '6eabd9c4-cd9c-4090-ba8d-3937d35de7ca' }), null, 2)));
  });
  it('still catches real secrets, including a fake half alias', () => {
    assert.ok(p.findLeaks('token=abcdefghij').length);
    assert.ok(p.findLeaks('[REDACTED_token=abcdefghij').length);
    assert.ok(!p.redact('uuid=secret1234').includes('secret1234'));
  });
  it('known forum post id is non-diag; index drops it', () => {
    const id = 'c6d8ee46-b7b4-42cf-93e0-0e9294d59ce7';
    assert.ok(nonDiagInfo(id));
    assert.strictEqual(nonDiagInfo('6eabd9c4-cd9c-4090-ba8d-3937d35de7ca'), null);
    assert.match(sha16(id), /^[0-9a-f]{16}$/);
    const dir = fs.mkdtempSync(path.join(os.tmpdir(), 'p3221-'));
    fs.writeFileSync(path.join(dir, `${id}.json`), JSON.stringify({ found: false }));
    fs.writeFileSync(path.join(dir, 'index.json'), JSON.stringify({ entries: [{ uuid: id, found: false }] }));
    idx.run(dir);
    const j = JSON.parse(fs.readFileSync(path.join(dir, 'index.json'), 'utf8'));
    assert.strictEqual(j.entries.length, 0);
    assert.ok(!fs.existsSync(path.join(dir, `${id}.json`)));
    fs.rmSync(dir, { recursive: true, force: true });
  });
  it('no raw non-diag uuid is stored in the data file', () => {
    const raw = fs.readFileSync(path.join(__dirname, '..', 'data', 'diag', 'non-diag-ids.json'), 'utf8');
    assert.ok(!/[0-9a-f]{8}-[0-9a-f]{4}-/.test(raw));
  });
});
