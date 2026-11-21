'use strict';

const assert = require('assert');
const fs = require('fs');
const os = require('os');
const path = require('path');
const { describe, it } = require('../_support/dual-runner');
const A = require('../../scripts/ci/upload-archive-ceiling.cjs');

const ROOT = path.join(__dirname, '..', '..');

function fixture(files) {
  const dir = fs.mkdtempSync(path.join(os.tmpdir(), 'p3356-'));
  for (const [f, s] of Object.entries(files)) {
    fs.mkdirSync(path.dirname(path.join(dir, f)), { recursive: true });
    fs.writeFileSync(path.join(dir, f), s);
  }
  return dir;
}

describe('P3356 upload archive ratchet', () => {
  it('measures files and tar bytes exactly like the Homey CLI pack stream (dotfiles and dir headers included)', async () => {
    const dir = fixture({ 'a.txt': 'x', 'b/c.bin': Buffer.alloc(513), '.hidden': 'y' });
    const m = A.measureArchive(dir);
    assert.strictEqual(m.files, 3);
    // entries: ., .hidden, a.txt, b, b/c.bin = 5 headers; data 512 + 512 + 1024; 1024 end blocks
    assert.strictEqual(m.tarBytes, 5 * 512 + 512 + 512 + 1024 + 1024);
    const x = await A.measureArchiveExact(dir);
    if (x) assert.deepStrictEqual({ files: x.files, tarBytes: x.tarBytes }, { files: m.files, tarBytes: m.tarBytes });
  });

  it('policy has a file and tar-bytes ceiling; over either fails', () => {
    const p = A.policy();
    assert.ok(Number.isInteger(p.maxFiles) && Number.isInteger(p.maxTarBytes));
    assert.strictEqual(A.check({ files: p.maxFiles, tarBytes: p.maxTarBytes }, p).ok, true);
    assert.strictEqual(A.check({ files: p.maxFiles + 1, tarBytes: 1 }, p).ok, false);
    assert.strictEqual(A.check({ files: 1, tarBytes: p.maxTarBytes + 1 }, p).ok, false);
  });

  it('is wired as a blocking step before the upload', () => {
    const act = fs.readFileSync(path.join(ROOT, '.github/actions/homey-app-publish/action.yml'), 'utf8');
    const iCeil = act.indexOf('upload-archive-ceiling.cjs');
    assert.ok(iCeil > act.indexOf('prune-publish-payload.cjs') && iCeil < act.indexOf('run_homey_cli_publish()'));
  });
});
