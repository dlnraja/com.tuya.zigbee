/**
 * Device type inference - productId + mfr + description
 */

const PID_MAP = {
  TS0001:'switch_1gang', TS0011:'switch_1gang',
  TS0002:'switch_2gang', TS0012:'switch_2gang',
  TS0003:'switch_3gang', TS0013:'switch_3gang',
  TS0004:'switch_4gang', TS0014:'switch_4gang',
  TS0005:'switch_wall_5gang', TS0015:'switch_wall_5gang',
  TS0006:'switch_wall_6gang', TS0016:'switch_wall_6gang',
  TS011F:'plug_smart', TS0121:'plug_smart', TS0112:'plug_smart',
  TS0041:'button_wireless_1', TS0042:'button_wireless_2',
  TS0043:'button_wireless_3', TS0044:'button_wireless_4',
  TS004F:'button_wireless_4', TS0048:'button_wireless_8',
  TS110E:'dimmer_wall_1gang', TS110F:'dimmer_wall_1gang',
  TS0501A:'bulb_dimmable', TS0502A:'bulb_tunable_white',
  TS0505A:'bulb_rgb', TS0504A:'bulb_rgbw',
  TS130F:'curtain_motor', TS0302:'curtain_motor',
  TS0201:'climate_sensor', TS0222:'climate_sensor',
  TS0202:'motion_sensor', TS0203:'contact_sensor',
  TS0204:'gas_sensor', TS0205:'smoke_detector_advanced',
  TS0207:'water_leak_sensor', TS0210:'vibration_sensor',
  TS0225:'presence_sensor_radar', TS1201:'ir_blaster',
  TS0726:'switch_4gang',
};

const TS0601_RULES = [
  [/curtain|blind|cover|shade|motor/i, 'curtain_motor'],
  [/valve|trv|thermo|radiator|bvu/i, 'radiator_valve'],
  [/presence|radar|human|mmwave/i, 'presence_sensor_radar'],
  [/smoke|fire/i, 'smoke_detector_advanced'],
  [/water|leak|flood/i, 'water_leak_sensor'],
  [/door|contact|magnet/i, 'contact_sensor'],
  [/soil/i, 'soil_sensor'],
  [/dimmer/i, 'dimmer_wall_1gang'],
  [/siren|alarm/i, 'siren'],
  [/lock/i, 'lock_smart'],
  [/fan/i, 'fan_controller'],
  [/garage/i, 'garage_door'],
  [/switch|relay|gang/i, 'switch_1gang'],
  [/plug|socket|outlet/i, 'plug_smart'],
  [/energy|meter|power/i, 'energy_meter_3phase'],
  [/rain/i, 'rain_sensor'],
  [/temp|humid|climate|th0|wsd/i, 'climate_sensor'],
  [/motion|pir/i, 'motion_sensor'],
];

// Description-based fallback for non-standard PIDs
const DESC_RULES = [
  [/rgb|cct|bulb|lamp|luminaire|gu10|e27|e14|gx53|ceiling.*light|light.*led|led.*light/i, 'bulb_rgbw'],
  [/led.*strip|strip.*led/i, 'led_strip'],
  [/plug|socket|outlet|power.*monitor/i, 'plug_smart'],
  [/ir.*remote|universal.*remote|ir.*blaster/i, 'ir_blaster'],
  [/curtain|blind|cover|motor/i, 'curtain_motor'],
  [/thermostat|trv|radiator|valve/i, 'radiator_valve'],
  [/presence|radar|mmwave/i, 'presence_sensor_radar'],
  [/motion|pir/i, 'motion_sensor'],
  [/contact|door.*sensor|window.*sensor/i, 'contact_sensor'],
  [/water.*leak/i, 'water_leak_sensor'],
  [/smoke/i, 'smoke_detector_advanced'],
  [/switch|relay/i, 'switch_1gang'],
  [/dimmer/i, 'dimmer_wall_1gang'],
  [/temp.*humid|climate/i, 'climate_sensor'],
];

function inferDriver(pid, mfr, desc) {
  const p = (pid || "").toUpperCase();
  if (PID_MAP[p]) return PID_MAP[p];
  if (p === "TS0601" || p.startsWith("TS06")) {
    const text = ((mfr||"") + " " + (desc||"")).toLowerCase();
    for (const [re, drv] of TS0601_RULES) {
      if (re.test(text)) return drv;
    }
    return "unknown_dp";
  }
  // Fallback: try description-based inference
  const text = ((mfr||"")+" "+(desc||"")+" "+(pid||"")).toLowerCase();
  for (const [re, drv] of DESC_RULES) {
    if (re.test(text)) return drv;
  }
  return "unknown";
}

module.exports = { PID_MAP, TS0601_RULES, DESC_RULES, inferDriver };
