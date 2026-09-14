'use strict';

/**
 * P2501 — IR flood / spam Contre quoi
 * Identical code spam, sender throttle, repetitions cap, global flood hard-stop
 */

const { describe, it } = require('node:test');
const assert = require('node:assert/strict');
const fs = require('fs');
const path = require('path');

const ROOT = path.join(__dirname, '..', '..');
const {
  IRFloodGuard,
  getGuard,
  DEFAULTS,
  hashPayload,
} = require('../../lib/ir/IRFloodGuard');
const { IntelligentIRRouter } = require('../../lib/ir/IntelligentIRRouter');
const HomeyInfraredTx = require('../../lib/ir/HomeyInfraredTx');

describe('P2501 IRFloodGuard intelligent anti-spam', () => {
  it('SSOT documents floodGuard + runtime file exists', () => {
    const ssot = JSON.parse(fs.readFileSync(
      path.join(ROOT, 'config/architecture/intelligent-ir-ssot.json'),
      'utf8',
    ));
    assert.equal(ssot.floodGuard.patch, 'P2501');
    assert.ok(ssot.floodGuard.runtime.includes('IRFloodGuard'));
    assert.ok(ssot.features.includes('p2501_ir_flood_guard'));
    assert.ok(fs.existsSync(path.join(ROOT, 'lib/ir/IRFloodGuard.js')));
  });

  it('dedups identical payload within window', () => {
    const g = new IRFloodGuard({ identicalDedupMs: 900, minIntervalMs: { default: 1, zigbee: 1, wifi: 1, homey: 1 } });
    const a = g.checkSend({ senderKey: 's1', transport: 'homey', payload: '0000 AA', now: 1000 });
    assert.equal(a.allow, true);
    const b = g.checkSend({ senderKey: 's1', transport: 'homey', payload: '0000 AA', now: 1100 });
    assert.equal(b.allow, false);
    assert.equal(b.reason, 'identical_dedup');
    assert.equal(b.skipped, true);
  });

  it('throttles same sender on minInterval', () => {
    const g = new IRFloodGuard({
      identicalDedupMs: 1,
      minIntervalMs: { default: 350, zigbee: 350, wifi: 350, homey: 350 },
    });
    assert.equal(g.checkSend({ senderKey: 's1', payload: 'A', now: 1000 }).allow, true);
    const b = g.checkSend({ senderKey: 's1', payload: 'B', now: 1100 });
    assert.equal(b.allow, false);
    assert.equal(b.reason, 'sender_throttle');
  });

  it('caps repetitions at 3', () => {
    const g = new IRFloodGuard();
    assert.equal(g.clampRepetitions(99), 3);
    assert.equal(g.clampRepetitions(0), 1);
    const r = g.checkSend({ senderKey: 's2', payload: 'X', repetitions: 50, now: 1 });
    assert.equal(r.allow, true);
    assert.equal(r.repetitions, 3);
  });

  it('hard-stops global flood', () => {
    const g = new IRFloodGuard({
      globalMaxPerWindow: 3,
      globalWindowMs: 1000,
      identicalDedupMs: 1,
      minIntervalMs: { default: 1, zigbee: 1, wifi: 1, homey: 1 },
    });
    assert.equal(g.checkSend({ senderKey: 'a', payload: '1', now: 1000 }).allow, true);
    assert.equal(g.checkSend({ senderKey: 'b', payload: '2', now: 1001 }).allow, true);
    assert.equal(g.checkSend({ senderKey: 'c', payload: '3', now: 1002 }).allow, true);
    const blocked = g.checkSend({ senderKey: 'd', payload: '4', now: 1003 });
    assert.equal(blocked.allow, false);
    assert.equal(blocked.reason, 'global_flood');
    assert.equal(blocked.hard, true);
  });

  it('learn cooldown blocks spam', () => {
    const g = new IRFloodGuard({ learnCooldownMs: 2500 });
    assert.equal(g.checkLearn({ senderKey: 'blaster', now: 1000 }).allow, true);
    const again = g.checkLearn({ senderKey: 'blaster', now: 1500 });
    assert.equal(again.allow, false);
    assert.equal(again.reason, 'learn_cooldown');
  });

  it('router send soft-skips identical Homey Pronto spam', async () => {
    const calls = [];
    const homey = {
      drivers: { getDriver() { throw new Error('no'); } },
      rf: {
        txInfraredProntohex(args) {
          calls.push(args);
          return Promise.resolve(true);
        },
      },
      __irFloodGuard: new IRFloodGuard({
        identicalDedupMs: 900,
        minIntervalMs: { default: 1, zigbee: 1, wifi: 1, homey: 1 },
      }),
    };
    const r = new IntelligentIRRouter(homey);
    const pronto = '0000 006C 0000 0001 0001 0001';
    const first = await r.send({ senderId: HomeyInfraredTx.SENDER_ID, code: pronto });
    assert.ok(!first || !first.skipped);
    assert.equal(calls.length, 1);
    const second = await r.send({ senderId: HomeyInfraredTx.SENDER_ID, code: pronto });
    assert.equal(second.skipped, true);
    assert.equal(second.reason, 'identical_dedup');
    assert.equal(calls.length, 1);
  });

  it('getGuard is Homey-scoped singleton', () => {
    const homey = {};
    assert.equal(getGuard(homey), getGuard(homey));
    assert.ok(hashPayload('abc').includes(':'));
    assert.equal(DEFAULTS.maxRepetitions, 3);
  });

  it('dual-app classifies P2501 as MASTER_ONLY', () => {
    const dual = JSON.parse(fs.readFileSync(
      path.join(ROOT, 'config/architecture/dual-app-tracks.json'),
      'utf8',
    ));
    assert.equal(dual.l99RecentClassification.p2501_ir_flood_guard.tag, 'MASTER_ONLY');
  });
});
