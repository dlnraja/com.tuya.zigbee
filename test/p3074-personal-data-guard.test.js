'use strict';
const test = require('node:test');
const assert = require('node:assert');
const path = require('path');
const G = require('../tools/ci/personal-data-guard');
// fixtures are assembled at runtime so this file holds no literal pattern
const j = (...p) => p.join('');
test('profile file names and LinkedIn profile URLs are flagged', () => {
  assert.ok(G.scanPath(j('reports/my', 'skills-cv/a.md')).length);
  assert.ok(G.scanPath(j('docs/LINKEDIN', '_ABOUT_SOURCE.md')).length);
  assert.ok(G.scanPath(j('x/Someone_Linked', 'In_CV.pdf')).length);
  assert.ok(G.scanText(j('see https://www.linked', 'in.com/in/someone')).length);
  assert.deepStrictEqual(G.scanPath('drivers/switch_1gang/device.js'), []);
  assert.deepStrictEqual(G.scanText('contact dlnraja@gmail.com, see https://www.linkedin.com/company/athom'), []);
});
test('personal address and phone are matched by hash only', () => {
  assert.deepStrictEqual(G.scanText('call 01 23 45 67 89 or mail jane@example.com'), []);
  assert.strictEqual(G.normPhone('+33 1 23 45 67 89'), '0123456789');
});
test('the repository has no personal profile data in tracked files', () => {
  assert.deepStrictEqual(G.run(path.join(__dirname, '..')), []);
});
