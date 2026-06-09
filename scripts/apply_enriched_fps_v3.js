const fs = require('fs');
const path = require('path');

// Load enriched data
const report = JSON.parse(fs.readFileSync('./data/community-sync/report.json', 'utf8'));
const enrichedFps = report.enrichedFps || [];
console.log('Total enriched fingerprints:', enrichedFps.length);

// Suggest driver based on productId + description
function suggestDriverByProductId(productId, description) {
  const desc = (description || '').toLowerCase();
  const pid = (productId || '').toUpperCase();
  
  if (pid === 'TS0601' || pid === 'NULL' || pid === '' || pid === 'UNDEFINED') {
    if (desc.includes('temp') || desc.includes('humid') || desc.includes('climate')) return 'climate_sensor';
    if (desc.includes('air') || desc.includes('quality') || desc.includes('co2') || desc.includes('voc') || desc.includes('pm2.5') || desc.includes('hcho') || desc.includes('formal')) return 'air_quality_comprehensive';
    if (desc.includes('purif')) return 'air_purifier';
    if (desc.includes('soil') || desc.includes('moist')) return 'soil_sensor';
    if (desc.includes('radar') || desc.includes('presence') || desc.includes('mmwave') || desc.includes('human')) return 'presence_sensor_radar';
    if (desc.includes('curtain') || desc.includes('blind') || desc.includes('shade') || desc.includes('motor') || desc.includes('tubular') || desc.includes('clutch')) return 'curtain_motor';
    if (desc.includes('trv') || desc.includes('radiator') || desc.includes('thermostatic') || desc.includes('rad.valve')) return 'device_radiator_valve_smart';
    if (desc.includes('heating') || desc.includes('floor') || desc.includes('ufh')) return 'floor_heating_thermostat';
    if (desc.includes('switch') || desc.includes('relay') || desc.includes('gang')) return 'switch_1gang';
    if (desc.includes('dimmer')) return 'dimmer_wall_1gang';
    if (desc.includes('cover') || desc.includes('shutter')) return 'curtain_motor';
    if (desc.includes('ir ') || desc.includes('blaster') || desc.includes('infrared')) return 'ir_blaster';
    if (desc.includes('door') || desc.includes('contact') || desc.includes('magnet') || desc.includes('open')) return 'contact_sensor';
    if (desc.includes('motion') || desc.includes('pump') || desc.includes('vibration')) return 'motion_sensor';
    if (desc.includes('smoke') || desc.includes('fire')) return 'smoke_detector';
    if (desc.includes('gas') || desc.includes('leak') || desc.includes('co ') || desc.includes('carbon')) return 'gas_detector';
    if (desc.includes('light') || desc.includes('lux') || desc.includes('illumin') || desc.includes('bright')) return 'illuminance_sensor';
    if (desc.includes('energy') || desc.includes('meter') || desc.includes('power') || desc.includes('kwh')) return 'energy_meter_3phase';
    if (desc.includes('fan')) return 'fan_controller';
    if (desc.includes('lock') || desc.includes('fingerprint') || desc.includes('doorlock')) return 'fingerprint_lock';
    if (desc.includes('button') || desc.includes('wireless') || desc.includes('scene') || desc.includes('remote')) return 'button_wireless_1';
    if (desc.includes('plug') || desc.includes('outlet') || desc.includes('socket')) return 'socket';
    if (desc.includes('garage') || desc.includes('gate')) return 'garage_door_opener';
    if (desc.includes('valve') || desc.includes('water')) return 'water_valve';
    if (desc.includes('led') || desc.includes('strip') || desc.includes('rgb')) return 'led_strip';
    if (desc.includes('bulb') || desc.includes('light') || desc.includes('lamp')) return 'bulb_white';
    if (desc.includes('bell') || desc.includes('ding') || desc.includes('chime')) return 'doorbell';
    return null; // Cannot determine
  }
  
  if (pid.startsWith('TS0001')) return 'switch_1gang';
  if (pid.startsWith('TS0002')) return 'switch_2gang';
  if (pid.startsWith('TS0003')) return 'switch_3gang';
  if (pid.startsWith('TS0004') || pid.startsWith('TS0005') || pid.startsWith('TS0006')) return 'switch_4gang';
  if (pid.startsWith('TS0011') || pid.startsWith('TS0012') || pid.startsWith('TS0013') || pid.startsWith('TS0014')) return 'dimmer_wall_1gang';
  if (pid === 'TS0041') return 'button_wireless_1';
  if (pid === 'TS0042') return 'button_wireless_2';
  if (pid === 'TS0043') return 'button_wireless_3';
  if (pid === 'TS0044') return 'button_wireless_4';
  if (pid === 'TS0046') return 'button_wireless_6';
  if (pid.startsWith('TS004')) return 'button_wireless';
  if (pid.startsWith('TS010') || pid.startsWith('TS011') || pid.startsWith('TS012')) return 'socket';
  if (pid.startsWith('TS020')) return 'climate_sensor';
  if (pid.startsWith('TS021')) return 'contact_sensor';
  if (pid.startsWith('TS022')) return 'illuminance_sensor';
  if (pid.startsWith('TS050')) {
    if (desc.includes('rgbw')) return 'bulb_rgbw';
    if (desc.includes('rgb')) return 'bulb_rgb';
    if (desc.includes('cct') || desc.includes('tunable') || desc.includes('ct ') || desc.includes('white')) return 'bulb_tunable_white';
    if (desc.includes('dimm')) return 'bulb_dimmable';
    return 'bulb_white';
  }
  if (pid === 'TS0601') return null; // Handled above
  
  return null;
}

