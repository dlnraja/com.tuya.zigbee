'use strict';
// Every relative require() in drivers/ and lib/ must point at a file that exists, so a driver
// never crashes at runtime with "Cannot find module" (stable-v5 had six such holes on 2026-10-04,
// left by partial ports). Strings inside comments are ignored. Known dead legacy paths are listed
// below; they sit in comments or legacy code that never runs.
const assert = require('assert');
const fs = require('fs');
const path = require('path');

const ROOT = path.resolve(__dirname, '..');
// Files whose dead requires are pre-existing and unreachable (quarantine, examples in comments).
const IGNORE_FILES = new Set([
  'lib/tuya/_quarantine/UniversalTuyaParser.legacy.js',
]);
// Requires that may legitimately be missing: optional features loaded inside try/catch.
const OPTIONAL = new Set([
  'lib/tuya/TuyaZigbeeDevice.js -> ../flow/DeclaredFlowCardAutoWire',
  // WHY(2026-10-18): P2449 declared-card auto-wire is a master/bastien-only enhancement (needs ActuatorFlowHelper +
  // ManifestDriverFlowIndex too); stable is a bug-fix-only channel so it is NOT ported. The loader's require sits in try/catch
  // and only logs. The guard below enforces that every OPTIONAL entry stays inside try { }.
  'lib/flow/UniversalFlowCardLoader.js -> ./DeclaredFlowCardAutoWire',
]);

function stripComments(src) {
  return src.replace(/\/\*[\s\S]*?\*\//g, '').replace(/(^|[^:'"`\\])\/\/.*$/gm, '$1');
}
function exists(t) {
  return ['.js', '.json', '/index.js'].some((e) => fs.existsSync(t + e))
    || (fs.existsSync(t) && fs.statSync(t).isFile());
}
function scan() {
  const missing = [];
  const walk = (dir) => {
    for (const e of fs.readdirSync(dir, { withFileTypes: true })) {
      const p = path.join(dir, e.name);
      if (e.isDirectory()) { if (e.name !== 'node_modules') walk(p); continue; }
      if (!e.name.endsWith('.js')) continue;
      const rel = path.relative(ROOT, p).split(path.sep).join('/');
      if (IGNORE_FILES.has(rel)) continue;
      const src = stripComments(fs.readFileSync(p, 'utf8'));
      for (const m of src.matchAll(/require\(\s*['"](\.{1,2}\/[^'"]+)['"]\s*\)/g)) {
        const key = `${rel} -> ${m[1]}`;
        if (OPTIONAL.has(key)) continue;
        if (!exists(path.resolve(path.dirname(p), m[1]))) missing.push(key);
      }
    }
  };
  for (const d of ['drivers', 'lib']) walk(path.join(ROOT, d));
  return missing;
}

describe('runtime relative requires resolve', () => {
  it('every OPTIONAL missing require is wrapped in try { } (never a bare crash path)', () => {
    for (const key of OPTIONAL) {
      const [file, target] = key.split(' -> ');
      const src = stripComments(fs.readFileSync(path.join(ROOT, file), 'utf8')).split('\n');
      const i = src.findIndex((l) => l.includes(`'${target}'`) || l.includes(`"${target}"`));
      assert.ok(i >= 0, `${key} no longer present: remove it from OPTIONAL`);
      const ctx = src.slice(Math.max(0, i - 3), i + 1).join('\n');
      assert.ok(/\btry\s*\{/.test(ctx), `${key} must be inside try { }`);
    }
  });

  it('no driver/lib module requires a file that does not exist', () => {
    const missing = scan();
    assert.deepStrictEqual(missing, [], `missing modules:\n${missing.join('\n')}`);
  });
});
