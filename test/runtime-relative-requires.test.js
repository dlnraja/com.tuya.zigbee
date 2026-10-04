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
  it('no driver/lib module requires a file that does not exist', () => {
    const missing = scan();
    assert.deepStrictEqual(missing, [], `missing modules:\n${missing.join('\n')}`);
  });
});
