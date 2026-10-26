'use strict';
const test = require('node:test');
const assert = require('node:assert');
const path = require('path');
const G = require('../tools/ci/personal-data-guard');
// fixtures are assembled at runtime so this file holds no literal pattern
const j = (...p) => p.join('');
test('profile file names and LinkedIn profile URLs are flagged', () => {
  assert.ok(G.scanPath(j('reports/my', 'skills-cv/a.md')).length);
  assert.ok(G.scanPath(j('docs/LINKEDIN', '_ABOUT_SOURCE.md')).length);
  assert.ok(G.scanPath(j('x/Someone_Linked', 'In_CV.pdf')).length);
  assert.ok(G.scanText(j('see https://www.linked', 'in.com/in/someone')).length);
  assert.deepStrictEqual(G.scanPath('drivers/switch_1gang/device.js'), []);
  assert.deepStrictEqual(G.scanText('contact dlnraja@gmail.com, see https://www.linkedin.com/company/athom'), []);
});
test('personal address and phone are matched by hash only', () => {
  assert.deepStrictEqual(G.scanText('call 01 23 45 67 89 or mail jane@example.com'), []);
  assert.strictEqual(G.normPhone('+33 1 23 45 67 89'), '0123456789');
});
test('the repository has no personal profile data in tracked files', () => {
  assert.deepStrictEqual(G.run(path.join(__dirname, '..')), []);
});
// P3075 (t609u): job-search / application material is blocked too (terms matched by hash)
test('job-application terms and employer names are flagged, by hash, case and accent insensitive', () => {
  for (const s of [j('ma candi', 'dature'), j('Lettre de moti', 'vation'), j('COVER-let', 'ter'), j('un recru', 'teur'),
    j("offre d'em", 'ploi'), j('le sal', 'aire'), j('Bouy', 'gues'), j('As', 'tek'), j('NEVER', 'HACK')]) {
    assert.ok(G.hasJobTerm(s), 'not flagged: ' + s.length);
    assert.ok(G.scanText('x ' + s + ' y').includes('job-application-term'));
  }
  assert.ok(G.scanPath(j('reports/ANDROID_BOUY', 'GUES_NOTES.md')).length);
  for (const s of ['cover the window', 'offre spéciale', 'letter box', 'Zigbee astro clock', 'motion sensor', 'jobs queue']) {
    assert.strictEqual(G.hasJobTerm(s), false, s);
  }
});
test('application folders are blocked as tracked paths', () => {
  assert.ok(G.scanPath(j('candi', 'datures/acme/cv.md')).length);
  assert.ok(G.scanPath(j('jo', 'bs/acme.md')).length);
  assert.ok(G.scanPath(j('reports/removed-', 'personal-dir/x.md')).length);
  assert.deepStrictEqual(G.scanPath('lib/scheduler/job-runner.js'), []);
});
test('.gitignore keeps application folders out of the index', () => {
  const gi = require('fs').readFileSync(path.join(__dirname, '..', '.gitignore'), 'utf8').split(/\r?\n/);
  for (const e of [j('candi', 'datures/'), j('jo', 'bs/'), j('reports/removed-', 'personal-dir/')]) assert.ok(gi.includes(e), e);
});
