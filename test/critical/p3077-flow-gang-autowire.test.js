'use strict';

// P3077 flow audit: WiFi per-gang / per-socket / tank-full cards were declared but never fired.
const { test } = require('node:test');
const assert = require('node:assert');

const map = require('../../config/flow/dead-flow-autowire.json');
const W = require('../../lib/flow/DeadFlowAutoWire');

const EXPECTED = {
  wifi_switch_2gang_g1_on: ['wifi_switch_2gang', 'onoff', true],
  wifi_switch_2gang_g1_off: ['wifi_switch_2gang', 'onoff', false],
  wifi_switch_2gang_g2_on: ['wifi_switch_2gang', 'onoff.gang2', true],
  wifi_switch_2gang_g2_off: ['wifi_switch_2gang', 'onoff.gang2', false],
  wifi_power_strip_socket1_on: ['wifi_power_strip', 'onoff', true],
  wifi_power_strip_socket1_off: ['wifi_power_strip', 'onoff', false],
  wifi_dehumidifier_water_full: ['wifi_dehumidifier', 'alarm_water', true]
};

test('P3077 flow: the 7 orphan WiFi cards are mapped to their exact capability', () => {
  for (const [id, [driver, cap, when]] of Object.entries(EXPECTED)) {
    assert.deepStrictEqual(map.triggers[id], { driver, cap, when }, id);
  }
});

test('P3077 flow: gang 2 fires only on onoff.gang2, gang 1 only on onoff', () => {
  W._resetForTests();
  assert.deepStrictEqual(W.mappedTriggerIds('wifi_switch_2gang', 'onoff.gang2', true), ['wifi_switch_2gang_g2_on']);
  assert.deepStrictEqual(W.mappedTriggerIds('wifi_switch_2gang', 'onoff.gang2', false), ['wifi_switch_2gang_g2_off']);
  assert.deepStrictEqual(W.mappedTriggerIds('wifi_switch_2gang', 'onoff', true), ['wifi_switch_2gang_g1_on']);
  assert.deepStrictEqual(W.mappedTriggerIds('wifi_dehumidifier', 'alarm_water', false), []);
});

test('P3077 flow: Zigbee `switch` look-alike cards are not auto-wired (already reached)', () => {
  for (const id of Object.keys(map.triggers)) {
    assert.ok(!/^switch_2gang_gang\d_turned_(on|off)_switch$/.test(id), id);
  }
});

test('P3077 flow batch 2: radar distance + soil temperature orphans follow their capability, tokens in metres', () => {
  const fs = require('fs');
  const DIST = 'measure_luminance.distance';
  for (const [id, driver] of [
    ['climate_sensor_presence_sensor_climate_prese_469fa', 'climate_sensor_presence'],
    ['device_air_purifier_presence_air_purifier_pr_40c51', 'device_air_purifier_presence'],
    ['sensor_motion_radar_motion_sensor_radar_mmwa_4efe6', 'sensor_motion_radar'],
    ['sensor_motion_radar_motion_sensor_radar_mmwa_edf67', 'sensor_motion_radar']
  ]) {
    assert.deepStrictEqual(map.triggers[id], { driver, cap: DIST, when: 'change' }, id);
    const card = JSON.parse(fs.readFileSync(`drivers/${driver}/driver.flow.compose.json`, 'utf8')).triggers.find((t) => t.id === id);
    for (const tok of card.tokens || []) {assert.ok(!/\(cm\)/.test(JSON.stringify(tok.title)), `${id}: capability is in m`);}
  }
  assert.deepStrictEqual(map.triggers.sensor_lcdtemphumidsensor_soil_sensor_temper_b2371,
    { driver: 'sensor_lcdtemphumidsensor_soil', cap: 'measure_temperature', when: 'change' });
});