const DRIVER_MAP = {
  'switch_1gang': 'switch_1gang',
  'switch_2gang': 'switch_2gang',
  'switch_3gang': 'switch_3gang',
  'switch_4gang': 'switch_4gang',
  'dimmer_wall_1gang': 'dimmer_wall_1gang',
  'dimmer_dual_channel': 'dimmer_dual_channel',
  'dimmer_3gang': 'dimmer_3gang',
  'bulb_white': 'bulb_white',
  'bulb_dimmable': 'bulb_dimmable',
  'bulb_rgb': 'bulb_rgb',
  'bulb_rgbw': 'bulb_rgbw',
  'bulb_tunable_white': 'bulb_tunable_white',
  'bulb_rgb_led': 'bulb_rgb_led',
  'light_bulb_rgb_rgbw': 'light_bulb_rgb_rgbw',
  'led_strip': 'led_strip',
  'led_strip_advanced': 'led_strip_advanced',
  'led_strip_rgbw': 'led_strip_rgbw',
  'led_controller_rgb': 'led_controller_rgb',
  'led_controller_dimmable': 'led_controller_dimmable',
  'led_controller_cct': 'led_controller_cct',
  'socket': 'socket',
  'plug': 'socket',
  'socket_1gang': 'socket',
  'curtain_motor': 'curtain_motor',
  'curtain_motor_tilt': 'curtain_motor_tilt',
  'curtain_motor_wall': 'curtain_motor_wall',
  'curtain_motor_shutter': 'curtain_motor_shutter',
  'climate_sensor': 'climate_sensor',
  'temphumidsensor': 'climate_sensor',
  'contact_sensor': 'contact_sensor',
  'motion_sensor': 'motion_sensor',
  'vibration_sensor': 'vibration_sensor',
  'illuminance_sensor': 'illuminance_sensor',
  'air_quality_co2': 'air_quality_co2',
  'air_quality_comprehensive': 'air_quality_comprehensive',
  'air_purifier': 'air_purifier',
  'formaldehyde_sensor': 'formaldehyde_sensor',
  'co_sensor': 'co_sensor',
  'gas_sensor': 'gas_sensor',
  'gas_detector': 'gas_detector',
  'smoke_detector': 'smoke_detector',
  'water_valve': 'water_valve',
  'valve': 'water_valve',
  'ir_blaster': 'ir_blaster',
  'ir_remote': 'ir_remote',
  'button_wireless': 'button_wireless',
  'button_wireless_1': 'button_wireless_1',
  'button_wireless_2': 'button_wireless_2',
  'button_wireless_3': 'button_wireless_3',
  'button_wireless_4': 'button_wireless_4',
  'button_wireless_6': 'button_wireless_6',
  'button_wireless_8': 'button_wireless_8',
  'button_wireless_smart': 'button_wireless_smart',
  'button_emergency_sos': 'button_emergency_sos',
  'doorbell': 'doorbell',
  'door_controller': 'door_controller',
  'garage_door': 'garage_door',
  'garage_door_opener': 'garage_door_opener',
  'fingerprint_lock': 'fingerprint_lock',
  'fingerbot': 'fingerbot',
  'din_rail_switch': 'din_rail_switch',
  'din_rail_meter': 'din_rail_meter',
  'energy_meter_3phase': 'energy_meter_3phase',
  'fan_controller': 'fan_controller',
  'ceiling_fan': 'ceiling_fan',
  'humidifier': 'humidifier',
  'hvac_air_conditioner': 'hvac_air_conditioner',
  'hvac_controller': 'hvac_controller',
  'hvac_dehumidifier': 'hvac_dehumidifier',
  'floor_heating_thermostat': 'floor_heating_thermostat',
  'device_radiator_valve_smart': 'device_radiator_valve_smart',
  'device_floor_heating_thermostat': 'device_floor_heating_thermostat',
  'device_generic_tuya_universal': 'device_generic_tuya_universal',
  'diy_custom_zigbee': 'diy_custom_zigbee',
  'generic_diy': 'generic_diy',
  'generic_tuya': 'generic_tuya',
  'gateway_zigbee_bridge': 'gateway_zigbee_bridge',
  'light_sensor_outdoor': 'light_sensor_outdoor',
  'lcdtemphumidsensor': 'lcdtemphumidsensor',
  'handheld_remote_4_buttons': 'handheld_remote_4_buttons',
  'plug': 'socket',
  'water_valve_smart': 'water_valve',
  'radiator_valve': 'device_radiator_valve_smart',
  'presence_sensor_radar': 'presence_sensor_radar'
};

