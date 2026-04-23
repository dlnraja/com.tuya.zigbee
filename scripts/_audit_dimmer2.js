const { CLUSTERS } = require('../lib/constants/ZigbeeConstants.js');
const fs = require('fs');
const path = require('path');
const d = 'drivers';
const issues = [];
const dimmers = ['dimmer_3gang','dimmer_dual_channel','dimmer_wall_1gang','switch_dimmer_1gang','wall_dimmer_1gang_1way','remote_dimmer'];
const covers = ['curtain_motor','curtain_motor_tilt','shutter_roller_controller','wall_curtain_switch'];

dimmers.forEach(dr => {
  const f = path.join(d, dr, 'device.js');
  if (!fs.existsSync(f)) { console.log(dr + ': device.js NOT FOUND'); return; }
  const c = fs.readFileSync(f, 'utf8');
  const hasLevel = c.includes('genLevelCtrl') || c.includes('levelControl');
  const hasDim = c.includes("'dim'") || c.includes('"dim"');
  const hasDP = c.match(/get dpMappings/);
  const hasTuya = c.includes('EF00') || c.includes(CLUSTERS.TUYA_EF00) || c.includes('tuya');
  console.log('[DIMMER] ' + dr + ': ZCL-level=' + hasLevel + ' dim-cap=' + hasDim + ' dpMappings=' + !!hasDP + ' tuya=' + hasTuya);
  
  // Check for duplicate DPs
  if (hasDP) {
    const dpMatch = c.match(/get dpMappings\(\)\s*\{[\s\S]*?return\s*\{([\s\S]*?)\} ;/);
    if (dpMatch) {
      const dpBlock = dpMatch[1];
      const dpKeys = [];
      const dpRegex = /^\s*(\d+)\s*:/gm;
      let m;
      while ((m = dpRegex.exec(dpBlock)) !== null) {
        const dp = parseInt(m[1]);
        if (dpKeys.includes(dp)) issues.push(dr + ': DUPLICATE DP ' + dp);
        dpKeys.push(dp);
      }
      console.log('  DPs: ' + dpKeys.join(','));
    }
  }
});

covers.forEach(dr => {
  const f = path.join(d, dr, 'device.js');
  if (!fs.existsSync(f)) { console.log(dr + ': device.js NOT FOUND'); return; }
  const c = fs.readFileSync(f, 'utf8');
  const hasPosition = c.includes('windowcoverings_set') || c.includes('dim');
  const hasState = c.includes('windowcoverings_state');
  const hasDP = c.match(/get dpMappings/);
  console.log('[COVER] ' + dr + ': position=' + hasPosition + ' state=' + hasState + ' dpMappings=' + !!hasDP);
  
  if (hasDP) {
    const dpMatch = c.match(/get dpMappings\(\)\s*\{[\s\S]*?return\s*\{([\s\S]*?)\} ;/);
    if (dpMatch) {
      const dpBlock = dpMatch[1];
      const dpKeys = [];
      const dpRegex = /^\s*(\d+)\s*:/gm;
      let m;
      while ((m = dpRegex.exec(dpBlock)) !== null) {
        const dp = parseInt(m[1]);
        if (dpKeys.includes(dp)) issues.push(dr + ': DUPLICATE DP ' + dp);
        dpKeys.push(dp);
      }
      console.log('  DPs: ' + dpKeys.join(','));
    }
  }
});

if (issues.length > 0) { console.log('\nISSUES:'); issues.forEach(i => console.log('  ' + i)); }
else console.log('\nAll dimmer/cover drivers clean.');
