const fs = require('fs');
const path = require('path');

// 1. Load Z2M fingerprints from community-sync report
const report = JSON.parse(fs.readFileSync('./data/community-sync/report.json', 'utf8'));
const z2mFps = report.src.z2m.fingerprints || [];
console.log('Z2M fingerprints loaded:', z2mFps.length);

// 2. Load github issues fingerprints
const ghIssues = report.src.gh?.missingFps || [];
console.log('GitHub missing FPs:', ghIssues.length);

// 3. Scan all driver.compose.json for existing fingerprints
const driversDir = './drivers';
const drivers = fs.readdirSync(driversDir).filter(d => 
  fs.statSync(path.join(driversDir, d)).isDirectory()
);

let existingFps = [];
drivers.forEach(driver => {
  const composePath = path.join(driversDir, driver, 'driver.compose.json');
  if (fs.existsSync(composePath)) {
    const compose = JSON.parse(fs.readFileSync(composePath, 'utf8'));
    const zigbee = compose.zigbee;
    if (zigbee && zigbee.manufacturerName && zigbee.productId) {
      const mfrs = Array.isArray(zigbee.manufacturerName) ? zigbee.manufacturerName : [zigbee.manufacturerName];
      const pids = Array.isArray(zigbee.productId) ? zigbee.productId : [zigbee.productId];
      mfrs.forEach(mfr => {
        pids.forEach(pid => {
          existingFps.push({ mfr, productId: pid, driver });
        });
      });
    }
  }
});
console.log('Existing fingerprints in drivers:', existingFps.length);

// 4. Cross-reference Z2M
const existingKeySet = new Set(existingFps.map(f => f.mfr + '|' + f.productId));
const z2mMissing = z2mFps.filter(f => !existingKeySet.has(f.mfr + '|' + f.productId));
const z2mMatched = z2mFps.filter(f => existingKeySet.has(f.mfr + '|' + f.productId));
console.log('Z2M Missing:', z2mMissing.length);
console.log('Z2M Matched:', z2mMatched.length);

// 5. Cross-reference GitHub
const ghMissing = ghIssues.filter(f => !existingKeySet.has(f.mfr + '|' + f.productId));
const ghMatched = ghIssues.filter(f => existingKeySet.has(f.mfr + '|' + f.productId));
console.log('GitHub Missing:', ghMissing.length);
console.log('GitHub Matched:', ghMatched.length);

