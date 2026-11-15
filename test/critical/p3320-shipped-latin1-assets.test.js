'use strict';

// P3320: shipped JS must be Latin-1 (no raw char > U+00FF); unreferenced package images are blocked.
// Fail-closed gate is wired into the shared rules-gates core profile (pre-push + CI).

const { describe, it } = require('../_support/dual-runner');
const assert = require('node:assert/strict');
const fs = require('fs');
const os = require('os');
const path = require('path');
const { spawnSync } = require('child_process');

const ROOT = path.join(__dirname, '..', '..');
const {
  stripJsText,
  scanWideInShippedJs,
  findUnreferencedImages,
  WIDE,
} = require('../../scripts/maintenance/p3320-latin1-source.cjs');
const RG = require('../../scripts/ci/rules-gates.js');

const SAMPLE = [
  '// banner ═ ─ ✅ → ⚠',
  "const a = 'ok ✅ → 21 °C — déjà';",
  "const b = 'Hey — I think this fingerprint';",
  "const c = 'distance units → \"m\"';",
  "const d = 'P2757 sleepy/coin — listen-only';",
  "const euro = '€';",
  "module.exports = { a, b, c, d, euro, already: 'Ça va déjà' };",
].join('\n');

describe('P3320 shipped JS Latin-1 and unreferenced images', () => {
  it('does not break a single-quoted string that used a typographic apostrophe', () => {
    const src = "module.exports = { bestFor: 'not this app" + "\u2019" + "s transport' };";
    const raw = "module.exports = { bestFor: 'not this app" + String.fromCharCode(0x2019) + "s transport' };";
    const out = stripJsText(raw);
    assert.equal(WIDE.test(out), false);
    const load = (s) => Function('module', 'exports', `${s}; return module.exports;`)({ exports: {} }, {});
    assert.deepEqual(load(out), load(raw));
    assert.ok(out.includes("\\u2019"), out);
    void src;
  });

  it('strips decorative non-Latin-1 chars to ASCII and keeps Latin-1 letters', () => {
    const out = stripJsText(SAMPLE);
    assert.equal(WIDE.test(out), false);
    assert.ok(out.includes('Ça va déjà'), 'Latin-1 letters stay');
    assert.ok(out.includes('°C'), 'degree sign is Latin-1 and stays');
    assert.ok(out.includes('[OK]'), 'checkmark becomes [OK]');
    assert.ok(out.includes('->'), 'arrow becomes ->');
    assert.ok(out.includes('distance units -> "m"'));
    assert.ok(out.includes('P2757 sleepy/coin - listen-only'));
    assert.ok(out.includes('Hey - I think this fingerprint'));
    assert.ok(out.includes('\\u20ac') || out.includes('\\u20AC'), 'euro sign is escaped, not dropped');
    assert.ok(!out.includes('✅') && !out.includes('→') && !out.includes('—'));
  });

  it('escapes U+FFFD inside a regex instead of deleting it (syntax stays valid)', () => {
    const src = "module.exports = (s) => s.replace(/\uFFFD/g, '')";
    const raw = 'module.exports = (s) => s.replace(/' + String.fromCharCode(0xFFFD) + "/g, '')";
    const out = stripJsText(raw);
    assert.equal(WIDE.test(out), false);
    assert.ok(/\\ufffd/i.test(out), out);
    const fn = Function('module', 'exports', `${out}; return module.exports;`)({ exports: {} }, {});
    assert.equal(fn('x' + String.fromCharCode(0xFFFD) + 'y'), 'xy');
    void src;
  });

  it('keeps runtime string values for escaped genuine characters', () => {
    const src = "module.exports = { euro: '€', co2: 'CO₂', fn: 'ƒ calculated' };";
    const out = stripJsText(src);
    assert.equal(WIDE.test(out), false);
    // eslint-disable-next-line no-new-func
    const load = (s) => Function('module', 'exports', `${s}; return module.exports;`)({ exports: {} }, {});
    assert.deepEqual(load(out), load(src));
  });

  it('fail-before / pass-after: the gate blocks a wide-char shipped file, then passes once stripped', () => {
    const dir = fs.mkdtempSync(path.join(os.tmpdir(), 'p3320-gate-'));
    try {
      fs.writeFileSync(path.join(dir, '.homeyignore'), 'test\nscripts\ntools\ndocs\n');
      fs.writeFileSync(path.join(dir, 'app.js'), "module.exports = 'hello ✅ → world';\n");
      const before = scanWideInShippedJs(dir);
      assert.ok(before.length >= 1, 'gate must fail while the decorative chars remain');
      const { stripJsFile } = require('../../scripts/maintenance/p3320-latin1-source.cjs');
      stripJsFile(path.join(dir, 'app.js'));
      const after = scanWideInShippedJs(dir);
      assert.deepEqual(after, []);
      const text = fs.readFileSync(path.join(dir, 'app.js'), 'utf8');
      assert.ok(text.includes('[OK]') && text.includes('->'));
      assert.equal(WIDE.test(text), false);
    } finally {
      fs.rmSync(dir, { recursive: true, force: true });
    }
  });

  it('is wired into the shared rules-gates core profile (pre-push + CI)', () => {
    const ids = RG.select({ profile: 'core' }).map((g) => g.id);
    assert.ok(ids.includes('p3320-latin1'), `core profile missing p3320-latin1: ${ids.join(',')}`);
    const g = RG.select({ only: 'p3320-latin1' })[0];
    assert.equal(g.file, 'tools/ci/p3320-shipped-latin1-assets-gate.js');
    assert.ok(fs.existsSync(path.join(ROOT, g.file)));
  });

  it('the live tree has no raw char > U+00FF in shipped JS and no unreferenced packaged images', function live() {
    // The worktree after P3320 apply must already be clean. This is the lock.
    const hits = scanWideInShippedJs(ROOT, {
      allowlist: require('../../scripts/maintenance/p3320-latin1-source.cjs').loadAllowlist(ROOT),
    });
    assert.deepEqual(hits, [], hits.slice(0, 8).map((h) => `${h.file}:${h.count}`).join(', '));
    const unref = findUnreferencedImages(ROOT);
    assert.deepEqual(unref, [], unref.slice(0, 8).map((u) => u.file).join(', '));
  });

  it('gate script exits 0 on a clean fixture and 1 on a dirty one', () => {
    const gate = path.join(ROOT, 'tools/ci/p3320-shipped-latin1-assets-gate.js');
    const dir = fs.mkdtempSync(path.join(os.tmpdir(), 'p3320-cli-'));
    try {
      fs.writeFileSync(path.join(dir, '.homeyignore'), 'test\nscripts\ntools\ndocs\n');
      fs.mkdirSync(path.join(dir, 'assets/images'), { recursive: true });
      // no images, clean JS
      fs.writeFileSync(path.join(dir, 'app.js'), "module.exports = 'ok - déjà';\n");
      // The gate module calls main(root) when required? It only runs main when main===module.
      // Spawn with a patched cwd by running node -e
      const runner = `
        const m = require(${JSON.stringify(gate)});
        process.exit(m.main(${JSON.stringify(dir)}));
      `;
      const clean = spawnSync(process.execPath, ['-e', runner], { encoding: 'utf8' });
      assert.equal(clean.status, 0, clean.stderr + clean.stdout);
      fs.writeFileSync(path.join(dir, 'app.js'), "module.exports = 'bad ✅';\n");
      const dirty = spawnSync(process.execPath, ['-e', runner], { encoding: 'utf8' });
      assert.equal(dirty.status, 1, dirty.stdout + dirty.stderr);
      assert.ok(/P3320/.test(dirty.stderr + dirty.stdout));
    } finally {
      fs.rmSync(dir, { recursive: true, force: true });
    }
  });
});
