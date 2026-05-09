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
    if (desc.includes('radar') || desc.includes('presence') || desc.includes('mmwave') || desc.includes('human')) return 'motion_sensor';
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
  if (pid === 'TS0601') return null; // Need description context, handled above
  
  return null; // Cannot determine
}

// Map inferred driver names to actual driver folder names
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
  // Fix unmapped names from enriched data
  'plug': 'socket',
  'water_valve_smart': 'water_valve',
  'radiator_valve': 'device_radiator_valve_smart',
};

// Get list of actual driver directories
const driversDir = './drivers';
const actualDrivers = new Set(
  fs.readdirSync(driversDir).filter(d => fs.statSync(path.join(driversDir, d)).isDirectory())
);

// Analyze enrichedFps
let stats = {
  total: enrichedFps.length,
  withDriver: 0,
  withNullDriver: 0,
  driverMapped: 0,
  driverNotFound: 0,
  unmappedDrivers: new Set(),
  byDriver: {},
  nullDrivers: []
};

enrichedFps.forEach(f => {
  if (!f.driver) {
    // Try heuristic mapping for null-driver fingerprints
    const suggested = suggestDriverByProductId(f.productId, f.description);
    if (suggested && actualDrivers.has(suggested)) {
      stats.heuristicMapped = (stats.heuristicMapped || 0) + 1;
      if (!stats.byDriver[suggested]) stats.byDriver[suggested] = [];
      stats.byDriver[suggested].push(f);
      return;
    }
    stats.withNullDriver++;
    stats.nullDrivers.push(f);
  } else {
    stats.withDriver++;
    const actualDriver = DRIVER_MAP[f.driver];
    if (actualDriver && actualDrivers.has(actualDriver)) {
      stats.driverMapped++;
      if (!stats.byDriver[actualDriver]) stats.byDriver[actualDriver] = [];
      stats.byDriver[actualDriver].push(f);
    } else {
      stats.driverNotFound++;
      stats.unmappedDrivers.add(f.driver);
    }
  }
});

console.log('\n=== Statistics ===');
console.log('Total:', stats.total);
console.log('With driver assigned:', stats.withDriver);
console.log('With null driver:', stats.withNullDriver);
console.log('Heuristic mapped (null driver):', stats.heuristicMapped || 0);
console.log('Successfully mapped to actual driver:', stats.driverMapped);
console.log('Driver not found/mapped:', stats.driverNotFound);
console.log('Unmapped driver names:', Array.from(stats.unmappedDrivers));

console.log('\n=== Distribution by driver ===');
Object.keys(stats.byDriver).sort().forEach(d => {
  console.log(`  ${d}: ${stats.byDriver[d].length} FPs`);
});

// Now apply the fingerprints: update driver.compose.json for each driver
// that has new fingerprints to add
console.log('\n=== Applying fingerprints ===');

Object.keys(stats.byDriver).forEach(driverName => {
  const fps = stats.byDriver[driverName];
  const composePath = path.join(driversDir, driverName, 'driver.compose.json');
  
  if (!fs.existsSync(composePath)) {
    console.log(`  SKIP ${driverName}: compose.json not found`);
    return;
  }
  
  let compose;
  try {
    compose = JSON.parse(fs.readFileSync(composePath, 'utf8'));
  } catch (e) {
    console.log(`  ERROR ${driverName}: parse failed - ${e.message}`);
    return;
  }
  
  if (!compose.zigbee) {
    compose.zigbee = {};
  }
  
  // Get existing fingerprints
  let existingMfrs = Array.isArray(compose.zigbee.manufacturerName) 
    ? compose.zigbee.manufacturerName 
    : (compose.zigbee.manufacturerName ? [compose.zigbee.manufacturerName] : []);
  let existingPids = Array.isArray(compose.zigbee.productId) 
    ? compose.zigbee.productId 
    : (compose.zigbee.productId ? [compose.zigbee.productId] : []);
  
  // Normalize case for comparison
  const existingMfrsLower = existingMfrs.map(m => (m || '').toLowerCase());
  const existingPidsLower = existingPids.map(p => (p || '').toLowerCase());
  
  let addedMfrs = 0;
  let addedPids = 0;
  
  fps.forEach(f => {
    const mfrLower = (f.mfr || '').toLowerCase();
    const pidUpper = (f.productId || '').toUpperCase();
    
    // Add manufacturer if not present
    if (mfrLower && !existingMfrsLower.includes(mfrLower)) {
      existingMfrs.push(f.mfr);
      existingMfrsLower.push(mfrLower);
      addedMfrs++;
    }
    
    // Add productId if not present and not null
    if (pidUpper && pidUpper !== 'NULL' && pidUpper !== '') {
      if (!existingPidsLower.includes(pidUpper.toLowerCase())) {
        existingPids.push(f.productId);
        existingPidsLower.push(pidUpper.toLowerCase());
        addedPids++;
      }
    }
  });
  
  // Update compose
  compose.zigbee.manufacturerName = existingMfrs;
  compose.zigbee.productId = existingPids;
  
  // Write back
  fs.writeFileSync(composePath, JSON.stringify(compose, null, 2) + '\n');
  
  if (addedMfrs > 0 || addedPids > 0) {
    console.log(`  UPDATED ${driverName}: +${addedMfrs} mfrs, +${addedPids} pids (total: ${existingMfrs.length} mfrs, ${existingPids.length} pids)`);
  } else {
    console.log(`  UNCHANGED ${driverName}: all FPs already present`);
  }
});

// Also generate a report of the changes
const summary = {
  ts: new Date().toISOString(),
  stats: {
    totalEnriched: stats.total,
    withDriverAssigned: stats.withDriver,
    withNullDriver: stats.withNullDriver,
    successfullyMapped: stats.driverMapped,
    driverNotFound: stats.driverNotFound,
    unmappedDriverNames: Array.from(stats.unmappedDrivers)
  },
  appliedByDriver: {}
};

Object.keys(stats.byDriver).forEach(d => {
  summary.appliedByDriver[d] = {
    count: stats.byDriver[d].length,
    sampleMfrs: stats.byDriver[d].slice(0, 5).map(f => f.mfr)
  };
});

fs.writeFileSync('./enriched_missing_fps_final.json', JSON.stringify(summary, null, 2));
console.log('\nSaved final report to enriched_missing_fps_final.json');