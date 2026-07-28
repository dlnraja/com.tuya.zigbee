'use strict';

/**
 * Tests for the local-first WiFi transport resolver and bridge.
 * No network: TuyaLocalClient is mocked, TuyaUDPDiscovery is never started.
 */
const assert = require('assert');

const {
  TRANSPORT_LAN,
  TRANSPORT_CLOUD,
  TRANSPORT_NONE,
  resolveWiFiTransport,
  resolveLanFailureAction,
} = require('../../lib/wifi/LocalFirstResolver');

const Module = require('module');
const originalLoad = Module._load;
Module._load = function patchedLoad(request, parent, isMain) {
  if (request === '../tuya-local/TuyaLocalClient') {
    return class TuyaLocalClientMock {
      constructor(opts) { this.opts = opts; this.handlers = {}; }
      on(evt, fn) { this.handlers[evt] = fn; }
      async setDPs(dps) { this.lastDps = dps; }
      async connect() { this.connected = true; }
      async destroy() { this.destroyed = true; }
    };
  }
  if (request === '../tuya-local/TuyaUDPDiscovery') {
    return class TuyaUDPDiscoveryMock {
      constructor() { this.handlers = {}; }
      on() {}
      getDevice() { return null; }
      async start() { this.started = true; }
      async stop() { this.stopped = true; }
    };
  }
  return originalLoad.call(this, request, parent, isMain);
};
const LocalWiFiTuyaBridge = require('../../lib/tuya/LocalWiFiTuyaBridge');
Module._load = originalLoad;

function mockHomey() {
  const logs = [];
  return { logs, log: (...args) => logs.push(args.join(' ')) };
}

describe('LocalFirstResolver - resolveWiFiTransport', () => {
  it('prefers LAN with settings IP when local credentials are present', () => {
    const d = resolveWiFiTransport({ deviceId: 'abc', localKey: 'k', ip: '192.168.1.10' });
    assert.strictEqual(d.transport, TRANSPORT_LAN);
    assert.strictEqual(d.ip, '192.168.1.10');
    assert.strictEqual(d.ipSource, 'settings');
    assert.ok(d.reason.includes('local_first'));
  });

  it('prefers LAN with udp-discovery IP when settings IP is missing', () => {
    const d = resolveWiFiTransport({ deviceId: 'abc', localKey: 'k', discoveredIp: '192.168.1.20' });
    assert.strictEqual(d.transport, TRANSPORT_LAN);
    assert.strictEqual(d.ip, '192.168.1.20');
    assert.strictEqual(d.ipSource, 'udp-discovery');
  });

  it('still chooses LAN without any IP (find() scan on connect)', () => {
    const d = resolveWiFiTransport({ deviceId: 'abc', localKey: 'k' });
    assert.strictEqual(d.transport, TRANSPORT_LAN);
    assert.strictEqual(d.ip, null);
    assert.ok(d.reason.includes('find()'));
  });

  it('returns NONE without local_key when cloud fallback is disabled (default)', () => {
    const d = resolveWiFiTransport({ deviceId: 'abc', localKey: null, hasCloudCredentials: true });
    assert.strictEqual(d.transport, TRANSPORT_NONE);
    assert.ok(d.reason.includes('cloudFallback=false'));
  });

  it('returns NONE without local_key when cloud fallback opted in but credentials missing', () => {
    const d = resolveWiFiTransport({
      deviceId: 'abc', localKey: null,
      policy: { cloudFallback: true }, hasCloudCredentials: false,
    });
    assert.strictEqual(d.transport, TRANSPORT_NONE);
    assert.ok(d.reason.includes('credentials missing'));
  });

  it('returns CLOUD only when LAN impossible AND fallback opted in AND credentials present', () => {
    const d = resolveWiFiTransport({
      deviceId: 'abc', localKey: null,
      policy: { cloudFallback: true }, hasCloudCredentials: true,
    });
    assert.strictEqual(d.transport, TRANSPORT_CLOUD);
  });
});

describe('LocalFirstResolver - resolveLanFailureAction', () => {
  it('stays local by default (local-first policy)', () => {
    const a = resolveLanFailureAction({ hasCloudCredentials: true });
    assert.strictEqual(a.action, 'stay_local');
    assert.ok(a.reason.includes('cloudFallback=false'));
  });

  it('stays local when fallback opted in but cloud credentials are missing', () => {
    const a = resolveLanFailureAction({ policy: { cloudFallback: true }, hasCloudCredentials: false });
    assert.strictEqual(a.action, 'stay_local');
  });

  it('takes a cloud status snapshot when fallback opted in and credentials present', () => {
    const a = resolveLanFailureAction({ policy: { cloudFallback: true }, hasCloudCredentials: true });
    assert.strictEqual(a.action, 'cloud_status');
    assert.ok(a.reason.includes('control stays local'));
  });
});

describe('LocalWiFiTuyaBridge - local-first sessions', () => {
  it('registers a LAN session when local credentials are present and logs the decision', async () => {
    const homey = mockHomey();
    const bridge = new LocalWiFiTuyaBridge(homey);
    const transport = await bridge.registerDevice('dev1', 'key123', '192.168.1.5');
    assert.strictEqual(transport, TRANSPORT_LAN);
    assert.ok(bridge.sessions.has('dev1'));
    assert.ok(homey.logs.some((l) => l.includes('[LOCAL-FIRST] Transport decision') && l.includes('LAN')));
  });

  it('registers NO session without local_key and explains why', async () => {
    const homey = mockHomey();
    const bridge = new LocalWiFiTuyaBridge(homey);
    const transport = await bridge.registerDevice('dev2', null, '192.168.1.6');
    assert.strictEqual(transport, TRANSPORT_NONE);
    assert.ok(!bridge.sessions.has('dev2'));
    assert.ok(homey.logs.some((l) => l.includes('missing local_key')));
  });

  it('rejects commands for devices without a local session', async () => {
    const homey = mockHomey();
    const bridge = new LocalWiFiTuyaBridge(homey);
    await assert.rejects(() => bridge.sendCommand('unknown', { 1: true }), /No local session/);
  });

  it('forwards dp-update events as data events (unless destroyed)', async () => {
    const homey = mockHomey();
    const bridge = new LocalWiFiTuyaBridge(homey);
    await bridge.registerDevice('dev3', 'key123', '192.168.1.7');
    const received = [];
    bridge.on('data', (d) => received.push(d));
    bridge.sessions.get('dev3').handlers['dp-update']({ 1: true });
    assert.deepStrictEqual(received, [{ id: 'dev3', data: { 1: true } }]);
    await bridge.destroy();
    bridge.sessions.set('dev3', { handlers: {} });
    bridge._onData('dev3', { 1: false });
    assert.strictEqual(received.length, 1); // no event after destroy
  });
});
