'use strict';
/* eslint-env mocha */
const assert = require('assert');
const L = require('../lib/tuya-local/WifiLanLessons');

describe('P2953 Wi-Fi LAN lessons (forum 154077)', () => {
  it('#171 refresh delay only when mode dp changed', () => {
    assert.strictEqual(L.refreshDelayAfterChange({ 4: 'heat' }), 1500);
    assert.strictEqual(L.refreshDelayAfterChange({ 2: 210 }), null);
    assert.strictEqual(L.refreshDelayAfterChange(null), null);
  });
  it('#483 diagnoses ignored commands', () => {
    assert.strictEqual(L.diagnoseIgnoredCommands({ sent: 2 }), null);
    assert.strictEqual(L.diagnoseIgnoredCommands({ sent: 5, acknowledged: 1 }), null);
    assert.deepStrictEqual(L.diagnoseIgnoredCommands({ sent: 4, cid: 'a1' }).reasons, ['sub_device_needs_gateway_cid']);
    assert.ok(L.diagnoseIgnoredCommands({ sent: 4, deviceId: 'x', virtualId: 'y' }).reasons.includes('device_id_differs_from_virtual_id'));
    assert.deepStrictEqual(L.diagnoseIgnoredCommands({ sent: 3 }).reasons, ['unknown_check_virtual_id_and_hub']);
  });
  it('#491 cover tokens from cloud enum range', () => {
    assert.deepStrictEqual(L.coverTokensFromRange(['open', 'stop', 'close', 'continue']), { tokens: { open: 'open', close: 'close', stop: 'stop' }, status: 'confirmed' });
    assert.strictEqual(L.coverTokensFromRange(['ZZ', 'FZ']).status, 'lead');
    assert.strictEqual(L.coverTokensFromRange(['a', 'b']).tokens, null);
    assert.strictEqual(L.coverTokensFromRange([]), null);
  });
  it('#520 recorder is bounded and drops secrets', () => {
    const r = new L.ConnectionStartRecorder(3);
    for (let i = 0; i < 5; i++) {r.record(`e${  i}`, { local_key: 'K', n: i }, 0);}
    const ev = r.toJSON();
    assert.strictEqual(ev.length, 3);
    assert.strictEqual(ev[0].event, 'e2');
    assert.ok(!JSON.stringify(ev).includes('"K"'));
  });
});