const driversDir = './drivers';
const actualDrivers = new Set(
  fs.readdirSync(driversDir).filter(d => fs.statSync(path.join(driversDir, d)).isDirectory())
);

let mappedCount = 0;
let appliedCount = 0;

const driverFps = {};

enrichedFps.forEach(f => {
  let targetDriver = null;
  if (f.driver) {
    targetDriver = DRIVER_MAP[f.driver];
  } else {
    targetDriver = suggestDriverByProductId(f.productId, f.description);
  }
  
  if (targetDriver && actualDrivers.has(targetDriver)) {
    if (!driverFps[targetDriver]) driverFps[targetDriver] = [];
    driverFps[targetDriver].push(f);
    mappedCount++;
  }
});

console.log(`Mapped ${mappedCount} fingerprints to drivers.`);

Object.keys(driverFps).forEach(driverName => {
  const fps = driverFps[driverName];
  const composePath = path.join(driversDir, driverName, 'driver.compose.json');
  
  if (!fs.existsSync(composePath)) return;
  
  let compose = JSON.parse(fs.readFileSync(composePath, 'utf8'));
  if (!compose.zigbee) compose.zigbee = {};
  if (!compose.zigbee.fingerprints) compose.zigbee.fingerprints = [];
  
  const existingFps = compose.zigbee.fingerprints;
  const existingMfrs = new Set(existingFps.map(fp => (fp.manufacturerName || '').toLowerCase()));
  
  let added = 0;
  fps.forEach(f => {
    if (!f.mfr) return;
    const mfrLower = f.mfr.toLowerCase();
    if (!existingMfrs.has(mfrLower)) {
      existingFps.push({
        manufacturerName: f.mfr,
        productId: f.productId || 'TS0601'
      });
      existingMfrs.add(mfrLower);
      added++;
      appliedCount++;
    }
  });
  
  if (added > 0) {
    compose.zigbee.fingerprints = existingFps;
    fs.writeFileSync(composePath, JSON.stringify(compose, null, 2) + '\n');
    console.log(`  UPDATED ${driverName}: added ${added} new fingerprints.`);
  } else {
    console.log(`  UNCHANGED ${driverName}: all fingerprints already present.`);
  }
});

console.log(`\nApplied ${appliedCount} new fingerprints to driver.compose.json files.`);
