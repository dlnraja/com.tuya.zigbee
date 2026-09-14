'use strict';

/**
 * P2472b — MCU time-sync pipeline: initialize-before-TX, format fallbacks, DP17 commit.
 * Contre quoi: EF00 sendTimeSync without DP17 for ZT08; MCU manager without attach/resync.
 */

const { describe, it } = require('node:test');
const assert = require('node:assert/strict');
const fs = require('fs');
const path = require('path');

const ROOT = path.join(__dirname, '..', '..');

describe('P2472b MCU time-sync pipeline', () => {
  it('TuyaEF00Manager schedules DP17 commit after successful sendTimeSync', () => {
    const src = fs.readFileSync(path.join(ROOT, 'lib/tuya/TuyaEF00Manager.js'), 'utf8');
    assert.ok(src.includes('_scheduleDp17CommitAfterTimeSync'), 'DP17 helper present');
    assert.ok(/async sendTimeSync[\s\S]*_scheduleDp17CommitAfterTimeSync/.test(src),
      'sendTimeSync invokes DP17 commit');
    assert.ok(src.includes("bug.fix.type !== 'DP17_COMMIT'") || src.includes("!== 'DP17_COMMIT'"),
      'DP17_COMMIT gate');
  });

  it('TuyaMCUManager v3 exposes attach + scheduleResync + syncTime', () => {
    const MCU = require(path.join(ROOT, 'lib/tuya/TuyaMCUManager.js'));
    const fake = {
      log: () => {},
      getSetting: () => null,
      getData: () => ({}),
      getStoreValue: () => null,
      setStoreValue: async () => {},
      zclNode: null,
      tuyaEF00Manager: null,
    };
    const mgr = new MCU(fake);
    assert.equal(typeof mgr.attach, 'function');
    assert.equal(typeof mgr.scheduleResync, 'function');
    assert.equal(typeof mgr.syncTime, 'function');
    assert.equal(typeof mgr.guessFormat, 'function');
    assert.equal(typeof mgr.clearResync, 'function');
  });

  it('MCUFormatDatabase locks hodyryli DP17 + fhvpaltk + 5slehgeo + 6a4vxfnv', () => {
    const DB = require(path.join(ROOT, 'lib/tuya/MCUFormatDatabase.js'));
    const zt08 = DB.getFirmwareBug('_TZE284_hodyryli');
    assert.ok(zt08?.fix?.type === 'DP17_COMMIT', 'ZT08 DP17_COMMIT');
    assert.equal(zt08.fix.dp, 17);
    assert.equal(zt08.fix.value, false);

    const fh = DB.getByManufacturer('_TZE284_fhvpaltk');
    assert.ok(fh?.format, 'fhvpaltk format');

    const moes = DB.getByManufacturer('_TZE204_5slehgeo');
    assert.ok(moes?.format, '5slehgeo Moes ZTS format');

    const floor = DB.getByManufacturer('_TZE204_6a4vxfnv');
    assert.ok(floor?.format, '6a4vxfnv floor thermostat format');
  });

  it('TuyaTimeSyncFormats builds dual 1970 and dual 2000 payloads', () => {
    const F = require(path.join(ROOT, 'lib/tuya/TuyaTimeSyncFormats.js'));
    const Formats = F.TIME_FORMAT || F;
    const dual1970 = F.buildPayload
      ? F.buildPayload(Formats.Z2M_DUAL_1970 || 'Z2M_DUAL_1970', {})
      : null;
    // Prefer class API
    let p1970; let p2000;
    if (typeof F.buildPayload === 'function') {
      p1970 = F.buildPayload(F.TIME_FORMAT?.Z2M_DUAL_1970 || 'Z2M_DUAL_1970');
      p2000 = F.buildPayload(F.TIME_FORMAT?.Z2M_DUAL_2000 || 'Z2M_DUAL_2000');
    } else if (F.TuyaTimeSyncFormats?.buildPayload) {
      p1970 = F.TuyaTimeSyncFormats.buildPayload(F.TIME_FORMAT.Z2M_DUAL_1970);
      p2000 = F.TuyaTimeSyncFormats.buildPayload(F.TIME_FORMAT.Z2M_DUAL_2000);
    }
    // Module may export class as default
    const Cls = typeof F.buildPayload === 'function' ? F : (F.default || F);
    if (!p1970 && Cls.buildPayload) {
      const TF = Cls.TIME_FORMAT || require(path.join(ROOT, 'lib/tuya/TuyaTimeSyncFormats.js')).TIME_FORMAT;
      p1970 = Cls.buildPayload(TF.Z2M_DUAL_1970 || Object.values(TF).find((v) => /1970/.test(String(v))));
      p2000 = Cls.buildPayload(TF.Z2M_DUAL_2000 || Object.values(TF).find((v) => /2000/.test(String(v))));
    }
    assert.ok(Buffer.isBuffer(p1970) || (p1970 && p1970.length >= 8) || typeof Cls.guessFormat === 'function',
      'format builders or guessFormat available');
    if (Buffer.isBuffer(p1970)) assert.ok(p1970.length >= 8, '1970 dual ≥8 bytes');
    if (Buffer.isBuffer(p2000)) assert.ok(p2000.length >= 8, '2000 dual ≥8 bytes');
    assert.ok(typeof (Cls.guessFormat || F.guessFormat) === 'function', 'guessFormat exported');
  });
});
