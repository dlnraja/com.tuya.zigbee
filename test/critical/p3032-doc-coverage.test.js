'use strict';
const test = require('node:test');
const assert = require('node:assert');
const fs = require('fs');
const os = require('os');
const path = require('path');
const { inventory, render } = require('../../scripts/kb/doc-coverage');

test('P3032 doc-coverage lists undocumented code and KB files missing from INDEX', () => {
  const root = fs.mkdtempSync(path.join(os.tmpdir(), 'p3032-'));
  const w = (p, s) => { fs.mkdirSync(path.dirname(path.join(root, p)), { recursive: true }); fs.writeFileSync(path.join(root, p), s); };
  w('lib/Known.js', 'process.env.KNOWN_FLAG;');
  w('lib/Hidden.js', 'process.env.HIDDEN_FLAG;');
  w('scripts/gates/some-gate.js', '');
  w('.github/workflows/x.yml', '');
  w('drivers/d1/driver.compose.json', '{}');
  w('docs/knowledge/KB/INDEX.md', '- [A](A.md)');
  w('docs/knowledge/KB/A.md', 'Known KNOWN_FLAG some-gate d1');
  w('docs/knowledge/KB/B.md', '');
  process.argv.push(`--root=${root}`);
  const mod = require.resolve('../../scripts/kb/doc-coverage');
  delete require.cache[mod];
  const inv = require(mod).inventory();
  process.argv.pop();
  assert.deepStrictEqual(inv.lib.missing, ['lib/Hidden.js']);
  assert.deepStrictEqual(inv.env.missing, ['HIDDEN_FLAG']);
  assert.deepStrictEqual(inv.gates.missing, []);
  assert.deepStrictEqual(inv.workflows.missing, ['.github/workflows/x.yml']);
  assert.deepStrictEqual(inv.kbIndex.missing, ['B.md']);
  assert.match(render(inv), /Report mode/);
  assert.strictEqual(typeof inventory, 'function');
});

test('P3032 code-reference takes the purpose from the file header', () => {
  const { headerOf } = require('../../scripts/kb/code-reference');
  assert.strictEqual(headerOf("'use strict';\n/**\n * Bounded cache for JSON files.\n */\n"), 'Bounded cache for JSON files.');
  assert.strictEqual(headerOf('// line one\n// line two\nconst a = 1;'), 'line one line two');
  assert.strictEqual(headerOf('const a = 1;'), '');
});
