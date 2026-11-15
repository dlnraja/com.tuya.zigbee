'use strict';

// P3312: Bastien OOM. V8 keeps every loaded module's source text; a char above U+00FF
// makes it a two-byte string. The publish payload JS is rewritten with \uXXXX escapes
// (same runtime values; only regex.source and Function#toString show the escape),
// and oversized settings are dropped at boot.

const { describe, it } = require('node:test');
const assert = require('node:assert/strict');
const fs = require('fs');
const os = require('os');
const path = require('path');
const vm = require('vm');
const { spawnSync } = require('child_process');

const ROOT = path.join(__dirname, '..', '..');
const { escapeWide, latin1JsFile, latin1JsTree } = require(path.join(ROOT, 'scripts', 'maintenance', 'latin1-js.cjs'));
const { enforceSettingsBudget } = require(path.join(ROOT, 'lib', 'memory', 'SettingsBudget.js'));

const WIDE = /[\u0100-\uffff]/;

function loadCjs(src) {
  const module = { exports: {} };
  vm.runInThisContext(`(function (exports, require, module) {${src}\n})`)(module.exports, require, module);
  return module.exports;
}

const SAMPLE = [
  '// comment ✅ → 🔘',
  "const a = '✅ ok → 21 °C';",
  'const b = `bouton 🔘 ${1 + 1} appuyé`;',
  "const c = '\\✅';",
  "const d = '\\\\✅';",
  'const re1 = /[✅❌]/u;',
  'const re2 = /😀+/;',
  "const ru = 'Включить';",
  "const latin = 'Ça va déjà';",
  '/* block → comment */',
  'module.exports = { a, b, c, d, re1: re1.test("x❌"), re2: re2.test("😀😀"), ru, latin };',
].join('\n');

