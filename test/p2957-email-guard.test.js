'use strict';
const at = '@'; // fixtures are built at runtime so this file holds no literal address
const test = require('node:test');
const assert = require('node:assert');
const path = require('path');
const G = require('../tools/ci/email-guard');
test('third-party addresses are flagged and redacted; allowed ones kept', () => {
  assert.deepStrictEqual(G.scanText('mail jane.doe' + at + 'gmail.com and homey' + at + 'frient.com'), ['jane.doe' + at + 'gmail.com', 'homey' + at + 'frient.com']);
  for (const ok of ['dlnraja' + at + 'gmail.com', 'user' + at + 'example.com', '9746898+dlnraja' + at + 'users.noreply.github.com', 'noreply' + at + 'homey.app', 'support' + at + 'athom.com', 'zigbee-clusters@3.0.1']) assert.ok(G.allowed(ok), ok);
  assert.strictEqual(G.redactText('"support": "mailto:x.y' + at + 'hotmail.com"'), '"support": "mailto:' + G.REDACTED + '"');
});
test('the repository has no third-party emails in tracked files', () => {
  assert.deepStrictEqual(G.run(path.join(__dirname, '..'), false), []);
});
