'use strict';

/** P2791 — issue image OCR extraction + compose ↔ app.json fingerprint drift gate. */
const { describe, it } = require('node:test');
const assert = require('node:assert/strict');
const fs = require('fs');
const path = require('path');
const { extract, normMfr, IMG_RE } = require('../../scripts/scanners/issue-image-ocr');
const { check, diffSets } = require('../../tools/ci/compose-appjson-fingerprint-sync-gate');

const root = path.join(__dirname, '../..');

describe('P2791 issue image OCR', () => {
  it('extracts mfr / pid / DP / capability hints from OCR text', () => {
    const r = extract('Manufacturer: TZE204_gkfbdvyx model TS0601 dp 103 measure_luminance');
    assert.deepEqual(r.mfrs, ['_TZE204_gkfbdvyx']);
    assert.deepEqual(r.pids, ['TS0601']);
    assert.ok(r.dps.includes(103));
    assert.ok(r.caps.includes('measure_luminance'));
    assert.equal(normMfr('tze204_gkfbdvyx'), '_TZE204_gkfbdvyx');
    assert.equal(normMfr('_TZE204_00000000'), null);
  });
  it('recognises GitHub attachment image URLs', () => {
    const s = 'see https://github.com/user-attachments/assets/0123abcd-1111-2222-3333-444455556666 here';
    assert.ok(new RegExp(IMG_RE.source, IMG_RE.flags.includes('g') ? IMG_RE.flags : `${IMG_RE.flags}g`).test(s));
  });
  it('is capped and wired into the scheduled enrich workflow with a free local OCR install', () => {
    const wf = fs.readFileSync(path.join(root, '.github/workflows/oss-lan-source-enrich.yml'), 'utf8');
    assert.match(wf, /apt-get install[^\n]*tesseract-ocr/);
    assert.match(wf, /issue-image-ocr\.js/);
    assert.match(wf, /--max-images=/);
    assert.match(wf, /safe-auto-commit\.js --id=image-ocr/);
  });
});

describe('P2791 compose ↔ app.json fingerprint gate', () => {
  it('diffSets reports one-sided entries', () => {
    assert.deepEqual(diffSets(['a', 'b'], ['b', 'c']), { onlyCompose: ['a'], onlyApp: ['c'] });
  });
  it('repository has no drift', () => {
    assert.deepEqual(check(root), []);
  });
});
