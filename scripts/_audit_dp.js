const fs = require('fs');
const path = require('path');
const d = 'drivers';
const issues = [];

// Audit DP mappings in device.js files
fs.readdirSync(d).forEach(dr => {
  const f = path.join(d, dr, 'device.js');
  if (!fs.existsSync(f)) return;
  const c = fs.readFileSync(f, 'utf8');
  
  // Check for duplicate DP keys in dpMappings
  const dpMatch = c.match(/get dpMappings\(\)\s*\{[\s\S]*?return\s*\{([\s\S]*?)\} ;/);
  if (dpMatch) {
    const dpBlock = dpMatch[1];
    const dpKeys = [];
    const dpRegex = /^\s*(\d+)\s*:/gm;
    let m;
    while ((m = dpRegex.exec(dpBlock)) !== null) {
      const dp = parseInt(m[1]);
      if (dpKeys.includes(dp)) {
        issues.push({ driver: dr, issue: 'DUPLICATE DP key: ' + dp, severity: 'CRITICAL' });
      }
      dpKeys.push(dp);
    }
  }
  
  // Check for missing divisor in temperature DPs (common bug)
  if (c.includes('measure_temperature') && c.includes('dpMappings')) {
    const tempDPs = c.match(/\d+:\s*\{[^}]*measure_temperature[^}]*\}/g) || [];
    tempDPs.forEach(dp => {
      if (!dp.includes('divisor') && !dp.includes('transform') && !dp.includes('divideBy')) {
        issues.push({ driver: dr, issue: 'measure_temperature without divisor/transform', severity: 'WARNING' });
      }
    });
  }
  
  // Check for battery on mains-powered devices
  if (c.includes('mainsPowered') && c.includes('return true') && c.includes('measure_battery')) {
    if (!c.includes('removeCapability')) {
      issues.push({ driver: dr, issue: 'mainsPowered=true but measure_battery not removed', severity: 'WARNING' });
    }
  }
});

// Sort by severity
issues.sort((a, b) => a.severity === 'CRITICAL' ? -1 : 1)      ;
console.log('=== DP AUDIT RESULTS ===');
console.log('Total issues: ' + issues.length);
issues.forEach(i => console.log('  [' + i.severity + '] ' + i.driver + ': ' + i.issue));
