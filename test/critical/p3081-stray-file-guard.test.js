'use strict';
// P3081: no pasted web pages / scratch notes in the tree (7b64ef71f1 committed a saved forum post as
// drivers/*/"# [APP][Pro] Universal TUYA Zigbee Devic.txt"). CI self-check runs the same gate.
const { describe, it } = require('../_support/dual-runner');
const assert = require('assert');
const fs = require('fs');
const path = require('path');

const ROOT = path.join(__dirname, '..', '..');
const { strayFiles, trackedFiles } = require('../../scripts/ci/stray-file-gate.cjs');

describe('P3081 stray file guard', () => {
  it('the tracked tree has no #-named file and no .txt under drivers/', () => {
    assert.deepStrictEqual(strayFiles(trackedFiles(ROOT)), []);
  });

  it('flags the pasted forum page shape and .txt in drivers, keeps normal files', () => {
    const bad = [
      'drivers/presence_sensor_radar/# [APP][Pro] Universal TUYA Zigbee Devic.txt',
      'docs/#notes.md',
      'drivers/x/notes.TXT',
    ];
    const ok = ['drivers/x/device.js', 'drivers/x/driver.compose.json', 'docs/readme.txt', 'lib/a#b.js', 'README.md'];
    assert.deepStrictEqual(strayFiles([...bad, ...ok]), bad);
  });

  it('CI self-check runs the gate', () => {
    assert.match(fs.readFileSync(path.join(ROOT, '.github/workflows/ci-self-check.yml'), 'utf8'), /node scripts\/ci\/stray-file-gate\.cjs/);
  });
});
