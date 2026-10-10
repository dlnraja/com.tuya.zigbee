'use strict';

/**
 * P2693 — Bastien vsxvaj9i TS0043 canaux morts + TS0042 lent/ghost
 *
 * Contre quoi:
 * - Missing Ts004xDedicatedComplement on Bastien → weak 0xFD fallback
 * - LevelControl stop→release invent on sticky remotes → other lamp toggles
 * - Phantom EP3/4 fires Flows past buttonCount
 * - Debounce 400–1200ms felt "super lent"
 * Dual-app: BOTH + Bastien tip
 */

const { describe, it } = require('node:test');
const assert = require('node:assert/strict');
const fs = require('fs');
const path = require('path');

const ROOT = path.join(__dirname, '..', '..');

describe('P2693 Bastien TS0043/TS0042 snappy + no ghost', () => {
  it('Ts004xDedicatedComplement exists and skips LevelControl for sticky', () => {
    const p = path.join(ROOT, 'lib/devices/Ts004xDedicatedComplement.js');
    assert.ok(fs.existsSync(p), 'Ts004xDedicatedComplement must ship (was missing on Bastien)');
    const src = fs.readFileSync(p, 'utf8');
    assert.match(src, /disableLevelControlComplement/);
    assert.match(src, /LevelControl skipped \(scene sticky \/ P2693\)/);
  });

  it('vsxvaj9i + dzwgk7e2 profiles: ≤80ms debounce, no LC, skip soft release', () => {
    const src = fs.readFileSync(path.join(ROOT, 'lib/mixins/PhysicalButtonMixin.js'), 'utf8');
    for (const key of ["'_TZ3000_vsxvaj9i'", "'_TZ3000_dzwgk7e2'"]) {
      const idx = src.indexOf(key);
      assert.ok(idx >= 0, `${key} profile`);
      const block = src.slice(idx, idx + 750);
      // WHY(P2714/P2742 snappier than P2693/P2702 floor; aligned 2026-10-11): accept any value ≤ the old cap
      const deb = Number((block.match(/debounceMs:\s*(\d+)/) || [])[1]);
      const dedup = Number((block.match(/crossPathDedupMs:\s*(\d+)/) || [])[1]);
      assert.ok(deb > 0 && deb <= 80, `${key} debounce ${deb}`);
      assert.ok(dedup > 0 && dedup <= 120, `${key} crossPathDedup ${dedup}`);
      assert.match(block, /skipSoftwareHoldRelease:\s*true/);
      assert.match(block, /disableLevelControlComplement:\s*true/);
      assert.match(block, /collapsePhantomEndpoints:\s*true/);
    }
    assert.match(src, /P2693 reject phantom gang/);
  });

  it('button_wireless_2/3 force enableLevelControl false + snappy profile', () => {
    for (const id of ['button_wireless_2', 'button_wireless_3']) {
      const src = fs.readFileSync(path.join(ROOT, `drivers/${id}/device.js`), 'utf8');
      assert.match(src, /enableLevelControl:\s*false/);
      assert.match(src, /skipSoftwareHoldRelease:\s*true/);
      assert.match(src, /disableLevelControlComplement:\s*true/);
      assert.match(src, /debounceMs:\s*(?:Math\.min\(Number\(base\.debounceMs\) \|\| )?\d+/);
      const m = src.match(/debounceMs:\s*(?:Math\.min\(Number\(base\.debounceMs\) \|\| )?(\d+)/);
      assert.ok(m && Number(m[1]) <= 80, `${id} debounce ≤80`);
    }
  });

  it('compose locks vsxvaj9i+TS0043 and teaches Flow not Zigbee canaux', () => {
    const c = JSON.parse(fs.readFileSync(
      path.join(ROOT, 'drivers/button_wireless_3/driver.compose.json'), 'utf8'));
    assert.ok((c.zigbee.manufacturerName || []).some((m) => /vsxvaj9i/i.test(m)));
    assert.ok((c.zigbee.productId || []).includes('TS0043'));
    const fr = `${c.zigbee.learnmode?.instruction?.fr || ''} ${c.zigbee.learnmode?.instruction?.en || ''}`;
    assert.match(fr, /Flow|Bouton appuy/i);
    assert.match(fr, /canaux|Developer|outils developpeur/i);
  });
});
