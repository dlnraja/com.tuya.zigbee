'use strict';
const assert = require('assert');
const fs = require('fs');
const path = require('path');
const R = require('../../lib/sensors/IasZoneTypeRouter');

describe('JohanBendz #1113/#1475 ambiguous eWeLink|SNZB-03 (IAS zoneType routing)', () => {
  it('maps zoneType numbers and names, unknown → null (no guessing)', () => {
    assert.strictEqual(R.capabilityForZoneType(0x000D), 'alarm_motion');
    assert.strictEqual(R.capabilityForZoneType('motionSensor'), 'alarm_motion');
    assert.strictEqual(R.capabilityForZoneType(0x002A), 'alarm_water');
    assert.strictEqual(R.capabilityForZoneType('waterSensor'), 'alarm_water');
    assert.strictEqual(R.capabilityForZoneType(0x8000), null);
    assert.strictEqual(R.capabilityForZoneType(undefined), null);
  });
  it('decodes zoneStatus forms; water accepts alarm2', () => {
    assert.strictEqual(R.alarmFor('alarm_motion', R.decodeZoneStatus({ type: 'Buffer', data: [1, 0] })), true);
    assert.strictEqual(R.alarmFor('alarm_motion', R.decodeZoneStatus(2)), false);
    assert.strictEqual(R.alarmFor('alarm_water', R.decodeZoneStatus(2)), true);
    assert.strictEqual(R.alarmFor('alarm_water', R.decodeZoneStatus({ alarm1: false, alarm2: false })), false);
  });
  it('eWeLink|SNZB-03 lives on exactly one driver, which carries no static alarm capability', () => {
    const dir = path.join(__dirname, '..', '..', 'drivers');
    const hits = [];
    for (const id of fs.readdirSync(dir)) {
      const f = path.join(dir, id, 'driver.compose.json');
      if (!fs.existsSync(f)) continue;
      const z = JSON.parse(fs.readFileSync(f, 'utf8')).zigbee || {};
      const m = [].concat(z.manufacturerName || []).map((s) => s.toLowerCase());
      const p = [].concat(z.productId || []).map((s) => s.toLowerCase());
      if (m.includes('ewelink') && p.includes('snzb-03')) hits.push(id);
    }
    assert.deepStrictEqual(hits, ['sensor_ias_zonetype_ewelink']);
    const c = JSON.parse(fs.readFileSync(path.join(dir, 'sensor_ias_zonetype_ewelink', 'driver.compose.json'), 'utf8'));
    assert.ok(!c.capabilities.some((x) => R.ALL_ZONE_CAPABILITIES.includes(x)));
  });
});
