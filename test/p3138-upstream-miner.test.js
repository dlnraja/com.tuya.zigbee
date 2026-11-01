'use strict';
const assert = require('assert');
const fs = require('fs');
const path = require('path');
describe('P3138 upstream thread miner + digest guard wiring', () => {
  const wf = fs.readFileSync(path.join(__dirname, '../.github/workflows/upstream-thread-miner.yml'), 'utf8');
  it('workflow is least-privilege, no AI, fail-closed guards before commit', () => {
    assert.ok(/^permissions:\n  contents: read/m.test(wf));
    assert.ok(/AI_ALLOW_REMOTE: 'false'/.test(wf));
    assert.ok((wf.match(/digest-guard\.js/g) || []).length >= 2);
    assert.ok(/house-data-guard\.js/.test(wf));
    assert.ok(/persist-credentials: false/.test(wf));
  });
  it('miner covers zigpy org + other projects and is relevance-filtered', () => {
    const { REPOS, RELEVANT } = require('../scripts/scanners/upstream-thread-miner');
    for (const r of ['zigpy/zha-device-handlers', 'zigpy/zigpy', 'Koenkk/zigbee2mqtt', 'dresden-elektronik/deconz-rest-plugin', 'make-all/tuya-local']) assert.ok(REPOS.includes(r), r);
    assert.ok(RELEVANT.test('_TZ3000_dfgbtub0')); assert.ok(!RELEVANT.test('Philips Hue bulb'));
  });
  it('digest-guard fails closed on a planted schedule', () => {
    const tmp = path.join(require('os').tmpdir(), 'p3138-planted.md');
    fs.writeFileSync(tmp, 'remote in the kitchen, every night at 23:15 when we go to bed');
    assert.ok(require('../scripts/ci/digest-guard').run([tmp]).length === 1);
  });
  it('generated digests are clean', () => {
    assert.deepStrictEqual(require('../scripts/ci/digest-guard').run([]), []);
  });
});

describe('P3151 miner sources', () => {
  it('includes deCONZ and Blakadder', () => {
    const { REPOS } = require('../scripts/scanners/upstream-thread-miner');
    require('assert').ok(REPOS.includes('dresden-elektronik/deconz-rest-plugin'));
    require('assert').ok(REPOS.includes('blakadder/zigbee'));
  });
});
