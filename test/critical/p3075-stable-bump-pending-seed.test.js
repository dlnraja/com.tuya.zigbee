'use strict';
// P3075 (t613u): the stable bump consumed the pending changelog entry without preparing the next one,
// so the P3057-3 pending-entry check went red after every bump (99b0783708). The bump now seeds the next
// patch, and replaces that seed with our own en + fr note from the commits when the version is published.
const assert = require('assert');
const { describe, it } = require('../_support/dual-runner');
const fs = require('fs');
const os = require('os');
const path = require('path');
const ROOT = path.join(__dirname, '..', '..');
const SVB = require(path.join(ROOT, '.github', 'scripts', 'stable-version-bump.js'));

function fixture(changelog) {
  const d = fs.mkdtempSync(path.join(os.tmpdir(), 'p3075-seed-'));
  fs.writeFileSync(path.join(d, 'app.json'), JSON.stringify({ id: 'com.dlnraja.tuya.zigbee.stable', version: '5.12.512' }));
  fs.writeFileSync(path.join(d, 'package.json'), JSON.stringify({ name: 'x', version: '5.12.512' }, null, 2));
  fs.writeFileSync(path.join(d, '.homeychangelog.json'), JSON.stringify(changelog, null, 2));
  return d;
}
const read = (d) => JSON.parse(fs.readFileSync(path.join(d, '.homeychangelog.json'), 'utf8'));

describe('P3075 stable bump seeds the next pending changelog entry', () => {
  it('a bump keeps a hand-written entry and seeds the next patch in en + fr', () => {
    const d = fixture({ '5.12.513': { en: 'Hand-written note for 5.12.513 about curtain motors.', fr: 'Note écrite à la main.' } });
    SVB.setVersion(d, '5.12.513');
    const cl = read(d);
    fs.rmSync(d, { recursive: true, force: true });
    assert.strictEqual(cl['5.12.513'].en, 'Hand-written note for 5.12.513 about curtain motors.');
    assert.ok(SVB.isPendingSeed(cl['5.12.514']) && cl['5.12.514'].fr, JSON.stringify(cl['5.12.514']));
  });
  it('the seed is replaced at the next bump by a note from our commits, never the generic placeholder', () => {
    const d = fixture({ '5.12.513': { ...SVB.PENDING_SEED } });
    const prev = process.env.HOMEY_CHANGELOG;
    delete process.env.HOMEY_CHANGELOG;
    SVB.setVersion(d, '5.12.513');
    if (prev !== undefined) { process.env.HOMEY_CHANGELOG = prev; }
    const cl = read(d);
    fs.rmSync(d, { recursive: true, force: true });
    const e = cl['5.12.513'];
    assert.ok(!SVB.isPendingSeed(e), 'seed must be replaced');
    assert.ok(e.en && e.fr, JSON.stringify(e));
    assert.ok(!/^(Bug fixes and improvements|Device compatibility and reliability improvements)\.?$/i.test(e.en), e.en);
    assert.ok(SVB.isPendingSeed(cl['5.12.514']));
  });
  it('publish-dir manifests never get a pending seed', () => {
    const d = fixture({});
    SVB.setVersion(d, '5.12.513', { manifestsOnly: true });
    const cl = read(d);
    fs.rmSync(d, { recursive: true, force: true });
    assert.ok(cl['5.12.513'] && cl['5.12.513'].en);
    assert.ok(!cl['5.12.514']);
  });
  it('commit subjects stop at the previous stable bump', () => {
    const s = SVB.subjectsSinceBump(ROOT);
    assert.ok(s.every((x) => !/^chore\(stable\): v\d+\.\d+\.\d+/.test(x)), s.join(' | '));
  });
});
