const fs = require('fs');
const path = require('path');
const d = 'drivers';
const issues = [];

// Audit dimmer drivers for genLevelCtrl handling
['dimmer_1gang','dimmer_2gang','dimmer_zigbee'].forEach(dr => {
  const f = path.join(d, dr, 'device.js');
  if (!fs.existsSync(f)) return;
  const c = fs.readFileSync(f, 'utf8');
  const hasLevel = c.includes('genLevelCtrl') || c.includes('levelControl');
  const hasDim = c.includes("'dim'") || c.includes('"dim"');
  const hasOnOff = c.includes('genOnOff') || c.includes('onOff');
  console.log(dr + ': genLevelCtrl=' + hasLevel + ' dim=' + hasDim + ' genOnOff=' + hasOnOff);
  if (!hasLevel && !c.includes('dpMappings')) {
    issues.push(dr + ': NO genLevelCtrl AND no dpMappings');
  }
});

// Audit cover drivers for position handling
['cover_curtain','cover_roller','curtain_motor','curtain_motor_tilt'].forEach(dr => {
  const f = path.join(d, dr, 'device.js');
  if (!fs.existsSync(f)) return;
  const c = fs.readFileSync(f, 'utf8');
  const hasPosition = c.includes('windowcoverings_set') || c.includes('dim');
  const hasState = c.includes('windowcoverings_state');
  const hasCover = c.includes('windowCovering') || c.includes('closuresWindowCovering');
  console.log(dr + ': position=' + hasPosition + ' state=' + hasState + ' coverCluster=' + hasCover);
  if (!hasPosition && !hasState) {
    issues.push(dr + ': NO position or state capability');
  }
});

if (issues.length > 0) {
  console.log('\nIssues:');
  issues.forEach(i => console.log('  ' + i));
} else {
  console.log('\nAll dimmer/cover drivers OK');
}