describe('P3312 Latin-1 payload JavaScript', () => {
  it('escapes only chars above U+00FF and keeps every runtime value', () => {
    const out = escapeWide(SAMPLE);
    assert.equal(WIDE.test(out), false);
    assert.ok(out.includes('Ça va déjà'), 'Latin-1 chars stay as they are');
    assert.deepEqual(loadCjs(out), loadCjs(SAMPLE));
    assert.equal(loadCjs(out).d, '\\✅');
    assert.equal(loadCjs(out).c, '✅');
  });

  it('halves the retained source text of a loaded module', () => {
    const child = `
      const fs = require('fs'); const path = require('path'); const os = require('os');
      const { escapeWide } = require(${JSON.stringify(path.join(ROOT, 'scripts', 'maintenance', 'latin1-js.cjs'))});
      const lines = [];
      for (let i = 0; i < 2000; i++) lines.push('exports.f' + i + ' = function () { return "ok ✅ ' + i + ' ' + 'x'.repeat(1000) + '"; };');
      let src = lines.join('\\n');
      if (process.env.MODE === 'escaped') src = escapeWide(src);
      const dir = fs.mkdtempSync(path.join(os.tmpdir(), 'p3312-heap-'));
      const f = path.join(dir, 'm.js'); fs.writeFileSync(f, src); src = null; lines.length = 0;
      global.gc(); global.gc();
      const before = process.memoryUsage().heapUsed;
      global.keep = require(f);
      global.gc(); global.gc();
      const after = process.memoryUsage().heapUsed;
      fs.rmSync(dir, { recursive: true, force: true });
      process.stdout.write(String(after - before));
    `;
    const run = (mode) => {
      const r = spawnSync(process.execPath, ['--expose-gc', '-e', child], { env: { ...process.env, MODE: mode }, encoding: 'utf8' });
      assert.equal(r.status, 0, r.stderr);
      return Number(r.stdout);
    };
    const wide = run('wide');
    const escaped = run('escaped');
    assert.ok(wide > 1024 * 1024, `module retained ${wide} bytes`);
    assert.ok(escaped < wide * 0.7, `escaped ${escaped} vs wide ${wide}`);
  });

  it('rewrites CommonJS files, leaves ES modules, String.raw users and node_modules', () => {
    const dir = fs.mkdtempSync(path.join(os.tmpdir(), 'p3312-tree-'));
    try {
      fs.mkdirSync(path.join(dir, 'lib'));
      fs.mkdirSync(path.join(dir, 'node_modules', 'x'), { recursive: true });
      fs.writeFileSync(path.join(dir, 'lib', 'a.js'), SAMPLE);
      fs.writeFileSync(path.join(dir, 'lib', 'esm.js'), "export default '✅';\n");
      fs.writeFileSync(path.join(dir, 'lib', 'raw.js'), 'module.exports = String.raw`✅`;\n');
      fs.writeFileSync(path.join(dir, 'node_modules', 'x', 'i.js'), "module.exports = '✅';\n");
      const r = latin1JsTree(dir);
      assert.equal(r.files, 1);
      assert.deepEqual(r.skipped.map((s) => path.basename(s.file)).sort(), ['esm.js', 'raw.js']);
      assert.equal(WIDE.test(fs.readFileSync(path.join(dir, 'lib', 'a.js'), 'utf8')), false);
      assert.equal(WIDE.test(fs.readFileSync(path.join(dir, 'node_modules', 'x', 'i.js'), 'utf8')), true);
      assert.ok(r.textHeapAfter < r.textHeapBefore);
      assert.equal(latin1JsFile(path.join(dir, 'lib', 'a.js')), null, 'second pass changes nothing');
    } finally {
      fs.rmSync(dir, { recursive: true, force: true });
    }
  });

  it('every shipped CommonJS file still compiles once escaped', () => {
    const files = [path.join(ROOT, 'app.js'), path.join(ROOT, 'api.js')].filter((f) => fs.existsSync(f));
    const walk = (d) => {
      for (const e of fs.readdirSync(d, { withFileTypes: true })) {
        const full = path.join(d, e.name);
        if (e.isDirectory()) { if (e.name !== 'node_modules') walk(full); } else if (/\.c?js$/.test(e.name)) files.push(full);
      }
    };
    walk(path.join(ROOT, 'lib'));
    walk(path.join(ROOT, 'drivers'));
    let rewritten = 0;
    for (const f of files) {
      const text = fs.readFileSync(f, 'utf8');
      if (!WIDE.test(text) || /String\.raw|\.raw\s*\[/.test(text)) continue;
      const params = ['exports', 'require', 'module', '__filename', '__dirname'];
      try { vm.compileFunction(text, params); } catch (_) { continue; }
      const out = escapeWide(text);
      assert.equal(WIDE.test(out), false, f);
      assert.doesNotThrow(() => vm.compileFunction(out, params, { filename: f }), f);
      rewritten++;
    }
    assert.ok(rewritten > 100, `rewritten ${rewritten}`);
  });

  it('prepare-publish runs the step after the ASCII JSON step and fails closed', () => {
    const src = fs.readFileSync(path.join(ROOT, 'scripts', 'prepare-publish.js'), 'utf8');
    const json = src.indexOf('asciiPublishPayload(destDir)');
    const js = src.indexOf('latin1JsTree(destDir)');
    assert.ok(json > 0 && js > json, 'Latin-1 JS step runs after the ASCII JSON step');
    assert.ok(src.indexOf('FATAL(P3312)') > js);
    assert.ok(js < src.indexOf('HOMEY_PUBLISH_DIR='), 'before the payload dir is handed to the upload');
  });
});

describe('P3312 settings budget', () => {
  function fakeHomey(values) {
    const map = new Map(Object.entries(values));
    return { map, settings: { getKeys: () => [...map.keys()], get: (k) => map.get(k), unset: (k) => { map.delete(k); } } };
  }

  it('drops an oversized key once, keeps the others, logs name and size only', () => {
    const circ = {}; circ.self = circ;
    const h = fakeHomey({ small: { a: 1 }, big: 'é✅'.repeat(300000), circ, user: 'zigbee group 1' });
    const lines = [];
    const r = enforceSettingsBudget(h, { log: (l) => lines.push(l) });
    assert.equal(r.checked, 4);
    assert.deepEqual([...h.map.keys()].sort(), ['small', 'user']);
    assert.equal(lines.length, 1);
    assert.match(lines[0], /big=600000/);
    assert.match(lines[0], /circ=unserialisable/);
    assert.equal(lines[0].includes('✅'), false);
    assert.equal(enforceSettingsBudget(h, { log: (l) => lines.push(l) }).removed.length, 0);
  });

  it('is a no-op without a settings manager', () => {
    assert.deepEqual(enforceSettingsBudget({}).removed, []);
    assert.deepEqual(enforceSettingsBudget(null).removed, []);
  });

  it('app.js applies the budget before the settings are read', () => {
    const src = fs.readFileSync(path.join(ROOT, 'app.js'), 'utf8');
    const b = src.indexOf('enforceSettingsBudget(this.homey');
    assert.ok(b > 0 && b < src.indexOf('this.initializeSettings();'));
  });
});
