'use strict';

/**
 * P2700 — Contre quoi (Homey forum 154077, Tuya Local by Andi, #296/#328/#337):
 * - a TCP accept on the wrong protocol reset the failure counter → never rotated
 * - version-resolved persisted a version that collapsed ms later
 * - 3.4/3.5 handshake with no answer hung forever
 */
const { describe, it } = require('node:test');
const assert = require('node:assert/strict');
const Module = require('module');
const { EventEmitter } = require('events');

const instances = [];
class FakeTuyAPI extends EventEmitter {
  constructor(cfg) { super(); this.cfg = cfg; this.device = { ip: cfg.ip }; instances.push(this); }
  connect() { return FakeTuyAPI.connectImpl(this); }
  disconnect() { return Promise.resolve(); }
  refresh() { return Promise.resolve(); }
  set() { return Promise.resolve(); }
}
FakeTuyAPI.connectImpl = (d) => { setImmediate(() => d.emit('connected')); return Promise.resolve(); };

const origLoad = Module._load;
Module._load = function (req, ...rest) { return req === 'tuyapi' ? FakeTuyAPI : origLoad.call(this, req, ...rest); };
const TuyaLocalClient = require('../../lib/tuya-local/TuyaLocalClient');
Module._load = origLoad;

const tick = () => new Promise((r) => setImmediate(r));

describe('P2700 protocol confirmation', () => {
  it('early drops without data rotate the protocol; data confirms and emits version-resolved', async () => {
    const c = new TuyaLocalClient({ id: 'x', key: '0123456789abcdef', ip: '10.0.0.2', version: 'auto', pollIntervalMs: 0 });
    const resolved = [];
    c.on('version-resolved', (v) => resolved.push(v));
    c.on('error', () => {});
    c._scheduleReconnect = () => {};
    const first = c.version;
    for (let i = 0; i < 2; i++) {
      await c.connect(); await tick();
      instances.at(-1).emit('disconnected');
    }
    assert.notEqual(c.version, first, 'two early drops must rotate');
    assert.deepEqual(resolved, [], 'no version-resolved without DPS');
    await c.connect(); await tick();
    instances.at(-1).emit('data', { dps: { 1: true } });
    assert.deepEqual(resolved, [c.version]);
    await c.destroy();
  });

  it('locked / manual protocol never rotates', async () => {
    const c = new TuyaLocalClient({ id: 'x', key: '0123456789abcdef', ip: '10.0.0.2', version: '3.3', autoDetectProtocol: false, pollIntervalMs: 0 });
    c.on('error', () => {}); c._scheduleReconnect = () => {};
    for (let i = 0; i < 3; i++) { await c.connect(); await tick(); instances.at(-1).emit('disconnected'); }
    assert.equal(c.version, '3.3');
    await c.destroy();
  });

  it('handshake that never answers times out instead of hanging', async () => {
    const prev = FakeTuyAPI.connectImpl;
    FakeTuyAPI.connectImpl = () => new Promise(() => {});
    const c = new TuyaLocalClient({ id: 'x', key: '0123456789abcdef', ip: '10.0.0.2', version: '3.4', pollIntervalMs: 0, connectionTimeout: 1 });
    c._withTimeout = (p, ms, m) => TuyaLocalClient.prototype._withTimeout.call(c, p, 20, m);
    let rescheduled = false; c._scheduleReconnect = () => { rescheduled = true; };
    await c.connect();
    assert.equal(rescheduled, true);
    assert.equal(c._connecting, false);
    FakeTuyAPI.connectImpl = prev;
    await c.destroy();
  });
});
