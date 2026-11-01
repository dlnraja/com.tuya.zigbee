'use strict';
// P3194: tests that use mkdtemp register an exit cleanup (no /tmp leftovers).
const assert = require('assert');
const fs = require('fs');
const path = require('path');
const files = ['test/critical/p2920-p2268-no-case-variant.test.js', 'test/critical/p3048-digest.test.js',
  'test/critical/p3048-journal.test.js', 'test/critical/p3048-self-maintain.test.js',
  'test/critical/p3019d-three-way-promote.test.js', 'test/mocks/cursor-ai-forfait.js'];
describe('P3194 tmp cleanup', () => {
  for (const f of files) {
    it(`${f} removes its temp dirs`, () => {
      const s = fs.readFileSync(path.join(__dirname, '..', f), 'utf8');
      assert.ok(s.includes("process.on('exit'"));
      assert.strictEqual((s.match(/fs\.mkdtempSync\(/g) || []).length, 1, 'only the tracked helper calls mkdtempSync');
    });
  }
});
