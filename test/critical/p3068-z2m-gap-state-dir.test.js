'use strict';
// P3068: z2m-gap-audit must create the untracked .github/state dir before writing (fresh CI checkout => ENOENT).
const test = require('node:test');
const assert = require('node:assert');
const fs = require('fs');
const path = require('path');

const src = fs.readFileSync(path.join(__dirname, '..', '..', 'tools', 'ci', 'z2m-gap-audit.js'), 'utf8');

test('z2m-gap-audit mkdirs .github/state (recursive) before writing its report', () => {
  const mk = src.indexOf("fs.mkdirSync(path.join(ROOT, '.github', 'state'), { recursive: true })");
  const wr = src.indexOf("fs.writeFileSync(path.join(ROOT, '.github', 'state', 'z2m-gap-audit.json')");
  assert.ok(mk > 0, 'mkdirSync missing');
  assert.ok(wr > mk, 'mkdirSync must precede the report write');
});
