'use strict';

/**
 * P2284 — handleFrame chain integrity (never blind-overwrite / never orphan).
 * WHY: L0 dedup/shed + IO passive + sensor/switch P0 must not kill Physical 0xFD.
 */

const assert = require('assert');
const fs = require('fs');
const path = require('path');

const ROOT = path.join(__dirname, '..', '..');
const testApi = global.describe && global.it ? global : require('node:test');
const { describe, it } = testApi;

const { wrapHandleFrame } = require('../../lib/utils/BidirectionalButtonState');

function read(rel) {
  return fs.readFileSync(path.join(ROOT, rel), 'utf8');
}

/** Forbidden: assigning node.handleFrame outside BidirectionalButtonState */
const NODE_ASSIGN_RE = /(?:this\.)?node\.handleFrame\s*=/;

const MUST_WRAP = [
  'lib/tuya/TuyaZigbeeDevice.js',
  'lib/devices/UnifiedSwitchBase.js',
  'lib/devices/UnifiedSensorBase.js',
  'lib/devices/TuyaUnifiedDevice.js',
  'lib/io/DeviceIOFacade.js',
  'lib/mixins/PhysicalButtonMixin.js',
  'lib/UniversalZigbeeDevice.js',
];

describe('P2284 handleFrame chain integrity', () => {
  it('wrapHandleFrame always reaches root even when middle short-circuits work', () => {
    const calls = [];
    const node = {
      handleFrame(...a) {
        calls.push(['root', ...a]);
        return 'ok';
      },
    };
    wrapHandleFrame(node, 'l0', (args, next) => {
      calls.push(['l0-skip-work']);
      // Simulate dedup/shed: still forward
      return next(...args);
    });
    wrapHandleFrame(node, 'physical', (args, next) => {
      calls.push(['physical', args[1]]);
      return next(...args);
    });
    const out = node.handleFrame(1, 6, { cmdId: 0xFD });
    assert.strictEqual(out, 'ok');
    assert.deepStrictEqual(
      calls.map((c) => c[0]),
      ['l0-skip-work', 'physical', 'root'],
    );
  });

  it('no lib source assigns node.handleFrame except BidirectionalButtonState', () => {
    const offenders = [];
    for (const rel of MUST_WRAP) {
      const src = read(rel);
      if (NODE_ASSIGN_RE.test(src) && !rel.includes('BidirectionalButtonState')) {
        offenders.push(rel);
      }
    }
    // Also scan known historical hotspots
    const hotspots = [
      'lib/tuya/TuyaZigbeeDevice.js',
      'lib/devices/UnifiedSwitchBase.js',
      'lib/devices/UnifiedSensorBase.js',
      'lib/devices/TuyaUnifiedDevice.js',
      'lib/io/DeviceIOFacade.js',
      'lib/UniversalZigbeeDevice.js',
    ];
    for (const rel of hotspots) {
      const src = read(rel);
      const lines = src.split('\n');
      lines.forEach((line, i) => {
        if (NODE_ASSIGN_RE.test(line) && !line.includes('bidirectionalHandleFrameChain')) {
          offenders.push(`${rel}:${i + 1}:${line.trim().slice(0, 80)}`);
        }
      });
    }
    assert.deepStrictEqual(offenders, [], `blind node.handleFrame= found:\n${offenders.join('\n')}`);
  });

  it('TuyaZigbeeDevice L0 uses wrapHandleFrame + always next on dedup/shed', () => {
    const src = read('lib/tuya/TuyaZigbeeDevice.js');
    assert(src.includes("wrapHandleFrame(node, 'raw-l0-fallback'"));
    assert(src.includes('WHY(P2284)'));
    assert(src.includes('keepAlways'));
    assert(src.includes('never orphan Physical'));
    assert(src.includes('shed heavy L0 work only'));
    // Both suppress paths must forward the chain
    const dedupIdx = src.indexOf('duplicate.suppress');
    const shedIdx = src.indexOf('RX-SHED');
    assert(dedupIdx > 0 && shedIdx > dedupIdx);
    assert(src.slice(dedupIdx, dedupIdx + 900).includes('return next(...args)'));
    assert(src.slice(shedIdx, shedIdx + 900).includes('return next(...args)'));
  });

  it('UnifiedSwitchBase + UnifiedSensorBase delegate L0 to super', () => {
    assert(read('lib/devices/UnifiedSwitchBase.js').includes('return super._setupRawFrameFallback()'));
    assert(read('lib/devices/UnifiedSensorBase.js').includes('return super._setupRawFrameFallback()'));
  });

  it('IO / Physical / P0 EF00 use wrapHandleFrame tags', () => {
    assert(read('lib/io/DeviceIOFacade.js').includes("'io-passive-ef00'"));
    assert(read('lib/mixins/PhysicalButtonMixin.js').includes("'physical-onoff-fd'"));
    assert(read('lib/devices/TuyaUnifiedDevice.js').includes("'tuya-unified-p0-ef00'"));
    assert(read('lib/devices/UnifiedSensorBase.js').includes("'unified-sensor-p0-ef00'"));
    assert(read('lib/UniversalZigbeeDevice.js').includes("'universal-zigbee-l0'"));
  });

  it('HOBEIAN ZG-305Z registry is couple-scoped', () => {
    const reg = JSON.parse(read('data/user-misattribution-registry.json'));
    const hit = (reg.cases || reg.entries || []).find?.(
      (c) => c.id === 'p217-hobeian-zg305z-usb-2gang',
    ) || (Array.isArray(reg) ? reg.find((c) => c.id === 'p217-hobeian-zg305z-usb-2gang') : null);
    // Support both shapes: { cases: [] } or top-level array under known keys
    let entry = hit;
    if (!entry && reg.misattributions) {
      entry = reg.misattributions.find((c) => c.id === 'p217-hobeian-zg305z-usb-2gang');
    }
    if (!entry) {
      const raw = read('data/user-misattribution-registry.json');
      assert(raw.includes('"id": "p217-hobeian-zg305z-usb-2gang"'));
      assert(raw.includes('"forbidMode": "couple"'));
      return;
    }
    assert.strictEqual(entry.forbidMode, 'couple');
    assert.strictEqual(entry.canonicalDriver, 'switch_2gang');
  });
});
