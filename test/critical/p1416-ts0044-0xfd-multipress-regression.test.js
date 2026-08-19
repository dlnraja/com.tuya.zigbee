'use strict';

const assert = require('assert');
const fs = require('fs');
const path = require('path');
const Module = require('module');

const ROOT = path.join(__dirname, '..', '..');

// Many CI runners don't ship zigbee-clusters; keep this test hermetic.
const originalLoad = Module._load;
Module._load = function patchedLoad(request, parent, isMain) {
  if (request === 'zigbee-clusters') {
    return { BoundCluster: class {} };
  }
  return originalLoad.call(this, request, parent, isMain);
};

const OnOffBoundCluster = require('../../lib/clusters/OnOffBoundCluster');
Module._load = originalLoad;

const { resolve: resolvePressType } = require('../../lib/utils/TuyaPressTypeMap');

describe('P1416 regression guard — TS0044 cmd 0xFD multi-press', () => {
  it('OnOffBoundCluster passes scene=d[0] to onSetOn for cmdId 0xFD', async () => {
    let seen = null;

    const cluster = new OnOffBoundCluster({
      onSetOn: (p) => { seen = p; },
    });

    await cluster.handleFrame({ cmdId: 0xFD, data: Buffer.from([1]) }, null, null);

    assert.deepStrictEqual(
      { cmdId: seen.cmdId, scene: seen.scene },
      { cmdId: 0xFD, scene: 1 },
      'scene must come from the first data byte'
    );
  });

  it('maps scene=1 -> double and scene=2 -> long (prevents #1416-style break)', async () => {
    function routeScene(scene) {
      let pressType;
      const cluster = new OnOffBoundCluster({
        onSetOn: (p) => {
          if (p?.cmdId !== 0xFD) return;
          pressType = resolvePressType(p.scene ?? 0, 'BTN2-0xFD');
        },
      });

      return cluster.handleFrame({ cmdId: 0xFD, data: Buffer.from([scene]) }, null, null)
        .then(() => pressType);
    }

    assert.strictEqual(await routeScene(1), 'double');
    assert.strictEqual(await routeScene(2), 'long');
  });

  it('source contract: button_wireless_wall routes cmd 0xFD via resolvePressType(scene)', () => {
    const src = fs.readFileSync(path.join(ROOT, 'drivers/button_wireless_wall/device.js'), 'utf8');

    // Formatting can differ between branches:
    // - master: if(p?.cmdId!==0xFD){return;}
    // - stable: if(p?.cmdId!==0xFD)return;
    assert.match(
      src,
      /if\s*\(\s*p\?\.\s*cmdId\s*!==\s*0xFD\s*\)\s*(?:\{\s*return;?\s*\}|return;?\s*)/
    );
    assert.match(src, /resolvePressType\(\s*p\.scene\s*\?\?\s*0\s*,\s*'BTN2-0xFD'\s*\)/);
  });
});

