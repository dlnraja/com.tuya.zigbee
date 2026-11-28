'use strict';

const test = require('node:test');
const assert = require('node:assert/strict');
const path = require('node:path');

const ROOT = path.resolve(__dirname, '../..');
const IRFormat = require(path.join(ROOT, 'lib/ir/IRFormatConverter'));
const ZosungProto = require(path.join(ROOT, 'lib/ir/ZosungIRProtocol'));
const { IntelligentIRRouter } = require(path.join(ROOT, 'lib/ir/IntelligentIRRouter'));

test('P3410: IRFormatConverter expands condensed 900A NEC Pronto Hex to raw 0000 Pronto, Zigbee Zosung & Wi-Fi', () => {
  const lgPower900a = '900A 006D 0000 0001 04FB 08F7';
  assert.equal(IRFormat.detectFormat(lgPower900a), 'pronto');

  const rawPronto = IRFormat.toProntoForHomey(lgPower900a);
  assert.ok(rawPronto && rawPronto.startsWith('0000 '), 'Expected expanded 0000 Pronto Hex');

  const zb = IRFormat.normalizeCode(lgPower900a, { target: 'zigbee' });
  assert.equal(zb.ok, true);
  assert.ok(ZosungProto.isTuyaCompressedCode(zb.zigbeeCode));

  const wf = IRFormat.normalizeCode(lgPower900a, { target: 'wifi' });
  assert.equal(wf.ok, true);
  const timings = ZosungProto.wifiBase64ToTimings(wf.wifiCode);
  assert.equal(timings[0], 9000);
  assert.equal(timings[1], 4500);
});

test('P3410: IntelligentIRRouter sendSequence executes multi-step IR macros with pauses', async () => {
  const sent = [];
  const fakeHomey = { setTimeout: (fn) => fn() };
  const router = new IntelligentIRRouter(fakeHomey);
  router.send = async (payload) => {
    sent.push(payload.learnedName || payload.code);
    return { ok: true };
  };

  const res = await router.sendSequence({
    steps: ['tv_power', { delayMs: 1200 }, 'tv_hdmi_2', { code: '900A 006D 0000 0001 04FB 08F7' }],
    defaultDelayMs: 150,
  });

  assert.equal(res.ok, true);
  assert.equal(res.sent, 3);
  assert.deepEqual(sent, ['tv_power', 'tv_hdmi_2', '900A 006D 0000 0001 04FB 08F7']);
});

test('P3410: IntelligentIRRouter exports learned Zigbee & Wi-Fi IR codes as raw 0000 Pronto Hex', async () => {
  const router = new IntelligentIRRouter({});
  const zbCode = ZosungProto.encodeTuyaTimings([9000, 4500, 560, 560, 560, 1690]);
  const wfCode = ZosungProto.timingsToWifiBase64([9000, 4500, 560, 560, 560, 1690]);

  const fakeDevice = {
    getStoreValue: () => ({
      tv_power: { name: 'tv_power', code: zbCode, format: 'zosung' },
      ac_on: { name: 'ac_on', code: wfCode, format: 'tuya_opaque' },
    }),
  };

  const exported = await router.exportAllLearnedAsPronto(fakeDevice);
  assert.ok(exported.tv_power && exported.tv_power.startsWith('0000 '));
  assert.ok(exported.ac_on && exported.ac_on.startsWith('0000 '));
});
