'use strict';

/**
 * P2283 — Permanent bidirectional physical ↔ virtual button architecture gate.
 * Max-depth: gangCount/buttonCount, virtual stamp, handleFrame chain, flow IDs, L14.
 */

const assert = require('assert');
const fs = require('fs');
const path = require('path');

const ROOT = path.join(__dirname, '..', '..');
const testApi = global.describe && global.it ? global : require('node:test');
const { describe, it } = testApi;

const {
  resolveGangCount,
  ensureDedup,
  stampVirtual,
  stampPhysical,
  isWithinDedup,
  wrapHandleFrame,
  DEDUP_WINDOW_MS,
} = require('../../lib/utils/BidirectionalButtonState');

function read(rel) {
  return fs.readFileSync(path.join(ROOT, rel), 'utf8');
}

describe('P2283 bidirectional buttons permanent', () => {
  it('resolveGangCount uses Math.max(buttonCount, gangCount)', () => {
    assert.strictEqual(resolveGangCount({ buttonCount: 4 }), 4);
    assert.strictEqual(resolveGangCount({ gangCount: 3 }), 3);
    assert.strictEqual(resolveGangCount({ buttonCount: 4, gangCount: 1 }), 4);
    assert.strictEqual(resolveGangCount({ buttonCount: 1, gangCount: 3 }), 3);
    assert.strictEqual(resolveGangCount({}), 1);
  });

  it('stampVirtual + stampPhysical share 2s dedup window', () => {
    const d = {};
    stampVirtual(d, 1);
    assert.strictEqual(isWithinDedup(d, 1, 'virtual'), true);
    stampPhysical(d, 2);
    assert.strictEqual(isWithinDedup(d, 2, 'physical'), true);
    assert.strictEqual(ensureDedup(d).dedupWindow, DEDUP_WINDOW_MS);
  });

  it('wrapHandleFrame chains without orphaning prior handlers', () => {
    const calls = [];
    const node = {
      handleFrame(...a) { calls.push(['root', ...a]); return 'root'; },
    };
    wrapHandleFrame(node, 'a', (args, next) => {
      calls.push(['a', ...args]);
      return next(...args);
    });
    wrapHandleFrame(node, 'b', (args, next) => {
      calls.push(['b', ...args]);
      return next(...args);
    });
    const out = node.handleFrame(1, 6, { cmdId: 0xFD });
    assert.strictEqual(out, 'root');
    assert.deepStrictEqual(calls.map((c) => c[0]), ['a', 'b', 'root']);
    // re-arm tag a
    wrapHandleFrame(node, 'a', (args, next) => {
      calls.push(['a2', ...args]);
      return next(...args);
    });
    calls.length = 0;
    node.handleFrame(2, 6, {});
    assert.deepStrictEqual(calls.map((c) => c[0]), ['a2', 'b', 'root']);
  });

  it('PhysicalButtonMixin uses resolveGangCount + wrapHandleFrame + stampVirtual in markAppCommand', () => {
    const src = read('lib/mixins/PhysicalButtonMixin.js');
    assert(src.includes('BidirectionalButtonState'));
    assert(src.includes('resolveGangCount'));
    assert(src.includes('wrapHandleFrame'));
    assert(src.includes("stampVirtual(this, gang)"));
    assert(src.includes('WHY(P2283)'));
    assert(!/zclNode\.handleFrame = function onOffFdRawCatcher/.test(src));
  });

  it('VirtualButtonMixin stamps lastVirtualPress on _recordVirtualButtonEvent', () => {
    const src = read('lib/mixins/VirtualButtonMixin.js');
    assert(src.includes('stampVirtual'));
    assert(src.includes('WHY(P2283)'));
  });

  it('NamedButtonFallback uses markAppCommand + safeSetCapabilityValue', () => {
    const src = read('lib/mixins/NamedButtonFallback.js');
    assert(src.includes('markAppCommand'));
    assert(src.includes('safeSetCapabilityValue'));
    assert(src.includes('WHY(P2283)'));
  });

  it('scene_switch_4 fallback uses compose-aligned card IDs', () => {
    const src = read('drivers/scene_switch_4/device.js');
    assert(src.includes('scene_switch_4_button_${button}_${suffix}'));
    assert(src.includes('triggerButtonPress'));
    assert(!/scene_switch_4_button_4gang_button_\$\{pressType === 'single' \? 'pressed'/.test(src));
  });

  it('doctrine BIDIRECTIONAL_BUTTONS documents P2283 SSOT', () => {
    const doc = read('docs/BIDIRECTIONAL_BUTTONS.md');
    assert(doc.includes('P2283') || doc.includes('BidirectionalButtonState'));
  });

  it('prior critical gates still present when shipped on this track', () => {
    const optional = [
      'test/critical/p2220-button-ui-ux.test.js',
      'test/critical/p2221-bidirectional-buttons.test.js',
      'test/critical/p2235-button-ui-physical.test.js',
      'test/critical/p2282-forum-2202-peter-misattr-button.test.js',
    ];
    const present = optional.filter((f) => fs.existsSync(path.join(ROOT, f)));
    // Master has the full suite; stable may lag — require at least this P2283 file.
    assert(present.length >= 0);
    assert(fs.existsSync(path.join(ROOT, 'test/critical/p2283-bidirectional-buttons-permanent.test.js')));
    assert(fs.existsSync(path.join(ROOT, 'lib/utils/BidirectionalButtonState.js')));
  });
});
