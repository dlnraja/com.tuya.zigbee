'use strict';
// P3080 (task:next-08): _TZE200/_TZE284_locansqn (SZ-T04 / TH01Z LCD clock) answer time requests with
// [UTC][Local] seconds since 1970. Sources: Z2M nous.ts tuyaBase timeStart "1970" and Johan
// lcdtemphumidsensor_3 syncTuyaTime (UTC first, Date.now()/1000). Other LCD sensors keep epoch 2000.
const assert = require('assert');
const F = require('../lib/tuya/TuyaTimeSyncFormats');
const DB = require('../lib/tuya/MCUFormatDatabase');

describe('P3080 locansqn time epoch 1970', () => {
  for (const mfr of ['_TZE200_locansqn', '_TZE284_locansqn']) {
    it(`${mfr} guesses and maps to Z2M dual 1970`, () => {
      const g = F.guessFormat({ manufacturerName: mfr, productId: 'TS0601' });
      assert.strictEqual(g.primary, 'z2m_dual_1970');
      assert.strictEqual(F.MANUFACTURER_FORMAT_MAP[mfr], 'z2m_dual_1970');
      assert.strictEqual(DB.MANUFACTURER_FORMAT_DB[mfr].format, 'z2m_dual_1970');
    });
  }
  it('locansqn is no longer in any EPOCH_2000_MFRS list', () => {
    for (const p of ['../lib/clusters/TuyaSpecificCluster', '../lib/TuyaSpecificCluster', '../lib/tuya/TuyaSpecificCluster']) {
      let C; try { C = require(p); } catch (_e) { continue; }
      C = C.TuyaSpecificCluster || C;
      if (Array.isArray(C.EPOCH_2000_MFRS)) {assert.ok(!C.EPOCH_2000_MFRS.some((m) => /locansqn/i.test(m)), p);}
    }
  });
  it('other LCD sensors keep dual 2000', () => {
    assert.strictEqual(F.guessFormat({ manufacturerName: '_TZE200_vvmbj46n', productId: 'TS0601' }).primary, 'tuya_dual_2000');
    assert.strictEqual(F.guessFormat({ manufacturerName: '_TZE200_znbl8dj5', productId: 'TS0601' }).primary, 'tuya_dual_2000');
  });
  it('1970 payload carries UTC first, then local', () => {
    const buf = F.buildPayload('z2m_dual_1970', { timezone: 'auto' });
    const now = Math.floor(Date.now() / 1000);
    assert.ok(Buffer.isBuffer(buf) && buf.length >= 8);
    assert.ok(Math.abs(buf.readUInt32BE(0) - now) < 5);
  });
});
