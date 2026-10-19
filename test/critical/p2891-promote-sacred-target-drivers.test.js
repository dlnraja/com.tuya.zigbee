'use strict';

/**
 * P2891 — Bastien BOTH -> stable promote must not add sacred-keep couples whose
 * driver the target does not publish (stable-v5 ships a driver subset). On
 * 19/10/2026 such entries made P2288 fail "driver missing in publish".
 */

const assert = require('assert');
const fs = require('fs');
const os = require('os');
const path = require('path');
const { describe, it } = require('node:test');
const { mergeSacredKeep, targetDriverIds } = require('../../tools/ci/bastien-promote-upstream.js');

describe('P2891 promote sacred-keep respects target drivers', () => {
  it('drops couples for drivers the target does not publish', () => {
    const target = { couples: [{ mfr: '_TZ3000_a', pid: 'TS0041', driverId: 'button_wireless_1' }] };
    const bastien = {
      couples: [
        { mfr: '_TZ3000_b', pid: 'TS0042', driverId: 'button_wireless_2' },
        { mfr: '_TZE200_x', pid: 'TS0601', driverId: 'not_on_target' },
      ],
    };
    const out = mergeSacredKeep(target, bastien, new Set(['button_wireless_1', 'button_wireless_2']));
    assert.deepStrictEqual(out.couples.map((c) => c.driverId), ['button_wireless_1', 'button_wireless_2']);
  });

  it('keeps old behaviour without a driver set', () => {
    const out = mergeSacredKeep({ couples: [] }, { couples: [{ mfr: 'm', pid: 'p', driverId: 'd' }] });
    assert.strictEqual(out.couples.length, 1);
  });

  it('reads the published set from app.json, falls back to drivers/', () => {
    const dir = fs.mkdtempSync(path.join(os.tmpdir(), 'p2891-'));
    fs.mkdirSync(path.join(dir, 'drivers', 'only_compose'), { recursive: true });
    fs.writeFileSync(path.join(dir, 'drivers', 'only_compose', 'driver.compose.json'), '{}');
    assert.ok(targetDriverIds(dir).has('only_compose'));
    fs.writeFileSync(path.join(dir, 'app.json'), JSON.stringify({ drivers: [{ id: 'published' }] }));
    const ids = targetDriverIds(dir);
    assert.ok(ids.has('published'));
    assert.ok(!ids.has('only_compose'));
  });

  it('every sacred-keep couple of this tree points at a published driver', () => {
    const root = path.join(__dirname, '..', '..');
    const ids = targetDriverIds(root);
    const sacred = JSON.parse(fs.readFileSync(path.join(root, 'config/architecture/publish-sacred-keep-couples.json'), 'utf8'));
    const bad = (sacred.couples || []).filter((c) => !ids.has(c.driverId)).map((c) => `${c.mfr}+${c.pid}->${c.driverId}`);
    assert.deepStrictEqual(bad, []);
  });
});
