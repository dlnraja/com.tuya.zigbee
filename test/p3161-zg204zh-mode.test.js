'use strict';
// P3161: ZG-204ZH DP112 has its own mode dropdown (Z2M hobeian.ts: pir_and_radar=0, pir_or_radar=1, only_radar=2).
const assert = require('assert');
const path = require('path');
const configs = require('../drivers/presence_sensor_radar/configs.js');
// driver.settings.compose.json wins over driver.compose.json settings (P3079 shadow ratchet).
const compose = { settings: require('../drivers/presence_sensor_radar/driver.settings.compose.json') };
const app = require('../app.json');

function findCfg() {
  const all = configs.RADAR_CONFIGS || configs.SENSOR_CONFIGS || configs.CONFIGS || configs;
  return all.HOBEIAN_ZG204ZH;
}
function allSettings(list, out = []) { for (const s of list || []) { out.push(s); allSettings(s.children, out); } return out; }

describe('P3161 ZG-204ZH DP112 motion detection mode', () => {
  const cfg = findCfg();
  const m = cfg && cfg.dpMap[112];
  it('maps DP112 to its own typed enum setting', () => {
    assert.ok(m, 'HOBEIAN_ZG204ZH dpMap[112]');
    assert.strictEqual(m.setting, 'zh_motion_detection_mode');
    assert.strictEqual(m.type, 'enum');
    assert.ok(cfg.writableDPs.includes(112));
  });
  it('TX uses Z2M semantics', () => {
    assert.strictEqual(m.reverseEnumMap['0'], 0);
    assert.strictEqual(m.reverseEnumMap['1'], 1);
    assert.strictEqual(m.reverseEnumMap['2'], 2);
    assert.strictEqual(m.reverseEnumMap.pir_and_radar, 0);
    assert.strictEqual(m.reverseEnumMap.pir_or_radar, 1);
    assert.strictEqual(m.reverseEnumMap.only_radar, 2);
  });
  it('RX syncs back to dropdown ids', () => {
    for (const v of [0, 1, 2]) assert.strictEqual(m.enumMap[v], String(v));
  });
  it('dropdown exists with ids 0/1/2 and ZM setting untouched', () => {
    const s = allSettings(compose.settings);
    const zh = s.find((x) => x.id === 'zh_motion_detection_mode');
    assert.ok(zh && zh.type === 'dropdown');
    assert.deepStrictEqual(zh.values.map((v) => v.id), ['0', '1', '2']);
    assert.match(zh.values[0].label.en, /PIR and Radar/);
    assert.match(zh.values[1].label.en, /PIR or Radar/);
    assert.ok(s.find((x) => x.id === 'motion_detection_mode'));
    const zm = Object.values(configs.RADAR_CONFIGS || configs.SENSOR_CONFIGS || configs.CONFIGS || configs).find((c) => c && c.modelId === 'ZG-204ZM');
    if (zm && zm.dpMap && zm.dpMap[122]) assert.strictEqual(zm.dpMap[122].setting, 'motion_detection_mode');
  });
  it('both dropdowns are in app.json (visible to users)', () => {
    const d = app.drivers.find((x) => x.id === 'presence_sensor_radar');
    const ids = allSettings(d.settings).map((x) => x.id);
    assert.ok(ids.includes('zh_motion_detection_mode') && ids.includes('motion_detection_mode'));
  });
  it('device converts via enum maps (RX/TX)', () => {
    const src = require('fs').readFileSync(path.join(__dirname, '../drivers/presence_sensor_radar/device.js'), 'utf8');
    assert.ok(/mapping\.reverseEnumMap/.test(src) && /mapping\.enumMap/.test(src));
  });
});
