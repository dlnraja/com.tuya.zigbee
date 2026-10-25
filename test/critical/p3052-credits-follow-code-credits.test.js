'use strict';
// P3052: every "idea credit" / study source named in our own code must also be thanked in CREDITS.md
// (rule: credit + thank each source). Covers the Switcher (iBush) and localtuya ideas promoted from master.
const test = require('node:test');
const assert = require('node:assert');
const fs = require('fs');
const path = require('path');
const ROOT = path.resolve(__dirname, '..', '..');
const credits = fs.readFileSync(path.join(ROOT, 'CREDITS.md'), 'utf8');

test('P3052 Switcher idea credit (iBush, t/160624) is thanked in CREDITS.md', () => {
  const flow = fs.readFileSync(path.join(ROOT, 'lib', 'flow', 'FeatureFlowCards.js'), 'utf8');
  if (/iBush/.test(flow)) {
    assert.match(credits, /\*\*iBush\*\*/);
    assert.match(credits, /t\/160624/);
  }
});

test('P3052 localtuya study source is thanked in CREDITS.md when its code is shipped', () => {
  if (fs.existsSync(path.join(ROOT, 'lib', 'tuya', 'LocalTuyaInspired.js'))) {
    assert.match(credits, /rospogrigio\/localtuya and forks/);
    assert.ok(fs.existsSync(path.join(ROOT, 'docs', 'automation', 'localtuya-study.md')), 'study notes present');
  }
});