test('P3077 flow batch 3: siren stopped / WiFi alarm on-off follow alarm_generic (sounding state)', () => {
  const G = 'alarm_generic';
  assert.deepStrictEqual(map.triggers.siren_alarm_stopped, { driver: 'siren', cap: G, when: false });
  assert.deepStrictEqual(map.triggers.device_air_purifier_siren_alarm_stopped, { driver: 'device_air_purifier_siren', cap: G, when: false });
  assert.deepStrictEqual(map.triggers.wifi_siren_alarm_on, { driver: 'wifi_siren', cap: G, when: true });
  assert.deepStrictEqual(map.triggers.wifi_siren_alarm_off, { driver: 'wifi_siren', cap: G, when: false });
  // 'Siren started' keeps its existing path: not added to the map (no double fire)
  assert.strictEqual(map.triggers.siren_alarm_triggered, undefined);
  W._resetForTests();
  assert.deepStrictEqual(W.mappedTriggerIds('wifi_siren', G, true), ['wifi_siren_alarm_on']);
  assert.deepStrictEqual(W.mappedTriggerIds('wifi_siren', G, false), ['wifi_siren_alarm_off']);
  assert.deepStrictEqual(W.mappedTriggerIds('siren', G, true), []);
});

test('P3077 flow batch 4: shutter moving + vacuum cleaning follow their state capability; DIN-rail dehumidifier cards never fire', () => {
  const S = 'windowcoverings_state';
  const V = 'vacuumcleaner_state';
  assert.deepStrictEqual(map.triggers.shutter_roller_controller_started_moving, { driver: 'shutter_roller_controller', cap: S, when: 'leave:idle' });
  assert.deepStrictEqual(map.triggers.shutter_roller_controller_stopped_moving, { driver: 'shutter_roller_controller', cap: S, when: 'enter:idle' });
  assert.deepStrictEqual(map.triggers.wifi_robot_vacuum_cleaning_started, { driver: 'wifi_robot_vacuum', cap: V, when: 'enter:cleaning' });
  assert.deepStrictEqual(map.triggers.wifi_robot_vacuum_cleaning_finished, { driver: 'wifi_robot_vacuum', cap: V, when: 'move:cleaning>docked' });
  W._resetForTests();
  const sh = (v, p) => W.mappedTriggerIds('shutter_roller_controller', S, v, { previous: p });
  assert.deepStrictEqual(sh('down', 'idle'), ['shutter_roller_controller_started_moving']);
  assert.deepStrictEqual(sh('idle', 'up'), ['shutter_roller_controller_stopped_moving']);
  assert.deepStrictEqual(sh('idle', null), [], 'first report after start never fires');
  const vac = (v, p) => W.mappedTriggerIds('wifi_robot_vacuum', V, v, { previous: p });
  assert.deepStrictEqual(vac('cleaning', 'docked'), ['wifi_robot_vacuum_cleaning_started']);
  assert.deepStrictEqual(vac('docked', 'cleaning'), ['wifi_robot_vacuum_cleaning_finished']);
  assert.deepStrictEqual(vac('stopped', 'cleaning'), [], 'a pause is not a finished cycle');
  assert.strictEqual(W.modeEdge('move:a>b', 'b', 'c'), false);
  const { NEVER_FIRE_IDS } = require('../../tools/flow/build-dead-flow-autowire.js');
  assert.strictEqual(NEVER_FIRE_IDS.size, 8);
  for (const id of NEVER_FIRE_IDS) {assert.strictEqual(map.triggers[id], undefined, id);}
  assert.ok(map.triggers.device_din_rail_meter_hvac_dehumidifier_powe_f9a4b, 'DIN-rail power card keeps its mapping');
});

