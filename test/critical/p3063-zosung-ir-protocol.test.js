'use strict';

/**
 * P3063 — Zosung 0xED00 + Tuya Wi-Fi IR protocol locks.
 * Contre quoi:
 *  - Code03 sent [bytes+crc] as one octet string instead of msgpart(u8 len) + msgpartcrc (Z2M)
 *  - app-invented freq/count/BE "Zosung" code never played by firmware
 *  - learned chunks / Code05 (server→client) never dispatched (no on<Cmd> handlers)
 *  - unbounded learn buffer, Code04-before-start resolving a send too early
 *  - Wi-Fi blaster fed a bare code on DP201 instead of the send_ir JSON
 */

const { describe, it } = require('node:test');
const assert = require('node:assert/strict');
const Module = require('module');

const P = require('../../lib/ir/ZosungIRProtocol');
const C = require('../../lib/ir/IRFormatConverter');
const W = require('../../lib/ir/TuyaWifiIRProtocol');
const ZosungIRTransmitCluster = require('../../lib/clusters/ZosungIRTransmitCluster');

const NEC = C.necEncode(0x04, 0x08);

function loadDeviceClass(rel) {
  const orig = Module._load;
  class Base { }
  Module._load = function load(r, ...a) {
    if (r === 'homey') {return new Proxy({}, { get: (_t, k) => k === '__esModule' ? false : Base });}
    return orig.call(this, r, ...a);
  };
  try { return require(rel); } finally { Module._load = orig; }
}

function fakeHomey() {
  return {
    setTimeout: (fn, ms) => setTimeout(fn, ms),
    clearTimeout: (t) => clearTimeout(t),
    setInterval: (fn, ms) => setInterval(fn, ms),
    clearInterval: (t) => clearInterval(t),
  };
}

