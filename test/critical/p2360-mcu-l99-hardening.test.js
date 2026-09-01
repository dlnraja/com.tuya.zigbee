'use strict';

const { describe, it } = require('node:test');
const assert = require('node:assert/strict');
const fs = require('fs');
const path = require('path');

const ROOT = path.join(__dirname, '..', '..');
const {
  shouldSkipMcuVersionRequest,
  configureMcuVersionRequest,
} = require('../../lib/tuya/MCUVersionHelper');
const TuyaTimeSyncFormats = require('../../lib/tuya/TuyaTimeSyncFormats');
const { TIME_FORMAT } = require('../../lib/tuya/TuyaTimeSyncFormats');
const { toTuyaBrightness } = require('../../lib/tuya/TuyaBrightnessScale');
const MCUFormatDatabase = require('../../lib/tuya/MCUFormatDatabase');

function stubDevice(mfr) {
  return {
    getSetting: (k) => (k === 'zb_manufacturer_name' ? mfr : null),
    getData: () => ({ manufacturerName: mfr, productId: 'TS0601' }),
    log() {},
  };
}

describe('P2360 MCU L99 hardening', () => {
  it('skips mcuVersionRequest for battery covers (P2296 lock)', () => {
    assert.equal(shouldSkipMcuVersionRequest(stubDevice('_TZE200_68nvbio9')), true);
    assert.equal(shouldSkipMcuVersionRequest(stubDevice('_TZE200_cf1sl3tj')), true);
  });

  it('skips mcuVersionRequest for DISABLE_MCU_VERSION_RESPONSE quirks', () => {
    assert.equal(shouldSkipMcuVersionRequest(stubDevice('_TZE284_agcxaw3f')), true);
    assert.equal(shouldSkipMcuVersionRequest(stubDevice('_TZE200_a4b5cdef')), false);
  });

  it('configureMcuVersionRequest dataQuery-only when skip (no 0x10)', async () => {
    const calls = [];
    const cluster = {
      mcuVersionRequest: async () => { calls.push('mcuVersionRequest'); },
      dataQuery: async () => { calls.push('dataQuery'); },
    };
    const ok = await configureMcuVersionRequest(stubDevice('_TZE200_68nvbio9'), cluster);
    assert.equal(ok, true);
    assert.deepEqual(calls, ['dataQuery']);
  });

  it('TUYA_SEQ_10 buildPayload is 10 bytes with seq echo', () => {
    const buf = TuyaTimeSyncFormats.buildPayload(TIME_FORMAT.TUYA_SEQ_10, {
      timezone: 'UTC',
      sequenceNumber: 0x1234,
      date: new Date('2026-01-15T12:00:00Z'),
    });
    assert.equal(buf.length, 10);
    assert.equal(buf.readUInt16BE(0), 0x1234);
  });

  it('EF00 manager maps tuya_seq_10 to seq format not TUYA_MCU', () => {
    const src = fs.readFileSync(path.join(ROOT, 'lib/tuya/TuyaEF00Manager.js'), 'utf8');
    assert.match(src, /'tuya_seq_10':\s*TIME_FORMATS\.TUYA_SEQ_10/);
    assert.match(src, /'tuya_seq_10_e2k':\s*TIME_FORMATS\.TUYA_SEQ_10_E2K/);
    assert.doesNotMatch(src, /'tuya_seq_10':\s*TIME_FORMATS\.TUYA_MCU/);
  });

  it('GlobalTimeSyncEngine uses Formats + FORCE_UPDATE', () => {
    const src = fs.readFileSync(path.join(ROOT, 'lib/tuya/GlobalTimeSyncEngine.js'), 'utf8');
    assert.match(src, /TuyaTimeSyncFormats\.buildPayload/);
    assert.match(src, /getFallbackChain/);
    assert.match(src, /FORCE_UPDATE/);
    assert.match(src, /_resolveForceUpdateIntervalMs/);
  });

  it('vvmbj46n FORCE_UPDATE is 1h', () => {
    const bug = MCUFormatDatabase.getFirmwareBug('_TZE200_vvmbj46n');
    assert.equal(bug?.fix?.type, 'FORCE_UPDATE');
    assert.equal(bug.fix.interval_ms, 3600000);
  });

  it('dimmer drivers use TuyaBrightnessScale (0-1000 clamp)', () => {
    assert.equal(toTuyaBrightness(1.0), 1000);
    assert.equal(toTuyaBrightness(1.5), 1000);
    const d1 = fs.readFileSync(path.join(ROOT, 'drivers/dimmer_1_gang_tuya/device.js'), 'utf8');
    const d3 = fs.readFileSync(path.join(ROOT, 'drivers/dimmer_3gang/device.js'), 'utf8');
    assert.match(d1, /toTuyaBrightness/);
    assert.match(d3, /toTuyaBrightness/);
    assert.doesNotMatch(d1, /Math\.floor\(value \* 1000\)/);
  });
});