test('P3077 flow batch 5: temperature/humidity/soil threshold cards cross the stored setting once, with hysteresis', () => {
  const ex = {
    climate_sensor_temperature_alarm_high: ['climate_sensor', 'measure_temperature', 'over:alarm_temp_max:40:0.5'],
    climate_sensor_humidity_alarm_low: ['climate_sensor', 'measure_humidity', 'under:alarm_humidity_min:20:2'],
    sensor_contact_climate_temperature_alarm_low: ['sensor_contact_climate', 'measure_temperature', 'under:alarm_temp_min:0:0.5'],
    sensor_climate_temphumidsensor_humidity_alarm_high: ['sensor_climate_temphumidsensor', 'measure_humidity', 'over:alarm_humidity_max:80:2'],
    sensor_lcdtemphumidsensor_soil_sensor_soil_dry: ['sensor_lcdtemphumidsensor_soil', 'measure_humidity.soil', 'under:soil_warning_threshold:30:2']
  };
  for (const [id, [driver, cap, when]] of Object.entries(ex)) {assert.deepStrictEqual(map.triggers[id], { driver, cap, when }, id);}
  const n = Object.values(map.triggers).filter((v) => /^(over|under):/.test(v.when)).length;
  assert.strictEqual(n, 20, '18 climate + 2 soil-dry cards');
  // CO2 alert cards keep their alarm_co2 rule (capability missing): not mapped, owner decision
  assert.strictEqual(map.triggers.air_quality_co2_alert_on, undefined);
  W._resetForTests();
  const settings = { alarm_temp_max: 30 };
  const dev = { getSetting: (k) => (k in settings ? settings[k] : null) };
  const hi = (v, p) => W.mappedTriggerIds('climate_sensor', 'measure_temperature', v, { device: dev, previous: p });
  assert.deepStrictEqual(hi(31, 29), ['climate_sensor_temperature_alarm_high'], 'stored setting 30 used');
  assert.deepStrictEqual(hi(32, 31), [], 'fires once');
  assert.deepStrictEqual(hi(29.8, 32), [], 'inside hysteresis: not re-armed');
  assert.deepStrictEqual(hi(30.2, 29.8), [], 'still not re-armed');
  assert.deepStrictEqual(hi(29.5, 30.2), [], 're-arms at thr - 0.5');
  assert.deepStrictEqual(hi(30.1, 29.5), ['climate_sensor_temperature_alarm_high']);
  // restart while already high: no memory, previous above threshold -> never re-fires
  const dev2 = { getSetting: () => null };
  assert.strictEqual(W.thresholdCrossed(dev2, 'x', 'over:alarm_temp_max:40:0.5', 41, 41), false, 'null setting -> manifest default 40, not 0');
  assert.strictEqual(W.thresholdCrossed(dev2, 'x', 'over:alarm_temp_max:40:0.5', 39, 41), false);
  assert.strictEqual(W.thresholdCrossed(dev2, 'x', 'over:alarm_temp_max:40:0.5', 40.5, 39), true);
  const dry = (v, p) => W.thresholdCrossed(dev2, 'd', 'under:soil_warning_threshold:30:2', v, p);
  assert.strictEqual(dry(28, 35), true);
  assert.strictEqual(dry(25, 28), false);
  assert.strictEqual(dry(31, 25), false, 'below 30 + 2: not re-armed');
  assert.strictEqual(dry(32, 31), false, 're-armed');
  assert.strictEqual(dry(29, 32), true);
  assert.strictEqual(W.thresholdCrossed(null, 'n', 'over:a:1:0', 5, 0), false);
  assert.strictEqual(W.thresholdCrossed(dev2, 'n', 'over:a:1:0', 'bad', 0), false);
});

test('P3077 flow batch 6: "Power exceeds threshold" cards fire only when crossing the flow\'s own threshold', async () => {
  const ids = ['device_plug_energy_device_plug_energy_monito_b969d', 'device_plug_smart_power_threshold',
    'plug_smart_power_threshold', 'sensor_contact_plug_contact_sensor_plug_threshold'];
  for (const id of ids) {
    assert.strictEqual(map.triggers[id].cap, 'measure_power', id);
    assert.strictEqual(map.triggers[id].when, 'argover:threshold', id);
  }
  assert.strictEqual(Object.values(map.triggers).filter((v) => /^argover:/.test(v.when)).length, 4);
  // trigger is offered on any numeric change with a known previous; the run listener decides per flow
  const ids1 = (v, p) => W.mappedTriggerIds('plug_smart', 'measure_power', v, { previous: p });
  assert.deepStrictEqual(ids1(120, 80), ['plug_smart_power_threshold']);
  assert.deepStrictEqual(ids1(120, undefined), [], 'first report after start never fires');
  const def = map.triggers.plug_smart_power_threshold;
  const run = (thr, value, previous) => W.argOverCrossed(def, { threshold: thr }, { value, previous });
  assert.strictEqual(run(100, 120, 80), true, 'crosses 100 upwards');
  assert.strictEqual(run(100, 130, 120), false, 'already above: no repeat');
  assert.strictEqual(run(100, 80, 120), false, 'downwards: no');
  assert.strictEqual(run(100, 100, 80), false, 'equal is not exceeding');
  assert.strictEqual(run(100, 101, 100), true);
  assert.strictEqual(run(200, 120, 80), false, 'another flow with 200 W stays quiet');
  assert.strictEqual(run(undefined, 120, 80), false);
  assert.strictEqual(run(100, 120, null), false);
  // registration: replaces the generic pass-through, one listener per mapped argover card
  const listeners = {};
  const homey = { flow: { getDeviceTriggerCard: (id) => ({ registerRunListener: (fn) => { listeners[id] = fn; } }) } };
  assert.strictEqual(W.registerDeadTriggerArgs(homey), 4);
  assert.deepStrictEqual(Object.keys(listeners).sort(), ids.slice().sort());
  assert.strictEqual(await listeners.plug_smart_power_threshold({ threshold: 50 }, { value: 60, previous: 40 }), true);
  assert.strictEqual(await listeners.plug_smart_power_threshold({ threshold: 50 }, { value: 60, previous: 55 }), false);
  assert.strictEqual(W.registerDeadTriggerArgs({}), 0);
});

