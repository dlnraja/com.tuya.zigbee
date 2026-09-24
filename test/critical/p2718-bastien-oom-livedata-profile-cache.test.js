'use strict';
/**
 * P2718 — Bastien diag 27b0bd04 @ 1.0.82: remotes RX OK then heap OOM → SIGABRT
 * → “Aucun des trois bouton ne fonctionne”.
 *
 * Contre quoi:
 *  1) LiveDataUpdater merges junk (no modelIds) to MAX then rejects (wasted heap)
 *  2) getDeviceProfile re-spreads + logs on every press (CPU/heap storm)
 *  3) Bastien house still starts OTA overlay (unnecessary for locked couples)
 *
 * Dual-app: BOTH (+ Bastien house).
 */
const { describe, it } = require('node:test');
const assert = require('node:assert');
const fs = require('fs');
const path = require('path');

const ROOT = path.join(__dirname, '..', '..');

describe('P2718 Bastien OOM — LIVE-DATA couple-only + profile cache', () => {
  it('LiveDataUpdater requires modelIds on segment merge + lower caps', () => {
    const src = fs.readFileSync(path.join(ROOT, 'lib', 'dynamic', 'LiveDataUpdater.js'), 'utf8');
    assert.ok(src.includes('P2718'), 'must document P2718');
    assert.ok(src.includes('modelIds'), 'segment merge must require modelIds');
    assert.ok(/MAX_ENTRIES\s*=\s*800/.test(src), 'MAX_ENTRIES must be ≤800');
    assert.ok(/MAX_SEGMENTS\s*=\s*6/.test(src), 'MAX_SEGMENTS must cap segment storm');
    assert.ok(/\.bastien\b/i.test(src) && src.includes('P2718 skip'), 'Bastien must skip OTA overlay');
  });

  it('PhysicalButtonMixin caches getDeviceProfile (no match-log spam)', () => {
    const src = fs.readFileSync(path.join(ROOT, 'lib', 'mixins', 'PhysicalButtonMixin.js'), 'utf8');
    assert.ok(src.includes('_deviceProfileCache'), 'profile cache required');
    assert.ok(src.includes('_profileMatchLogged'), 'match log once required');
    assert.ok(src.includes('P2718'), 'must document P2718');
    // Contre quoi: clearing cache on late identity
    assert.ok(
      /_deviceProfileCache\s*=\s*null/.test(src),
      'must invalidate cache on identity resolve'
    );
  });

  it('LiveDataUpdater validates couple-shaped entries before allocating overlay', () => {
    const LiveDataUpdater = require('../../lib/dynamic/LiveDataUpdater');
    const u = new LiveDataUpdater({ settings: { get() { return null; }, set() {}, unset() {} } }, () => {});
    assert.strictEqual(
      u._validatePayload({
        version: '1',
        devices: {
          _TZ3000_dzwgk7e2: { driverId: 'button_wireless_2' }, // missing modelIds
        },
      }),
      false,
      'must reject mfr without modelIds'
    );
    assert.strictEqual(
      u._validatePayload({
        version: '1',
        devices: {
          _TZ3000_dzwgk7e2: { driverId: 'button_wireless_2', modelIds: ['TS0042'] },
        },
      }),
      true,
      'must accept sacred couple shape'
    );
  });
});
