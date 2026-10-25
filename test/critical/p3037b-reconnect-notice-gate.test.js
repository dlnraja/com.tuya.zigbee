'use strict';

/**
 * P3037b — idea from forum 157537 (Device Watchdog by Rick_D, v1.9.49-v1.9.51, rewritten in our words):
 * no "device lost" timeline alert during the start-up grace, and no repeat for the same device within 24 h.
 */
const { describe, it } = require('node:test');
const assert = require('node:assert/strict');
const fs = require('fs');
const path = require('path');
const { shouldSendReconnectNotice, STARTUP_GRACE_MS, REPEAT_WINDOW_MS } = require('../../lib/utils/ReconnectNoticeGate');

describe('P3037b reconnect-failure notice gate', () => {
  const t0 = 1_000_000_000_000;
  it('silent during start-up grace', () => {
    assert.deepEqual(shouldSendReconnectNotice({ now: t0 + 60_000, startedAt: t0 }), { send: false, reason: 'startup-grace' });
  });
  it('sends after grace when never notified', () => {
    assert.equal(shouldSendReconnectNotice({ now: t0 + STARTUP_GRACE_MS + 1, startedAt: t0 }).send, true);
  });
  it('one notice per device per 24 h', () => {
    const now = t0 + STARTUP_GRACE_MS + REPEAT_WINDOW_MS;
    assert.equal(shouldSendReconnectNotice({ now, startedAt: t0, lastNoticeAt: now - 3600_000 }).reason, 'already-notified');
    assert.equal(shouldSendReconnectNotice({ now, startedAt: t0, lastNoticeAt: now - REPEAT_WINDOW_MS - 1 }).send, true);
  });
  it('TuyaZigbeeDevice loads the gate at module load (grace origin = app start) and uses it', () => {
    const src = fs.readFileSync(path.join(__dirname, '..', '..', 'lib/tuya/TuyaZigbeeDevice.js'), 'utf8');
    const top = src.slice(0, src.indexOf('class '));
    assert.match(top, /require\('\.\.\/utils\/ReconnectNoticeGate'\)/);
    const body = src.slice(src.indexOf('async _notifyPairingFailure()'));
    assert.match(body.slice(0, 900), /shouldSendReconnectNotice\(/);
    assert.match(body.slice(0, 900), /last_reconnect_fail_notice_at/);
  });
});
