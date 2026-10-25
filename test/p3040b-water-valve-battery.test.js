'use strict';

/**
 * Tests — P3040b: water_valve_smart battery families keep measure_battery (targeted per couple family).
 * Before: UnifiedPlugBase.mainsPowered=true made FirmwareQuirkCompensator + SmartBatteryManager strip
 * measure_battery on the NEO / Nous L14 sprinklers (DP11 %), garden timers (DP7) and Zemismart 214C (DP26).
 * FrankEver FK (mains) keeps the old behaviour. Runs the real onNodeInit in scripts/perf/pairing-trace.js.
 */

const assert = require('assert');
const path = require('path');
const { execFileSync } = require('child_process');

const testApi = global.describe && global.it ? global : require('node:test');
const { describe, it } = testApi;

const ROOT = path.join(__dirname, '..');
function trace(mfr, stripped) {
  const args = [path.join(ROOT, 'scripts/perf/pairing-trace.js'), '--json', 'water_valve_smart', '--mfr', mfr];
  if (stripped) {args.push('--stripped');}
  const out = execFileSync(process.execPath, args, { cwd: ROOT, encoding: 'utf8', stdio: ['ignore', 'pipe', 'ignore'], timeout: 55000 });
  return JSON.parse(out)[0];
}

describe('P3040b — water_valve_smart battery families', function () {
  if (this && typeof this.timeout === 'function') {this.timeout(120000);}

  for (const mfr of ['_TZE284_z7a2jmyy', '_TZE204_RZRRJKZ2', '_TZE200_sh1btabb', '_TZE200_vuwtqx0t']) {
    it(`${mfr}: measure_battery kept on a fresh pair, energy is batteries`, () => {
      const r = trace(mfr, false);
      assert.ok(r.finalCaps.includes('measure_battery'), JSON.stringify(r.finalCaps));
      assert.ok(!r.capsRemoved.includes('measure_battery'));
      assert.ok(!/"mains":true/.test(r.energy || ''), r.energy);
    });
    it(`${mfr}: a device stripped by the old mains rule gets measure_battery and battery energy back`, () => {
      const r = trace(mfr, true);
      assert.ok(r.finalCaps.includes('measure_battery'));
      assert.ok(/"batteries":\["/.test(r.energy || ''), r.energy);
    });
  }

  it('FrankEver FK (mains valve) keeps the mains behaviour: no generic change', () => {
    const r = trace('_TZE200_wt9agwf3', false);
    assert.ok(!r.finalCaps.includes('measure_battery'));
    assert.ok(/"mains":true/.test(r.energy || ''));
  });

  it('only water_valve_smart overrides mainsPowered (no generic fix in the plug base)', () => {
    const src = require('fs').readFileSync(path.join(ROOT, 'lib/devices/UnifiedPlugBase.js'), 'utf8');
    assert.ok(/get mainsPowered\(\) \{ return true; \}/.test(src));
  });
});
