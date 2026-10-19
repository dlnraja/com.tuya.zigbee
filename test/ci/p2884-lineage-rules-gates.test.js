'use strict';
// P2884: the P2281 lineage gate accepts P2138 run through the shared
// rules-gates action only when that step is hard and selects p2138.
const assert = require('assert');
const path = require('path');
const { execFileSync } = require('child_process');
const G = require('../../tools/ci/discovery-lineage-enrich-gate.js');

const step = (extra) => [
  'jobs:',
  '  a:',
  '    steps:',
  '      - name: Rules gates',
  '        uses: ./.github/actions/rules-gates',
  '        with:',
  ...extra.map((l) => '          ' + l),
  '      - name: next',
  '        run: echo ok',
].join('\n');

describe('P2884 lineage gate x shared rules-gates', () => {
  it('accepts a hard step selecting p2138', () => {
    assert.strictEqual(G.hardRulesGatesSelects(step(['only: anti-bot,p2138,flow-title']), 'p2138'), true);
  });
  it('accepts the default core profile (contains p2138)', () => {
    assert.strictEqual(G.hardRulesGatesSelects(step(['profile: core']), 'p2138'), true);
  });
  it('rejects a step whose only: omits p2138', () => {
    assert.strictEqual(G.hardRulesGatesSelects(step(['only: anti-bot,flow-title']), 'p2138'), false);
  });
  it('rejects a soft step', () => {
    assert.strictEqual(G.hardRulesGatesSelects(step(['only: p2138', "soft: 'true'"]), 'p2138'), false);
  });
  it('rejects continue-on-error', () => {
    const y = step(['only: p2138']).replace('        uses:', '        continue-on-error: true\n        uses:');
    assert.strictEqual(G.hardRulesGatesSelects(y, 'p2138'), false);
  });
  it('requires the runner to map p2138 to the real script', () => {
    assert.strictEqual(G.rulesGatesMaps('p2138', 'tools/ci/p2138-sacred-couple-matrix-gate.js'), true);
    assert.strictEqual(G.rulesGatesMaps('p2138', 'tools/ci/nope.js'), false);
  });
  it('passes on the real repository workflows', () => {
    execFileSync(process.execPath, [path.join(__dirname, '..', '..', 'tools', 'ci', 'discovery-lineage-enrich-gate.js')], { stdio: 'pipe' });
  });
});