// 6. Build enriched data: for each missing FP, suggest driver based on productId
function suggestDriverByProductId(productId, description) {
  const desc = (description || '').toLowerCase();
  const pid = (productId || '').toUpperCase();
  
  // TS0601 = Tuya DP device - need to check description
  if (pid === 'TS0601') {
    if (desc.includes('temp') || desc.includes('humid') || desc.includes('climate')) return 'climate_sensor';
    if (desc.includes('air') || desc.includes('quality') || desc.includes('co2') || desc.includes('voc') || desc.includes('pm2.5') || desc.includes('hcho') || desc.includes('formal')) return 'air_quality_comprehensive';
    if (desc.includes('purif')) return 'air_purifier';
    if (desc.includes('soil') || desc.includes('moist')) return 'soil_sensor';
    if (desc.includes('radar') || desc.includes('presence') || desc.includes('mmwave')) return 'presence_sensor_radar';
    if (desc.includes('curtain') || desc.includes('blind') || desc.includes('shade') || desc.includes('motor') || desc.includes('tubular')) return 'curtain_motor';
    if (desc.includes('trv') || desc.includes('radiator') || desc.includes('thermo')) return 'device_radiator_valve_smart';
    if (desc.includes('heating') || desc.includes('floor')) return 'floor_heating_thermostat';
    if (desc.includes('switch') || desc.includes('relay') || desc.includes('gang')) return 'switch_1gang';
    if (desc.includes('dimmer')) return 'dimmer_wall_1gang';
    if (desc.includes('cover') || desc.includes('shutter')) return 'curtain_motor';
    if (desc.includes('ir') || desc.includes('blaster') || desc.includes('remote')) return 'ir_blaster';
    if (desc.includes('door') || desc.includes('contact') || desc.includes('magnet')) return 'contact_sensor';
    if (desc.includes('motion') || desc.includes('pump') || desc.includes('vibration')) return 'vibration_sensor';
    if (desc.includes('smoke') || desc.includes('fire')) return 'smoke_detector';
    if (desc.includes('gas') || desc.includes('leak') || desc.includes('co ')) return 'gas_detector';
    if (desc.includes('light') || desc.includes('lux') || desc.includes('illumin')) return 'illuminance_sensor';
    if (desc.includes('energy') || desc.includes('meter') || desc.includes('power')) return 'energy_meter_3phase';
    if (desc.includes('fan')) return 'fan_controller';
    if (desc.includes('lock') || desc.includes('fingerprint')) return 'fingerprint_lock';
    if (desc.includes('button') || desc.includes('wireless') || desc.includes('scene')) return 'button_wireless_1';
    if (desc.includes('plug') || desc.includes('outlet') || desc.includes('socket')) return 'socket';
    if (desc.includes('garage') || desc.includes('gate')) return 'garage_door_opener';
    if (desc.includes('valve') || desc.includes('water')) return 'water_valve';
    if (desc.includes('led') || desc.includes('strip') || desc.includes('rgb')) return 'led_strip';
    return 'generic_tuya';
  }
  
  // By productId patterns
  if (pid.startsWith('TS0001')) return 'switch_1gang';
  if (pid.startsWith('TS0002')) return 'switch_2gang';
  if (pid.startsWith('TS0003')) return 'switch_3gang';
  if (pid.startsWith('TS0004') || pid.startsWith('TS0005') || pid.startsWith('TS0006')) return 'switch_4gang';
  if (pid.startsWith('TS001')) return 'dimmer_wall_1gang';  // TS0011-TS0014
  if (pid.startsWith('TS004')) {
    if (pid === 'TS0041') return 'button_wireless_1';
    if (pid === 'TS0042') return 'button_wireless_2';
    if (pid === 'TS0043') return 'button_wireless_3';
    if (pid === 'TS0044') return 'button_wireless_4';
    if (pid === 'TS0046') return 'button_wireless_6';
    return 'button_wireless';
  }
  if (pid.startsWith('TS010') || pid.startsWith('TS011') || pid.startsWith('TS012')) return 'socket';
  if (pid.startsWith('TS020')) return 'climate_sensor';  // Sensors
  if (pid.startsWith('TS021')) return 'contact_sensor';
  if (pid.startsWith('TS022')) return 'illuminance_sensor';
  if (pid.startsWith('TS050')) {
    if (desc.includes('rgbw')) return 'bulb_rgbw';
    if (desc.includes('rgb')) return 'bulb_rgb';
    if (desc.includes('cct') || desc.includes('tunable')) return 'bulb_tunable_white';
    if (desc.includes('dimm')) return 'bulb_dimmable';
    return 'bulb_white';
  }
  if (pid.startsWith('TS0601')) return 'generic_tuya';  // already handled above
  
  return 'generic_tuya';  // fallback
}

// 7. Merge all missing (Z2M + GitHub) and deduplicate
const allMissingMap = new Map();
const processFps = (list, source) => {
  list.forEach(f => {
    const key = f.mfr + '|' + f.productId;
    if (!existingKeySet.has(key) && !allMissingMap.has(key)) {
      allMissingMap.set(key, {
        mfr: f.mfr,
        productId: f.productId,
        model: f.model || '',
        description: f.description || '',
        vendor: f.vendor || '',
        sources: [source],
        suggestedDriver: suggestDriverByProductId(f.productId, f.description || '')
      });
    } else if (allMissingMap.has(key)) {
      allMissingMap.get(key).sources.push(source);
    }
  });
};

processFps(z2mMissing, 'Z2M');
processFps(ghMissing, 'GitHub');

const allMissing = Array.from(allMissingMap.values());
console.log('Total unique missing FPs:', allMissing.length);

// 8. Group by suggested driver
const driverGroups = {};
allMissing.forEach(f => {
  const d = f.suggestedDriver;
  if (!driverGroups[d]) driverGroups[d] = [];
  driverGroups[d].push(f);
});

console.log('\nMissing FPs by suggested driver:');
Object.keys(driverGroups).sort().forEach(d => {
  console.log(`  ${d}: ${driverGroups[d].length} FPs`);
});

// 9. Save results
fs.writeFileSync('./enriched_missing_fps_final.json', JSON.stringify({
  ts: new Date().toISOString(),
  summary: {
    totalDrivers: drivers.length,
    existingFps: existingFps.length,
    z2mTotal: z2mFps.length,
    z2mMatched: z2mMatched.length,
    z2mMissing: z2mMissing.length,
    ghTotal: ghIssues.length,
    ghMatched: ghMatched.length,
    ghMissing: ghMissing.length,
    totalUniqueMissing: allMissing.length
  },
  missingByDriver: driverGroups,
  allMissing
}, null, 2));
console.log('\nSaved enriched_missing_fps_final.json');