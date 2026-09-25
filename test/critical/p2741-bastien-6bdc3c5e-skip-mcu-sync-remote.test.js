'use strict';
/**
 * P2741 — Bastien live diag 6bdc3c5e @ 1.0.107
 *
 * Contre quoi: P2733 listen-only wake still followed by
 * `[P2475] MCU time re-sync on endDeviceAnnounce` on button_wireless_1
 * (HOBEIAN+TS0041 / skipBatteryReporting) — mute pile.
 *
 * Dual-app: BOTH (+ Bastien tip)
 */
const { describe, it } = require('node:test');
const assert = require('node:assert');
const fs = require('fs');
const path = require('path');

const ROOT = path.join(__dirname, '..', '..');
const SRC = fs.readFileSync(
  path.join(ROOT, 'lib', 'devices', 'BaseUnifiedDevice.js'),
  'utf8',
);

describe('P2741 Bastien skip MCU sync on snappy remotes', () => {
  it('endDeviceAnnounce MCU sync gates on skipBatteryReporting / snappy', () => {
    assert.ok(SRC.includes('P2741'), 'must document P2741');
    assert.ok(
      SRC.includes('skip MCU time re-sync on announce'),
      'must log skip path',
    );
    const idx = SRC.indexOf('P2741');
    assert.ok(idx > 0, 'P2741 block missing');
    const block = SRC.slice(idx, idx + 900);
    assert.ok(/skipBatteryReporting/.test(block), 'gate skipBatteryReporting');
    assert.ok(/snappyRelayFlow/.test(block), 'gate snappyRelayFlow');
    assert.ok(/noEf00Tx/.test(block), 'gate noEf00Tx');
    assert.ok(
      /skipMcuSync/.test(block) && /sendTimeSync/.test(block),
      'skip before sendTimeSync',
    );
  });

  it('P2475 sendTimeSync remains for non-snappy MCU devices', () => {
    assert.ok(SRC.includes('[P2475] MCU time re-sync on endDeviceAnnounce'));
    assert.ok(SRC.includes('_p2475LastMcuSyncMs'));
  });
});