describe('P3063 Zosung IR protocol', () => {
  it('Code03 wire layout = zero u8, seq u16, position u32, msgpart u8-len, msgpartcrc u8', () => {
    const cmd = ZosungIRTransmitCluster.COMMANDS.codeDataResponse;
    const { ZCLDataTypes } = require('zigbee-clusters');
    assert.equal(cmd.args.msgpart, ZCLDataTypes.buffer8);
    assert.equal(cmd.args.msgpartcrc, ZCLDataTypes.uint8);
    const { msgpart, msgpartcrc } = P.txChunk('abc', 0, 0x38);
    assert.equal(msgpartcrc, (97 + 98 + 99) % 256);
    assert.deepEqual([...msgpart], [97, 98, 99]);
  });

  it('cluster dispatches inbound server→client commands as events', () => {
    const c = Object.create(ZosungIRTransmitCluster.prototype);
    require('events').EventEmitter.call(c);
    let got = null;
    c.on('codeDataResponse', (d) => { got = d; });
    c.onCodeDataResponse({ seq: 1, position: 0, msgpart: Buffer.from('x'), msgpartcrc: 120 });
    assert.equal(got.seq, 1);
    for (const n of ['onStartTransmit', 'onStartTransmitAck', 'onCodeDataRequest', 'onDoneSending', 'onDoneReceiving']) {
      assert.equal(typeof c[n], 'function', n);
    }
  });

  it('Tuya FastLZ codec round-trips (level 0 literals and level 1 matches)', () => {
    for (const level of [0, 1]) {
      const b64 = P.encodeTuyaTimings(NEC, { level });
      assert.deepEqual(P.decodeTuyaTimings(b64), NEC);
      assert.equal(P.isTuyaCompressedCode(b64), true);
    }
    assert.equal(P.isTuyaCompressedCode('aGVsbG8gd29ybGQ='), false);
    assert.throws(() => P.decompressTuyaBytes(Buffer.from([0xe0, 0x05])));
  });

  it('normalizeIrMsg wraps bare code / timings like Z2M and caps size', () => {
    const m = JSON.parse(P.normalizeIrMsg('ABCD'));
    assert.equal(m.key_num, 1);
    assert.equal(m.key1.key_code, 'ABCD');
    assert.equal(m.key1.freq, 38000);
    const t = JSON.parse(P.normalizeIrMsg({ timings: NEC, modulation: 36000 }));
    assert.equal(t.key1.freq, 36000);
    assert.deepEqual(P.decodeTuyaTimings(t.key1.key_code), NEC);
    assert.throws(() => P.normalizeIrMsg('A'.repeat(P.MAX_TX_MESSAGE + 1)));
  });

  it('parseRxChunk checks msgpartcrc and tolerates legacy [bytes][crc]', () => {
    const data = Buffer.from([1, 2, 3]);
    const ok = P.parseRxChunk({ msgpart: data, msgpartcrc: 6 });
    assert.deepEqual([...ok.chunk], [1, 2, 3]);
    assert.equal(ok.crc, 6);
    const legacy = P.parseRxChunk({ data: Buffer.from([1, 2, 3, 6]) });
    assert.deepEqual([...legacy.chunk], [1, 2, 3]);
  });

  it('ZG-IR01 uses seq 0, others increment and wrap', () => {
    assert.equal(P.nextSeq(5, 'ZG-IR01'), 0);
    assert.equal(P.nextSeq(5, 'TS1201'), 6);
    assert.equal(P.nextSeq(0xffff, 'TS1201'), 0);
  });

  it('runQueued serialises transfers', async () => {
    const order = [];
    const a = P.runQueued(async () => { await new Promise((r) => setTimeout(r, 20)); order.push('a'); });
    const b = P.runQueued(async () => { order.push('b'); });
    await Promise.all([a, b]);
    assert.deepEqual(order, ['a', 'b']);
  });

  it('converters emit real Tuya key_code and repair legacy app codes', () => {
    const z = C.rawToZosungBase64(NEC);
    assert.deepEqual(P.decodeTuyaTimings(z), NEC);
    const legacy = C.rawToLegacyZosungBase64([9000, 4500, 560, 560]);
    assert.equal(C.isLegacyZosungCode(legacy), true);
    assert.deepEqual(P.decodeTuyaTimings(C.repairLegacyZosungCode(legacy)), [9000, 4500, 560, 560]);
    assert.equal(C.repairLegacyZosungCode(z), z, 'real codes untouched');
    // Global Caché sendir values are carrier periods
    const gc = C.codeToTimings('sendir,1:1,1,38000,1,1,342,171,21,21', 'globalcache');
    assert.ok(Math.abs(gc.timings[0] - 9000) < 10);
    // Zigbee ↔ Wi-Fi pivot
    const wifi = C.zigbeeCodeToWifi(z);
    assert.equal(C.wifiCodeToZigbee(wifi), z);
    const pronto = C.timingsToPronto(NEC);
    const wt = P.wifiBase64ToTimings(C.normalizeCode(pronto, { target: 'wifi' }).wifiCode);
    assert.equal(wt.length, NEC.length + 1, 'Pronto pads odd count');
    assert.ok(wt.slice(0, NEC.length).every((v, i) => Math.abs(v - NEC[i]) <= 30), 'Pronto → Wi-Fi pulses');
  });

  it('device TX: full Code00→02→03→04→05 exchange, Code04 before start ignored', async () => {
    const IRBlaster = loadDeviceClass('../../drivers/ir_blaster/device.js');
    const dev = Object.create(IRBlaster.prototype);
    dev.homey = fakeHomey();
    dev.log = () => {};
    dev.error = () => {};
    dev._getDeviceIdentity = () => ({ manufacturerName: '_tz3290_x', modelId: 'TS1201' });
    const sent = [];
    let reassembled = '';
    const cluster = {
      startTransmit: async (a) => {
        sent.push(['00', a]);
        // stale Code04 before any Code02 must not resolve
        setImmediate(() => dev._handleTransmitComplete({ seq: a.seq }));
        setImmediate(() => dev._handleCodeDataRequest({ seq: a.seq, position: 0, maxlen: 0x38 }));
      },
      codeDataResponse: async (a) => {
        sent.push(['03', a]);
        assert.equal(P.calcArrayCrc(a.msgpart), a.msgpartcrc);
        reassembled += a.msgpart.toString('latin1');
        const next = a.position + a.msgpart.length;
        setImmediate(() => {
          if (next < dev._pendingIRMessage.length) {dev._handleCodeDataRequest({ seq: a.seq, position: next, maxlen: 0x38 });}
          else {dev._handleTransmitComplete({ seq: a.seq });}
        });
      },
      doneReceiving: async (a) => { sent.push(['05', a]); },
    };
    const msg = P.normalizeIrMsg(C.rawToZosungBase64(NEC));
    await dev._sendChunkedIRCode(msg, cluster);
    assert.equal(reassembled, msg);
    assert.equal(sent.filter((s) => s[0] === '05').length, 1);
    assert.ok(sent.filter((s) => s[0] === '03').every((s) => s[1].msgpart.length <= 0x32));
  });

  it('device RX: bounded buffer, position + CRC checked, Code02 at 0x38', async () => {
    const IRBlaster = loadDeviceClass('../../drivers/ir_blaster/device.js');
    const dev = Object.create(IRBlaster.prototype);
    dev.homey = fakeHomey();
    dev.log = () => {};
    dev.error = () => {};
    const reqs = [];
    dev._irTransmitCluster = {
      codeDataRequest: async (a) => { reqs.push(a); },
      doneSending: async () => {},
    };
    const learned = Buffer.from(C.rawToZosungBase64(NEC), 'base64');
    assert.ok(learned.length > 0x38, 'needs ≥ 2 chunks');
    dev._receiveBuffers = { 7: { totalLength: learned.length, receivedLength: 0, position: 0, buf: Buffer.alloc(learned.length), chunks: [], startTime: Date.now() } };
    const part = learned.subarray(0, 0x38);
    // bad CRC rejected
    await dev._handleReceivedCodeChunk({ seq: 7, position: 0, msgpart: part, msgpartcrc: (P.calcArrayCrc(part) + 1) % 256 });
    assert.equal(dev._receiveBuffers[7].receivedLength, 0);
    dev._irLastFrame = null;
    // wrong position rejected
    await dev._handleReceivedCodeChunk({ seq: 7, position: 10, msgpart: part, msgpartcrc: P.calcArrayCrc(part) });
    assert.equal(dev._receiveBuffers[7].receivedLength, 0);
    dev._irLastFrame = null;
    await dev._handleReceivedCodeChunk({ seq: 7, position: 0, msgpart: part, msgpartcrc: P.calcArrayCrc(part) });
    assert.equal(dev._receiveBuffers[7].receivedLength, 0x38);
    assert.deepEqual(reqs.at(-1), { seq: 7, position: 0x38, maxlen: 0x38 });
    assert.ok(P.MAX_LEARN_BYTES <= 8192);
  });
});

