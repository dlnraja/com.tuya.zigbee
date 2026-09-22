'use strict';

/**
 * P2683 — Bastien vsxvaj9i TS0043 dead + dzwgk7e2 slow/ghost Contre quoi
 *
 * Contre quoi:
 * - _TZ3000_vsxvaj9i+TS0043: no DEVICE_PROFILES / skip8004 → "canaux Zigbee" dead
 * - _TZ3000_dzwgk7e2+TS0042: debounce 1200 → "super lent"; phantom EP3/4 → ghost lamp
 * Dual-app: BOTH
 */

const { describe, it } = require('node:test');
const assert = require('node:assert/strict');
const fs = require('fs');
const path = require('path');

const ROOT = path.join(__dirname, '..', '..');

describe('P2683 Bastien TS0043/TS0042 sticky UX', () => {
  it('vsxvaj9i DEVICE_PROFILES is hybrid skip8004 buttonCount 3', () => {
    const src = fs.readFileSync(path.join(ROOT, 'lib/mixins/PhysicalButtonMixin.js'), 'utf8');
    const idx = src.indexOf("'_TZ3000_vsxvaj9i'");
    assert.ok(idx >= 0, 'vsxvaj9i profile required');
    const block = src.slice(idx, idx + 500);
    assert.ok(/protocol:\s*'hybrid'/.test(block));
    assert.ok(/skip8004:\s*true/.test(block));
    assert.ok(/buttonCount:\s*3/.test(block));
    assert.ok(/productId:\s*'TS0043'/.test(block));
    assert.ok(/collapsePhantomEndpoints:\s*true/.test(block));
  });

  it('button_wireless_3 profile forces skip8004 + buttonCount 3', () => {
    const src = fs.readFileSync(path.join(ROOT, 'drivers/button_wireless_3/device.js'), 'utf8');
    assert.ok(/skip8004:\s*true/.test(src));
    assert.ok(/buttonCount:\s*3/.test(src));
    assert.ok(/collapsePhantomEndpoints:\s*true/.test(src));
    assert.ok(/vsxvaj9i/.test(src));
  });

  it('compose locks vsxvaj9i+TS0043 and teaches Flow not Zigbee channels', () => {
    const c = JSON.parse(
      fs.readFileSync(path.join(ROOT, 'drivers/button_wireless_3/driver.compose.json'), 'utf8')
    );
    assert.ok((c.zigbee.manufacturerName || []).some((m) => /vsxvaj9i/i.test(m)));
    assert.ok((c.zigbee.productId || []).includes('TS0043'));
    const fr = c.zigbee.learnmode?.instruction?.fr || '';
    assert.ok(/Bouton appuy/i.test(fr));
    assert.ok(/canaux|outils developpeur|Developer|PAS Homey Zigbee/i.test(fr + (c.zigbee.learnmode?.instruction?.en || '')));
  });

  it('identity re-arm clears hybrid flag + reinstalls for remotes', () => {
    const src = fs.readFileSync(path.join(ROOT, 'lib/mixins/PhysicalButtonMixin.js'), 'utf8');
    assert.ok(/_wallSceneRemoteHybridInstalled\s*=\s*false/.test(src));
    assert.ok(/P2683 hybrid re-arm/.test(src));
    assert.ok(/installWallSceneRemoteHybrid/.test(src));
  });

  it('OnOffFd bindMax clamps to profile.buttonCount', () => {
    const src = fs.readFileSync(path.join(ROOT, 'lib/mixins/PhysicalButtonMixin.js'), 'utf8');
    assert.ok(/profileBtn/.test(src));
    assert.ok(/bindMax = Math\.min\(bindMax, profileBtn\)/.test(src));
  });
});
