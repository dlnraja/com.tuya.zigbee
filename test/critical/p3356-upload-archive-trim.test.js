'use strict';

/**
 * P3356: Athom builds #3708-#3710 failed in processing right after a successful upload of a
 * 31.7 MB tar / 3853 files. Lossless trim of the packed upload dir:
 *  - config/ and data/ files (json/md/txt/csv) that no remaining payload file names are dropped
 *    (fixed point: a reference from a dropped file does not count); code (.js) is never dropped here.
 *  - the three dynamic require sites the JS pruner stopped on are reviewed literal paths.
 * And a ratchet on the packed archive (tar bytes + file count) so it cannot grow back.
 */

const assert = require('assert');
const fs = require('fs');
const os = require('os');
const path = require('path');
const { describe, it } = require('../_support/dual-runner');
const S = require('../../scripts/maintenance/lossless-shrink-payload.cjs');
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

describe('P3356 unreferenced config/data files leave the upload package', () => {
  const dir = fixture({
    'app.json': JSON.stringify({ id: 'x', drivers: [{ id: 'd', pair: [{ id: 'list_devices', template: 'list_devices' }, { id: 'select_driver' }], repair: [{ id: 'ir_setup' }] }, { id: 'e' }] }),
    'app.js': "const m = require('./lib/Used'); module.exports = m;",
    'lib/Used.js': "const t = require('../data/fingerprints'); const p = require('path').join(__dirname, '..', 'config', 'Limits.JSON'); module.exports = { t, p };",
    'data/fingerprints.json': '{}',
    'config/limits.json': '{}',
    'config/architecture/tooling-ssot.json': '{"see":"data/learning/ci-only.json"}',
    'data/learning/ci-only.json': '{}',
    'config/runtime-hook.js': 'module.exports = 1;',
    'NOTICE': 'legal',
    'lib/Profiles.js': "const DIR = path.join(__dirname, '../data/profiles'); module.exports = () => fs.readdirSync(DIR);",
    'data/profiles/zz-unnamed.json': '{}',
    'assets/icon.svg': '<svg/>',
    'drivers/d/driver.compose.json': '{}',
    'drivers/d/assets/image-source.json': '{"url":"https://example.invalid/x.jpg"}',
    'drivers/d/assets/images/small.png': 'png',
  });
  const r = S.pruneData(dir, false);

  it('drops files no remaining payload file names (chains drop together)', () => {
    assert.deepStrictEqual(r.files.sort(), ['config/architecture/tooling-ssot.json', 'data/learning/ci-only.json', 'drivers/d/assets/image-source.json']);
    assert.ok(!fs.existsSync(path.join(dir, 'data/learning/ci-only.json')));
    assert.strictEqual(r.dropped, 3);
  });

  it('keeps files referenced by name, by stem without extension, or case-insensitively', () => {
    for (const f of ['data/fingerprints.json', 'config/limits.json']) assert.ok(fs.existsSync(path.join(dir, f)), f);
  });

  it('never touches code, legal files, assets, drivers or a directory code enumerates', () => {
    for (const f of ['data/profiles/zz-unnamed.json', 'config/runtime-hook.js', 'NOTICE', 'assets/icon.svg', 'drivers/d/driver.compose.json', 'drivers/d/assets/images/small.png', 'app.json']) {
      assert.ok(fs.existsSync(path.join(dir, f)), f);
    }
  });

  it('dry run changes nothing', () => {
    const d2 = fixture({ 'app.json': '{}', 'config/x.json': '{}' });
    const r2 = S.pruneData(d2, true);
    assert.deepStrictEqual(r2.files, ['config/x.json']);
    assert.ok(fs.existsSync(path.join(d2, 'config/x.json')));
  });

  it('the dynamic require sites that blocked JS pruning are reviewed', () => {
    for (const k of ['lib/memory/CatalogStore.js|CATALOG_FILE', 'lib/zigbee/MethodCoverage.js|mod',
      "lib/energy/PowerSourceResolver.js|path.join(__dirname, '..', '..', 'data', 'energy', 'default-power.json'"]) {
      assert.ok(S.REVIEWED_DYNAMIC.has(k), k);
    }
  });
});

describe('P3356 package-lock.json re-created by npm install leaves the upload dir', () => {
  it('prune-publish-payload removes it (dependencies already installed)', () => {
    const dir = fixture({ 'app.json': '{"id":"x"}', 'package.json': '{}', 'package-lock.json': '{"lockfileVersion":3}', 'node_modules/a/index.js': '' });
    const r = require('child_process').spawnSync(process.execPath, [path.join(ROOT, 'scripts/maintenance/prune-publish-payload.cjs'), dir], { env: { ...process.env, LOSSLESS_SHRINK: '0' }, encoding: 'utf8' });
    assert.strictEqual(r.status, 0, r.stderr);
    assert.ok(!fs.existsSync(path.join(dir, 'package-lock.json')));
    assert.ok(fs.existsSync(path.join(dir, 'package.json')) && fs.existsSync(path.join(dir, 'node_modules/a/index.js')));
  });
});

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