describe('P3063 Tuya Wi-Fi IR', () => {
  it('type 1: send_ir JSON on DP201 with "1" raw prefix; study/study_exit', () => {
    const d = W.buildSendDps('AAAABBBB');
    assert.deepEqual(JSON.parse(d['201']), { control: 'send_ir', head: '', key1: '1AAAABBBB', type: 0 });
    assert.deepEqual(JSON.parse(W.buildStudyDps(true)['201']), { control: 'study' });
    assert.deepEqual(JSON.parse(W.buildStudyDps(false)['201']), { control: 'study_exit' });
    const json = '{"control":"send_ir","head":"x","key1":"0y"}';
    assert.deepEqual(W.buildSendDps(json), { 201: json }, 'JSON pass-through');
  });

  it('type 2: DP1 study_key + DP7 code + DP13 0', () => {
    assert.deepEqual(W.buildSendDps('1AAAABBBB', { controlType: 2 }), { 1: 'study_key', 7: 'AAAABBBB', 13: 0 });
    assert.deepEqual(W.buildStudyDps(true, { controlType: 2 }), { 1: 'study' });
  });

  it('detects control type and ignores own JSON echo when learning', () => {
    assert.equal(W.detectControlType({ 201: '' }), 1);
    assert.equal(W.detectControlType({ 1: 'send_ir', 13: 0 }), 2);
    assert.equal(W.parseLearnedCode({ 201: '{"control":"study"}' }, { allowEcho: true }), null);
    assert.equal(W.parseLearnedCode({ 202: '1ABCDABCD' }), 'ABCDABCD');
    assert.equal(W.parseLearnedCode({ 2: 'ABCDABCD' }, { controlType: 2 }), 'ABCDABCD');
  });

  it('splits long gaps into separate sends', () => {
    const parts = W.splitTimingsForWifi([9000, 4500, 560, 60000, 9000, 2250, 560]);
    assert.equal(parts.length, 2);
    assert.deepEqual(P.wifiBase64ToTimings(parts[1]), [9000, 2250, 560, 5000]);
  });

  it('wifi_ir_remote device sends structured DPs and arms study', async () => {
    const WifiDev = loadDeviceClass('../../drivers/wifi_ir_remote/device.js');
    const dev = Object.create(WifiDev.prototype);
    const writes = [];
    dev.log = () => {};
    dev.error = () => {};
    dev.homey = fakeHomey();
    dev._irControlType = 1;
    dev._client = { connected: true, setDPs: async (o) => { writes.push(o); }, setDP: async (k, v) => { writes.push({ [k]: v }); } };
    await dev.sendIRCode('AAAABBBB', { skipFloodGuard: true });
    assert.equal(JSON.parse(writes[0]['201']).control, 'send_ir');
    writes.length = 0;
    dev.homey.flow = { getDeviceTriggerCard: () => null };
    await dev.startLearning('Power', 5);
    clearTimeout(dev._learnTimeout);
    const ctrls = writes.filter((w) => w['201']).map((w) => JSON.parse(w['201']).control);
    assert.deepEqual(ctrls, ['study_exit', 'study']);
  });
});