test('P3077 flow batch 6: a null previous (fresh device) is unknown, never 0', () => {
  const dev = { getSetting: () => null };
  assert.strictEqual(W.thresholdCrossed(dev, 'z', 'over:alarm_temp_max:40:0.5', 45, null), false);
  assert.strictEqual(W.thresholdCrossed(dev, 'z', 'over:alarm_temp_max:40:0.5', 46, 45), false);
  assert.deepStrictEqual(W.mappedTriggerIds('plug_smart', 'measure_power', 120, { previous: null }), []);
});

test('P3077 flow batch 7: "Left open for duration" fires once per open episode via the shared bounded scheduler', async () => {
  const S = require('../../lib/flow/LeftOpenScheduler');
  const ids = ['air_purifier_contact_sensor_left_open', 'contact_sensor_left_open', 'door_sensor_left_open',
    'sensor_contact_water_left_open', 'sensor_contact_zigbee_contact_sensor_left_open'];
  for (const id of ids) {
    assert.strictEqual(map.triggers[id].cap, 'alarm_contact', id);
    assert.strictEqual(map.triggers[id].when, 'openfor:5', id);
  }
  S._resetForTests();
  const timers = new Map(); let seq = 0;
  const homey = {
    setTimeout: (fn, ms) => { const h = ++seq; timers.set(h, { fn, ms }); return h; },
    clearTimeout: (h) => { timers.delete(h); }
  };
  const fired = [];
  let open = false;
  const dev = {
    homey, driver: { id: 'door_sensor' },
    getCapabilityValue: () => open,
    triggerFlowCard: async (id, tokens, state) => { fired.push([id, tokens, state.duration]); return true; }
  };
  const report = (v, p) => { open = v; return W.mappedTriggerIds('door_sensor', 'alarm_contact', v, { device: dev, previous: p }); };
  assert.ok(!report(true, false).includes('door_sensor_left_open'), 'never fired inline');
  assert.strictEqual(timers.size, 1);
  assert.strictEqual([...timers.values()][0].ms, 5 * 60000);
  report(true, true); // repeated "open" report: dedup
  assert.strictEqual(timers.size, 1);
  assert.strictEqual(S.pendingCount(), 1);
  const run = () => { const t = [...timers.entries()]; timers.clear(); for (const [, v] of t) {v.fn();} };
  run();
  await new Promise((r) => setImmediate(r));
  assert.deepStrictEqual(fired, [['door_sensor_left_open', { duration: 5 }, 5]]);
  assert.strictEqual(S.pendingCount(), 0);
  // closed before expiry: cancelled, nothing fired
  report(false, true); report(true, false);
  assert.strictEqual(timers.size, 1);
  report(false, true);
  assert.strictEqual(timers.size, 0);
  assert.strictEqual(S.pendingCount(), 0);
  // closed but the close report was missed: the expiry checks the live value
  report(true, false); open = false; run();
  await new Promise((r) => setImmediate(r));
  assert.strictEqual(fired.length, 1);
  // bounded: no more than MAX_PENDING timers, extra devices are refused
  S._resetForTests(); timers.clear();
  const f = () => {};
  for (let i = 0; i < S.MAX_PENDING; i++) {assert.strictEqual(S.track({ homey }, 'x', 'openfor:5', true, f), 'ARMED');}
  assert.strictEqual(S.track({ homey }, 'x', 'openfor:5', true, f), 'FULL');
  assert.strictEqual(timers.size, S.MAX_PENDING);
  assert.strictEqual(S.track(null, 'x', 'openfor:5', true, f), 'IDLE');
  assert.strictEqual(S.track({}, 'x', 'openfor:5', true, f), 'IDLE', 'no Homey timers: no raw timer either');
  S._resetForTests();
});
