'use strict';

/**
 * P2380 — Cover TX false-success + ZCL fallback
 * Gmail/portal diag ab5aaf04 @ 9.0.775: "Cover stop working"
 * stderr: Failed to send DP*: Tuya cluster not available
 * stdout: [DP-TX] ✅DP* mgr (lie — sendDP returned false)
 */
const { describe, it } = require('node:test');
const assert = require('node:assert/strict');
const path = require('path');

const ROOT = path.join(__dirname, '../..');
const { UniversalDPSender } = require(path.join(ROOT, 'lib/tuya/UniversalDPSender.js'));

describe('P2380 UniversalDPSender honors false from sendDP', () => {
  it('_try returns false when async fn resolves false', async () => {
    const sender = new UniversalDPSender({ log() {} });
    assert.equal(await sender._try(async () => false), false);
    assert.equal(await sender._try(async () => true), true);
    assert.equal(await sender._try(async () => undefined), true);
    assert.equal(await sender._try(async () => { throw new Error('x'); }), false);
  });

  it('does not claim mgr success when manager.sendDP returns false', async () => {
    const logs = [];
    const device = {
      log(m) { logs.push(String(m)); },
      zclNode: { endpoints: { 1: { clusters: {} } } },
      tuyaEF00Manager: {
        async sendDP() { return false; },
        async writeDP() { return false; },
        async setDatapoint() { return false; },
      },
    };
    const sender = new UniversalDPSender(device);
    const ok = await sender.sendTuyaDP(2, 100, 'value');
    assert.equal(ok, false);
    assert.ok(!logs.some((l) => /✅DP2 mgr/.test(l)), `unexpected success logs: ${logs.join('|')}`);
    assert.ok(logs.some((l) => /❌DP2 all failed/.test(l)), `expected all-failed log, got: ${logs.join('|')}`);
  });
});

describe('P2380 UnifiedCoverBase ZCL fallback helper', () => {
  it('exports _sendCoverViaZclFallback on prototype via source', () => {
    const fs = require('fs');
    const src = fs.readFileSync(path.join(ROOT, 'lib/devices/UnifiedCoverBase.js'), 'utf8');
    assert.match(src, /_sendCoverViaZclFallback/);
    assert.match(src, /P2380/);
    assert.match(src, /sendDP returns false on soft-fail/);
  });
});
