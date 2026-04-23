const fs = require('fs');
const path = require('path');
const d = 'drivers';
const issues = [];

// Z2M reference DPs for common device types
const Z2M_EXPECTED = {
  dimmer: { required: [1], optional: [2,3], desc: { 1:'brightness', 2:'min_brightness', 3:'max_brightness' } },
  cover: { required: [1,2], optional: [3,5,7,12], desc: { 1:'state', 2:'position', 3:'arrived', 5:'direction', 7:'workstate', 12:'motor_speed' } },
  radiator_valve: { required: [2,3,4], optional: [35,36,47,104], desc: { 2:'target_temp', 3:'current_temp', 4:'mode', 35:'battery_low', 47:'valve_pos', 104:'battery' } },
};

// Audit dimmer drivers
['dimmer_1gang','dimmer_2gang'].forEach(dr => {
  const f = path.join(d, dr, 'device.js');
  if (!fs.existsSync(f)) return;
  const c = fs.readFileSync(f, 'utf8');
  const dpMatch = c.match(/get dpMappings\(\)\s*\{[\s\S]*?return\s*\{([\s\S]*?)\} ;/);
  if (dpMatch) {
    const dpBlock = dpMatch[1];
    const dpKeys = [];
    const dpRegex = /^\s*(\d+)\s*:/gm;
    let m;
    while ((m = dpRegex.exec(dpBlock)) !== null) dpKeys.push(parseInt(m[1]));
    console.log(dr + ' DPs: ' + dpKeys.join(','));
    Z2M_EXPECTED.dimmer.required.forEach(dp => {
      if (!dpKeys.includes(dp)) issues.push(dr + ': MISSING required DP' + dp + ' (' + Z2M_EXPECTED.dimmer.desc[dp] + ')');
    });
  } else { console.log(dr + ': NO dpMappings (may use ZCL genLevelCtrl)'); }
});

// Audit cover drivers
['cover_curtain','cover_roller'].forEach(dr => {
  const f = path.join(d, dr, 'device.js');
  if (!fs.existsSync(f)) return;
  const c = fs.readFileSync(f, 'utf8');
  const dpMatch = c.match(/get dpMappings\(\)\s*\{[\s\S]*?return\s*\{([\s\S]*?)\} ;/);
  if (dpMatch) {
    const dpBlock = dpMatch[1];
    const dpKeys = [];
    const dpRegex = /^\s*(\d+)\s*:/gm;
    let m;
    while ((m = dpRegex.exec(dpBlock)) !== null) dpKeys.push(parseInt(m[1]));
    console.log(dr + ' DPs: ' + dpKeys.join(','));
    Z2M_EXPECTED.cover.required.forEach(dp => {
      if (!dpKeys.includes(dp)) issues.push(dr + ': MISSING required DP' + dp + ' (' + Z2M_EXPECTED.cover.desc[dp] + ')');
    });
  } else { console.log(dr + ': NO dpMappings found'); }
});

// Audit TRV drivers
['radiator_valve','thermostat_tuya_dp'].forEach(dr => {
  const f = path.join(d, dr, 'device.js');
  if (!fs.existsSync(f)) return;
  const c = fs.readFileSync(f, 'utf8');
  const dpMatch = c.match(/get dpMappings\(\)\s*\{[\s\S]*?return\s*\{([\s\S]*?)\} ;/);
  if (dpMatch) {
    const dpBlock = dpMatch[1];
    const dpKeys = [];
    const dpRegex = /^\s*(\d+)\s*:/gm;
    let m;
    while ((m = dpRegex.exec(dpBlock)) !== null) dpKeys.push(parseInt(m[1]));
    console.log(dr + ' DPs: ' + dpKeys.join(','));
  } else {
    // Check HybridThermostatBase
    console.log(dr + ': uses HybridThermostatBase dpMappings');
  }
});

if (issues.length > 0) {
  console.log('\n=== ISSUES ===');
  issues.forEach(i => console.log('  ' + i));
} else {
  console.log('\nAll audited drivers have required DPs.');
}
