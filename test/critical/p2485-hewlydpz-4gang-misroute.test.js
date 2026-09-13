'use strict';

/**
 * P2485 — Contre quoi (L99 + max DP/flow/heuristic):
 * Z2M-verified EF00 multi-gang switches must NOT stay on curtain / illuminance / dimmer.
 * Must expose full DP profile + flow cards + no phantom battery + WiFi local-first static IP.
 */

const assert = require('assert');
const fs = require('fs');
const path = require('path');
const os = require('os');

const ROOT = path.join(__dirname, '..', '..');

function compose(driverId) {
  return JSON.parse(fs.readFileSync(
    path.join(ROOT, 'drivers', driverId, 'driver.compose.json'),
    'utf8'
  ));
}

function hasMfr(list, re) {
  return list.some((m) => re.test(String(m)));
}

const ws4 = compose('wall_switch_4_gang_tuya');
assert.ok(hasMfr(ws4.zigbee.manufacturerName, /_TZE200_hewlydpz/i));
assert.ok(hasMfr(ws4.zigbee.manufacturerName, /_TZE204_hewlydpz/i));
assert.ok(hasMfr(ws4.zigbee.manufacturerName, /_TZE204_7ytnacie/i));
assert.ok(!(ws4.capabilities || []).includes('measure_battery'), 'mains 4-gang must not compose measure_battery');
assert.ok(!ws4.energy || !ws4.energy.batteries, 'mains 4-gang must not compose energy.batteries');

assert.ok(!hasMfr(compose('curtain_motor').zigbee.manufacturerName, /hewlydpz/i));
assert.ok(!hasMfr(compose('sensor_illuminance_presence').zigbee.manufacturerName, /hewlydpz/i));
assert.ok(!hasMfr(compose('dimmer_wall_1gang').zigbee.manufacturerName, /7ytnacie|rkbxtclc|hewlydpz/i));
assert.ok(hasMfr(compose('switch_3gang').zigbee.manufacturerName, /_TZE204_rkbxtclc/i));

const flow = JSON.parse(fs.readFileSync(
  path.join(ROOT, 'drivers/wall_switch_4_gang_tuya/driver.flow.compose.json'),
  'utf8'
));
const actionIds = (flow.actions || []).map((a) => a.id);
for (const id of [
  'wall_switch_4_gang_tuya_set_backlight',
  'wall_switch_4_gang_tuya_set_power_on_behavior',
  'wall_switch_4_gang_tuya_set_child_lock',
  'wall_switch_4_gang_tuya_set_countdown',
  'wall_switch_4_gang_tuya_turn_on_gang4',
]) {
  assert.ok(actionIds.includes(id), `missing flow action ${id}`);
}

const settings = JSON.parse(fs.readFileSync(
  path.join(ROOT, 'drivers/wall_switch_4_gang_tuya/driver.settings.compose.json'),
  'utf8'
));
const settingIds = settings.map((s) => s.id);
assert.ok(settingIds.includes('power_on_behavior'));
assert.ok(settingIds.includes('backlight_mode'));
assert.ok(settingIds.includes('child_lock'));

const {
  resolveEf00MultiGangProfile,
  gangStateDp,
} = require('../../lib/tuya/Ef00MultiGangProfiles');
assert.strictEqual(resolveEf00MultiGangProfile('_TZE204_7ytnacie').id, 'colored_4gang');
assert.strictEqual(resolveEf00MultiGangProfile('_TZE200_hewlydpz').id, 'simple_4gang_backlight7');
assert.strictEqual(resolveEf00MultiGangProfile('_TZE204_rkbxtclc').id, 'colored_3gang');
assert.strictEqual(gangStateDp(resolveEf00MultiGangProfile('_TZE204_7ytnacie'), 4), 4);
assert.strictEqual(resolveEf00MultiGangProfile('_TZE204_7ytnacie').dps.child_lock, 101);

const { SWITCH_DPS } = require('../../lib/tuya/EnrichedDPMappings');
assert.ok(SWITCH_DPS.COLORED_4GANG[101]);
assert.ok(SWITCH_DPS.MULTI_GANG === SWITCH_DPS.MULTIGANG);

const { resolveWiFiTransport } = require('../../lib/wifi/LocalFirstResolver');
const lan = resolveWiFiTransport({
  deviceId: 'abc',
  localKey: '0123456789abcdef',
  ip: '192.168.1.50',
  discoveredIp: '192.168.1.99',
  policy: { strategy: 'local_first', localDiscovery: true, cloudFallback: false },
});
assert.strictEqual(lan.transport, 'lan');
assert.strictEqual(lan.ip, '192.168.1.50', 'T15811 prefer settings static IP');
assert.ok(/settings-static/.test(lan.ipSource));

const keep = JSON.parse(fs.readFileSync(
  path.join(ROOT, 'config/architecture/publish-sacred-keep-couples.json'),
  'utf8'
));
assert.ok((keep.couples || []).some((c) => /hewlydpz/i.test(c.mfr) && c.driverId === 'wall_switch_4_gang_tuya'));

const { compactManifestFile } = require('../../scripts/maintenance/compact-zigbee-identifiers.cjs');
const tmp = path.join(os.tmpdir(), `p2485-compact-${process.pid}.json`);
fs.copyFileSync(path.join(ROOT, 'app.json'), tmp);
compactManifestFile(tmp, {
  maxTotalCombos: 17000,
  maxDriverCombos: 2000,
  maxCaseForms: 2,
});
const after = JSON.parse(fs.readFileSync(tmp, 'utf8'));
try { fs.unlinkSync(tmp); } catch (_) { /* ignore */ }
const ws4After = (after.drivers || []).find((d) => d.id === 'wall_switch_4_gang_tuya');
assert.ok(ws4After);
const mfrs = (ws4After.zigbee && ws4After.zigbee.manufacturerName) || [];
assert.ok(mfrs.some((m) => /_TZE200_hewlydpz/i.test(m)));
assert.ok(mfrs.some((m) => /_TZE204_7ytnacie/i.test(m)));

console.log('P2485 max DP/flow/heuristic + T15811 local-first: PASS');
