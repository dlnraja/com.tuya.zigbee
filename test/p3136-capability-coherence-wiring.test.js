'use strict';
// P3136: the capability / HomeKit / tile-coherence audit stays permanent and blocking.
const assert = require('assert');
const fs = require('fs');
const path = require('path');
const W = (f) => path.join(__dirname, '..', '.github', 'workflows', f);
describe('P3136 capability coherence audit wiring', () => {
  it('dedicated workflow: push/PR on drivers + SSOT, adaptive schedule, ratchet', () => {
    const s = fs.readFileSync(W('capability-coherence.yml'), 'utf8');
    for (const k of ['pull_request:', 'push:', "'drivers/**'", "'data/**'", 'schedule:', 'Adaptive plan', 'p3135-capability-coherence-audit.test.js']) assert.ok(s.includes(k), k);
  });
  it('ci-self-check + onboarding + enrich workflows run the ratchet before committing', () => {
    for (const f of ['ci-self-check.yml', 'market-couples-intake.yml', 'auto-enrich-closed-loop.yml', 'fleet-intelligent-enrich.yml']) {
      if (!fs.existsSync(W(f))) continue;
      assert.ok(fs.readFileSync(W(f), 'utf8').includes('p3135-capability-coherence-audit.test.js'), f);
    }
  });
});
