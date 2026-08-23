'use strict';

/**
 * P2221 — Bidirectional button stack: UnifiedSwitchBase must wire physical+virtual+UI;
 * stale OnOffBoundCluster re-exports 0xFD handleFrame.
 */

const assert = require('assert');
const testApi = global.describe && global.it ? global : require('node:test');
const { describe, it } = testApi;

describe('P2221 bidirectional button architecture', () => {
  it('stale lib/OnOffBoundCluster re-exports clusters/ copy with handleFrame', () => {
    const StalePath = require('../../lib/OnOffBoundCluster');
    const Canon = require('../../lib/clusters/OnOffBoundCluster');
    assert.strictEqual(StalePath, Canon);
    assert.strictEqual(typeof new StalePath({}).handleFrame, 'function');
  });

  it('OnOffBoundCluster routes 0xFD scene payload via onSetOn', async () => {
    const OnOffBoundCluster = require('../../lib/clusters/OnOffBoundCluster');
    const seen = [];
    const bc = new OnOffBoundCluster({
      onSetOn: (p) => seen.push(p),
      onToggle: (p) => seen.push(['toggle', p]),
    });
    await bc.handleFrame({ cmdId: 0xFD, data: Buffer.from([1]) }, null, null);
    assert.strictEqual(seen.length, 1);
    assert.strictEqual(seen[0].cmdId, 0xFD);
    assert.strictEqual(seen[0].scene, 1);
    assert.strictEqual(seen[0].press, 'double');
  });

  it('OnOffBoundCluster routes 0xFC rotate via onToggle', async () => {
    const OnOffBoundCluster = require('../../lib/clusters/OnOffBoundCluster');
    const seen = [];
    const bc = new OnOffBoundCluster({
      onToggle: (p) => seen.push(p),
    });
    await bc.handleFrame({ cmdId: 0xFC, data: Buffer.from([0]) }, null, null);
    assert.strictEqual(seen[0].cmdId, 0xFC);
  });

  it('UnifiedSwitchBase source contains P2221 virtual+UI init after physical', () => {
    const fs = require('fs');
    const path = require('path');
    const src = fs.readFileSync(path.join(__dirname, '..', '..', 'lib', 'devices', 'UnifiedSwitchBase.js'), 'utf8');
    assert.ok(src.includes('P2221: BIDIRECTIONAL'));
    assert.ok(src.includes('initVirtualButtons'));
    const phys = src.indexOf('initPhysicalButtonDetection');
    const virt = src.indexOf('P2221: BIDIRECTIONAL');
    assert.ok(phys > 0 && virt > phys);
  });
});
