'use strict';
// P3041 (25/10/2026 Paris): unsourced all-lower/all-upper case twins get no publish room; opt-in prune.
const { describe, it } = require('../_support/dual-runner');
const assert = require('assert');
const { splitArtifactForms, loadSourcedForms } = require('../../scripts/lib/case-form-sources.cjs');
const { limitCaseForms } = require('../../scripts/maintenance/compact-zigbee-identifiers.cjs');
const { pruneManifest } = require('../../scripts/maintenance/case-artifact-prune.cjs');
const { checkBaseline } = require('../../scripts/maintenance/publish-baseline-gate.cjs');
const { candidates } = require('../../scripts/maintenance/ts0601-topup.cjs');
const caps = require('../../scripts/lib/publish-caps.cjs');

describe('P3041 case forms need a source', () => {
  it('drops the unsourced lowercase twin of a canonical Tuya form', () => {
    const r = splitArtifactForms(['_TZE200_abcd1234', '_tze200_abcd1234'], new Set());
    assert.deepStrictEqual(r.kept, ['_TZE200_abcd1234']);
    assert.deepStrictEqual(r.artifacts, ['_tze200_abcd1234']);
  });
  it('never drops a sourced form, a padded form, or a lone form', () => {
    const S = new Set(['_tze200_lower1', 'HOBEIAN']);
    assert.deepStrictEqual(splitArtifactForms(['_TZE200_lower1', '_tze200_lower1'], S).artifacts, []);
    assert.deepStrictEqual(splitArtifactForms(['AOYAN  ', 'aoyan  '], new Set(['AOYAN  '])).kept, ['AOYAN  ', 'aoyan  ']);
    assert.deepStrictEqual(splitArtifactForms(['_tze200_only'], new Set()).artifacts, []);
    assert.deepStrictEqual(splitArtifactForms(['HOBEIAN', 'hobeian'], S).kept, ['HOBEIAN']);
  });
  it('leaves a group untouched when no form is sourced or canonical (no guessing)', () => {
    assert.deepStrictEqual(splitArtifactForms(['HEIMAN', 'heiman'], new Set()).artifacts, []);
  });
  it('limitCaseForms keeps the old behaviour without a source set and skips twins with one', () => {
    assert.deepStrictEqual(limitCaseForms(['_TZ3000_aaa', '_tz3000_aaa'], 2), ['_TZ3000_aaa', '_tz3000_aaa']);
    assert.deepStrictEqual(limitCaseForms(['_TZ3000_aaa', '_tz3000_aaa'], 2, new Set()), ['_TZ3000_aaa']);
  });
  it('TS0601 top-up candidates cost one form when the twin is unsourced', () => {
    const source = { drivers: [{ id: 'd', zigbee: { productId: ['TS0601', 'TS0001'], manufacturerName: ['_TZE200_new1', '_tze200_new1'] } }] };
    const payload = { drivers: [{ id: 'd', zigbee: { productId: ['TS0601', 'TS0001'], manufacturerName: ['_TZE200_old'] } }] };
    assert.strictEqual(candidates(source, payload, { maxCaseForms: 2 })[0].cost, 4);
    assert.strictEqual(candidates(source, payload, { maxCaseForms: 2, caseFormSources: new Set() })[0].cost, 2);
  });
  it('the opt-in prune removes only twins that keep a case-equivalent on the same driver', () => {
    const m = { drivers: [{ id: 'd', zigbee: { productId: ['TS0601', 'TS0002'], manufacturerName: ['_TZE200_x', '_tze200_x', 'HEIMAN', 'heiman'] } }] };
    const r = pruneManifest(m, new Set());
    assert.deepStrictEqual(m.drivers[0].zigbee.manufacturerName, ['_TZE200_x', 'HEIMAN', 'heiman']);
    assert.strictEqual(r.removedCombos, 2);
    assert.deepStrictEqual(r.orphaned, []);
  });
  it('P3024b stays exact by default and accepts a case twin only with the opt-in source set', () => {
    const baseline = { drivers: { d: { m: ['_TZE200_x', '_tze200_x'], p: ['TS0601'] } }, exemptions: [] };
    const payload = { drivers: [{ id: 'd', zigbee: { productId: ['TS0601'], manufacturerName: ['_TZE200_x'] } }] };
    assert.strictEqual(checkBaseline(payload, baseline).missing.length, 1);
    const r = checkBaseline(payload, baseline, { caseEquivalentSourced: new Set() });
    assert.strictEqual(r.missing.length, 0);
    assert.strictEqual(r.caseEquivalent, 1);
    // a SOURCED lowercase form is never folded away
    assert.strictEqual(checkBaseline(payload, baseline, { caseEquivalentSourced: new Set(['_tze200_x']) }).missing.length, 1);
  });
  it('config (owner yes t526s3030): prune ON, measured-safe caps 17000/1008, top-ups 20000/1008, nothing above measured', () => {
    const c = caps.loadPublishCaps({ env: {} });
    assert.strictEqual(c.caseFormsNeedSource, 1);
    assert.strictEqual(c.pruneArtifactCaseForms, 1);
    assert.deepStrictEqual([c.maxTotalCombos, c.maxDriverCombos, c.kbTopupMaxTotal, c.kbTopupMaxDriver, c.ts0601TopupMaxTotal, c.ts0601TopupMaxDriver, c.allowAboveMeasuredCombos],
      [17000, 1008, 20000, 1008, 20000, 1008, 0]);
    assert.ok(c.maxDriverCombos <= c.measured.acceptedMaxDriverCombos && c.ts0601TopupMaxTotal <= c.measured.acceptedMaxTotalCombos);
    const d = caps.readFile(require('path').join(__dirname, '..', '..')).decision;
    assert.strictEqual(d.id, 'P3041');
    assert.match(d.by, /t526s3030/);
    assert.strictEqual(d.rollback.caps.pruneArtifactCaseForms, 0);
  });
  it('case-equivalent gate with the prune report: the canonical form must stay on the driver it was pruned from', () => {
    const baseline = { drivers: { d: { m: ['_TZE200_x', '_tze200_x'], p: ['TS0601'] } }, exemptions: [] };
    const pruned = [{ driverId: 'd', form: '_tze200_x', productIds: ['TS0601'] }];
    const same = { drivers: [{ id: 'd', zigbee: { productId: ['TS0601'], manufacturerName: ['_TZE200_x'] } }] };
    const r = checkBaseline(same, baseline, { caseEquivalentSourced: new Set(), caseEquivalentPruned: pruned });
    assert.deepStrictEqual([r.missing.length, r.caseEquivalent], [0, 1]);
    const moved = { drivers: [{ id: 'd', zigbee: { productId: ['TS0002'], manufacturerName: ['HEIMAN'] } }, { id: 'e', zigbee: { productId: ['TS0601'], manufacturerName: ['_TZE200_x'] } }] };
    assert.strictEqual(checkBaseline(moved, baseline, { caseEquivalentSourced: new Set(), caseEquivalentPruned: pruned }).missing.length, 1);
    // not in the prune report = not an artifact the prune removed: stays a real loss
    assert.strictEqual(checkBaseline(same, baseline, { caseEquivalentSourced: new Set(), caseEquivalentPruned: [] }).missing.length, 1);
  });
  it('prepare-publish wires the prune report into the final P3024b gate', () => {
    const s = require('fs').readFileSync(require('path').join(__dirname, '..', '..', 'scripts', 'prepare-publish.js'), 'utf8');
    assert.match(s, /caseEquivalentPruned: p3041Pruned/);
    assert.match(s, /p3041Pruned = pr\.removed/);
  });
  it('the sourced set comes from external sources only (no minted all-lowercase Tuya mass)', () => {
    const S = loadSourcedForms();
    assert.ok(S.size > 1000);
    const lowerTuya = [...S].filter((v) => v.startsWith('_') && v === v.toLowerCase()).length;
    assert.ok(lowerTuya < 50, `too many lowercase Tuya forms in sources: ${lowerTuya}`);
  });
});
