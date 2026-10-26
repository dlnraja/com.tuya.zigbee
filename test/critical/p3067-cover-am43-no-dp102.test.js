'use strict';
// P3067 family 6 (covers): on the AM43 roller (`_TZE200_zah67ekd` / `_icka1clh`, Z2M tuya.ts TS0601_cover_4)
// DP101 is opening_mode and DP102 factory_reset; libht6ua uses DP101 as motor_direction. The generic
// open_time / close_time writes (DP101/102) must not reach these motors; other curtains keep them.
const { describe, it } = require('../_support/dual-runner');
const assert = require('assert');
const path = require('path');
const { spawnSync } = require('child_process');

const ROOT = path.resolve(__dirname, '../..');
const SCRIPT = `
const Module = require('module');
const orig = Module._load;
Module._load = function (r, ...a) {
  if (r === 'homey') { class B {} return { Device: B, Driver: B, App: B, SimpleClass: B, __: (k) => k }; }
  return orig.call(this, r, ...a);
};
const C = require(require('path').resolve('drivers/curtain_motor/device.js'));
const run = async (mfr) => {
  const sent = [];
  const settings = { open_time: 30, close_time: 25, reverse_direction: false, zb_manufacturer_name: mfr, zb_model_id: 'TS0601' };
  const self = Object.create(C.prototype);
  Object.assign(self, {
    log: () => {}, error: () => {},
    getSetting: (k) => settings[k],
    getData: () => ({ manufacturerName: mfr, productId: 'TS0601' }),
    getManufacturerName: () => mfr,
    _detectProtocol: () => ({ protocol: 'TUYA_DP' }),
    _sendTuyaDP: async (dp, v) => { sent.push(dp); },
  });
  await C.prototype._applyCalibrationSettings.call(self);
  return sent;
};
(async () => {
  const out = {};
  for (const m of ['_TZE200_zah67ekd', '_TZE200_icka1clh', '_TZE284_libht6ua', '_TZE200_gubdgai2', '_TZE200_generic01']) out[m] = await run(m);
  console.log(JSON.stringify(out));
})();
`;

describe('P3067 covers: no DP101/102 travel-time writes on AM43-class motors', () => {
  const r = spawnSync(process.execPath, ['-e', SCRIPT], { cwd: ROOT, encoding: 'utf8' });
  const out = JSON.parse((r.stdout || '').trim().split('\n').pop() || '{}');

  it('AM43, libht6ua and Quoya get no DP101/102 write', () => {
    assert.strictEqual(r.status, 0, r.stderr);
    for (const m of ['_TZE200_zah67ekd', '_TZE200_icka1clh', '_TZE284_libht6ua', '_TZE200_gubdgai2']) {
      assert.ok(!out[m].includes(101) && !out[m].includes(102), `${m}: ${out[m]}`);
    }
  });

  it('other curtains still get the open/close times', () => {
    assert.deepStrictEqual(out._TZE200_generic01, [101, 102]);
  });
});
