'use strict';
const test = require('node:test');
const assert = require('node:assert');
const path = require('path');
const G = require('../tools/ci/email-guard');
test('third-party addresses are flagged and redacted; allowed ones kept', () => {
  assert.deepStrictEqual(G.scanText('mail jane.doe@gmail.com and homey@frient.com'), ['jane.doe@gmail.com', 'homey@frient.com']);
  for (const ok of ['dlnraja@gmail.com', 'user@example.com', '9746898+dlnraja@users.noreply.github.com', 'noreply@homey.app', 'support@athom.com', 'zigbee-clusters@3.0.1']) assert.ok(G.allowed(ok), ok);
  assert.strictEqual(G.redactText('"support": "mailto:x.y@hotmail.com"'), '"support": "mailto:' + G.REDACTED + '"');
});
test('the repository has no third-party emails in tracked files', () => {
  assert.deepStrictEqual(G.run(path.join(__dirname, '..'), false), []);
});
