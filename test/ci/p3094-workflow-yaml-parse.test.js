'use strict';
// P3094: a step name containing an unquoted "colon + space" (P3092, "gate (P3092: moved ...)") made
// node22-tests.yml unparseable, so GitHub refused the workflow and self-check/syntax-check/unified-ci
// went red on master 97f12a4d37 (31/10). Every workflow must load with js-yaml, and no plain-scalar
// step name may contain ": " (quote it instead).
const test = require('node:test');
const assert = require('node:assert');
const fs = require('fs');
const path = require('path');
const yaml = require('js-yaml');

const WF = path.resolve(__dirname, '..', '..', '.github', 'workflows');
const files = fs.readdirSync(WF).filter((f) => /\.ya?ml$/.test(f));

test('P3094: every workflow file parses as YAML', () => {
  const bad = [];
  for (const f of files) {
    try { yaml.load(fs.readFileSync(path.join(WF, f), 'utf8')); } catch (e) { bad.push(`${f}: ${String(e.message).split('\n')[0]}`); }
  }
  assert.deepStrictEqual(bad, []);
});

test('P3094: no unquoted step name with an inner ": "', () => {
  const bad = [];
  const re = /^\s*-?\s*name:\s+([^'"\s#][^#\n]*)$/;
  for (const f of files) {
    fs.readFileSync(path.join(WF, f), 'utf8').split('\n').forEach((line, i) => {
      const m = re.exec(line);
      if (m && /:\s/.test(m[1])) bad.push(`${f}:${i + 1}`);
    });
  }
  assert.deepStrictEqual(bad, []);
});
