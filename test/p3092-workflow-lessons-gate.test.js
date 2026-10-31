'use strict';
/* eslint-env mocha */
// P3092: static CI gate for the P3089 (moved couple re-injected) and P3090 (Z2M-only ZCL names) lessons.
const assert = require('assert');
const fs = require('fs');
const os = require('os');
const path = require('path');
const { describe, it } = global.describe ? global : require('node:test');
const gate = require('../tools/ci/workflow-lessons-gate');

const ROOT = path.join(__dirname, '..');

function fixture() {
  const r = fs.mkdtempSync(path.join(os.tmpdir(), 'p3092-'));
  fs.mkdirSync(path.join(r, 'config/architecture'), { recursive: true });
  fs.mkdirSync(path.join(r, 'drivers/a'), { recursive: true });
  fs.mkdirSync(path.join(r, 'lib'), { recursive: true });
  fs.writeFileSync(path.join(r, 'config/architecture/p3077-phantom-decisions.json'),
    JSON.stringify({ moves: [{ from: 'a', keptOn: 'b', mfr: 'HOBEIAN', batch: 2 }] }));
  return r;
}

describe('P3092 workflow lessons gate', () => {
  it('repo is clean against its baseline', () => {
    assert.deepStrictEqual(gate.run(ROOT), []);
  });
  it('fails when a moved couple comes back (any case)', () => {
    const r = fixture();
    fs.writeFileSync(path.join(r, 'drivers/a/driver.compose.json'), JSON.stringify({ zigbee: { manufacturerName: ['hobeian'] } }));
    assert.strictEqual(gate.checkMoves(r).length, 1);
  });
  it('fails on a new Z2M-only cluster name, passes with the alias', () => {
    const r = fixture();
    fs.writeFileSync(path.join(r, 'lib/x.js'), 'const m = ep.clusters.seMetering;\n');
    assert.strictEqual(gate.run(r).length, 1);
    fs.writeFileSync(path.join(r, 'lib/x.js'), 'const m = ep.clusters.seMetering || ep.clusters.metering;\n');
    assert.deepStrictEqual(gate.run(r), []);
  });
});
