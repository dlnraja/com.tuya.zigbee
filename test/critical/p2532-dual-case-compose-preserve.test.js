'use strict';

/**
 * P2532 — Dual-case compose preserve Contre quoi
 * Complementary OEM overlays must APPEND, never case-collapse dense generics.
 * Dual-app: BOTH
 */

const { describe, it } = require('node:test');
const assert = require('node:assert/strict');
const fs = require('fs');
const path = require('path');
const merge = require('../../lib/enrichment/ComplementaryMerge');

const ROOT = path.join(__dirname, '..', '..');
const readJson = (rel) => JSON.parse(fs.readFileSync(path.join(ROOT, rel), 'utf8'));

describe('P2532 dual-case compose preserve', () => {
  it('appendIdentityStrings keeps existing dual-case entries', () => {
    const existing = ['_TZ3000_abc12345', '_tz3000_abc12345', '_TZ3000_other'];
    const next = merge.appendIdentityStrings(existing, ['_TZE200_newoem', '_tze200_newoem', '_TZ3000_abc12345']);
    assert.equal(next.filter((m) => /abc12345/i.test(m)).length, 2, 'both case forms kept');
    assert.ok(next.includes('_TZ3000_other'));
    assert.ok(next.some((m) => /newoem/i.test(m)));
    assert.equal(next.length, existing.length + 1, 'only one new unique lower-key appended');
  });

  it('unionStrings collapses case (document Contre quoi) while appendIdentityStrings does not', () => {
    const dual = ['_TZ3000_l9brjwau', '_tz3000_l9brjwau'];
    const collapsed = merge.unionStrings(dual, []);
    assert.equal(collapsed.length, 1);
    const preserved = merge.appendIdentityStrings(dual, ['_TZE284_extra']);
    assert.equal(preserved.filter((m) => /l9brjwau/i.test(m)).length, 2);
    assert.ok(preserved.some((m) => /extra/i.test(m)));
  });

  it('wouldDegradeCompose flags mass mfr shrink', () => {
    const before = {
      zigbee: { manufacturerName: Array.from({ length: 100 }, (_, i) => `_TZ3000_x${i}`), productId: ['TS0001'] },
      capabilities: ['onoff'],
    };
    const after = {
      zigbee: { manufacturerName: before.zigbee.manufacturerName.slice(0, 40), productId: ['TS0001'] },
      capabilities: ['onoff'],
    };
    assert.ok(merge.wouldDegradeCompose(before, after));
  });

  it('switch_1gang still has dual-case density + somgoms overlay', () => {
    const c = readJson('drivers/switch_1gang/driver.compose.json');
    const names = c.zigbee?.manufacturerName || [];
    assert.ok(names.length >= 1400);
    const lower = new Set(names.map((m) => String(m).toLowerCase()));
    assert.ok(names.length > lower.size, 'expect some dual-case pairs in dense generics');
    assert.ok(names.some((m) => /7tdtqgwv/i.test(m)));
  });

  it('completer apply path uses appendIdentityStrings (source lock)', () => {
    const src = fs.readFileSync(path.join(ROOT, 'tools/ci/recent-variant-capability-completer.js'), 'utf8');
    assert.ok(/appendIdentityStrings/.test(src));
    assert.ok(!/mergeZigbeeIdentity\(composeData\.zigbee/.test(src), 'must not case-collapse via mergeZigbeeIdentity on apply');
  });

  it('repair shrink script exists for P2531 rollback path', () => {
    assert.ok(fs.existsSync(path.join(ROOT, 'tools/ci/p2531-repair-complementary-shrink.js')));
  });
});
