'use strict';

/**
 * P2703 — Bastien L99 timeline + live mesh Contre quoi
 *
 * Contre quoi:
 * - axpdxqgu / vsxvaj9i / dzwgk7e2 not front-pinned → Athom pairs as Homey « Appareil Zigbee »
 * - button_wireless_3 productId TS0601 bleed
 * - IEEE map missing live vsxvaj9i Node 7 (5b:91:98…)
 * Dual-app: Bastien tip + BOTH IEEE/compose front-pin reliability
 */

const { describe, it } = require('node:test');
const assert = require('node:assert/strict');
const fs = require('fs');
const path = require('path');

const ROOT = path.join(__dirname, '..', '..');
const {
  lookupBastienIeee,
  listUnknownNodeActions,
  isNeedInterviewIeee,
} = require('../../lib/zigbee/BastienIeeeIdentity');

function compose(id) {
  return JSON.parse(fs.readFileSync(path.join(ROOT, 'drivers', id, 'driver.compose.json'), 'utf8'));
}

describe('P2703 Bastien L99 mesh + front-pin sacred couples', () => {
  it('button drivers front-pin house couples + TS004x first', () => {
    const b1 = compose('button_wireless_1');
    const b2 = compose('button_wireless_2');
    const b3 = compose('button_wireless_3');
    assert.match(String(b1.zigbee.manufacturerName[0]), /axpdxqgu/i);
    assert.equal(b1.zigbee.productId[0], 'TS0041');
    assert.match(String(b2.zigbee.manufacturerName[0]), /dzwgk7e2/i);
    assert.equal(b2.zigbee.productId[0], 'TS0042');
    assert.match(String(b3.zigbee.manufacturerName[0]), /vsxvaj9i/i);
    assert.equal(b3.zigbee.productId[0], 'TS0043');
    assert.ok(!(b3.zigbee.productId || []).includes('TS0601'), 'no TS0601 bleed on bw3');
    assert.ok(!(b2.zigbee.productId || []).includes('TS0041'), 'no TS0041 bleed on bw2');
  });

  it('learnmode warns against Homey « Appareil Zigbee »', () => {
    for (const id of ['button_wireless_1', 'button_wireless_2', 'button_wireless_3']) {
      const fr = compose(id).zigbee.learnmode?.instruction?.fr || '';
      assert.match(fr, /Appareil Zigbee|PAS Homey Zigbee/i);
    }
  });

  it('live mesh IEEE: Node3 WRONG_APP axpdxqgu + Node7 WRONG_APP vsxvaj9i + Node18 OK', () => {
    const n3 = lookupBastienIeee('7c:c6:b6:ff:fe:a3:e1:58');
    assert.equal(n3.driver, 'button_wireless_1');
    assert.equal(n3.status, 'WRONG_APP_HOMEY');
    const n7 = lookupBastienIeee('a4:c1:38:5b:91:98:dd:55');
    assert.equal(n7.mfr, '_TZ3000_vsxvaj9i');
    assert.equal(n7.pid, 'TS0043');
    assert.equal(n7.status, 'WRONG_APP_HOMEY');
    const n18 = lookupBastienIeee('a4:c1:38:e6:69:60:4a:6f');
    assert.equal(n18.status, 'OK_LIVE');
    assert.equal(isNeedInterviewIeee('a4:c1:38:e6:74:3a:00:da'), true);
    assert.ok(listUnknownNodeActions().some((a) => a.status === 'WRONG_APP_HOMEY'));
  });

  it('investigation report ships timeline + best tips', () => {
    const p = path.join(ROOT, 'reports/p2703-bastien-l99-timeline-2026-09-23/INVESTIGATION.md');
    assert.ok(fs.existsSync(p));
    const body = fs.readFileSync(p, 'utf8');
    assert.match(body, /1\.0\.64|P2686/);
    assert.match(body, /1f4dcf2e|WRONG_APP|Appareil Zigbee/);
    assert.match(body, /axpdxqgu|vsxvaj9i|dzwgk7e2/);
  });
});
