'use strict';
// P3404: the scheduled Apple Home coherence matrix runs on stable-v5 and bastien-home,
// which do not carry scripts/ci/apple-home-coherence.cjs yet. The gate must skip those
// branches instead of failing with MODULE_NOT_FOUND (run 45278502197).
const test = require('node:test');
const assert = require('node:assert');
const fs = require('fs');
const path = require('path');

const wf = fs.readFileSync(path.join(__dirname, '../../.github/workflows/apple-home-coherence.yml'), 'utf8');

test('gate checks the P3362 script exists before running', () => {
  const gate = wf.slice(wf.indexOf('id: gate'), wf.indexOf('Setup Node 22'));
  assert.match(gate, /if \[ ! -f scripts\/ci\/apple-home-coherence\.cjs \]/);
  assert.match(gate, /run=false/);
});

test('every step that calls the script is gated on run == true', () => {
  const steps = wf.split(/\n\s{6}- name: /).slice(1);
  for (const st of steps) {
    if (st.includes('apple-home-coherence.cjs --')) {
      assert.match(st, /if: steps\.gate\.outputs\.run == 'true'/, st.split('\n')[0]);
    }
  }
});

test('config kill switch is still honoured', () => {
  assert.match(wf, /enabled=false/);
  assert.match(wf, /config\/ci\/apple-home-coherence\.json/);
});
