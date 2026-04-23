const fs = require('fs');
const path = require('path');
['climate_sensor','gas_sensor','smoke_detector_advanced','soil_sensor'].forEach(dr => {
  const f = path.join('drivers', dr, 'device.js');
  const c = fs.readFileSync(f, 'utf8');
  const hasMains = c.includes('mainsPowered') && c.includes('return true');
  const hasRemove = c.includes("removeCapability('measure_battery')") || c.includes('removeCapability("measure_battery")');
  const hasConditionalMains = c.includes('get mainsPowered()');
  // Check if mainsPowered is conditional (returns true only for some models)
  const mainMatch = c.match(/get mainsPowered\(\)\s*\{([^}]+)\}/);
  const mainBody = mainMatch ? mainMatch[1].trim() : ''      ;
  console.log(dr + ':');
  console.log('  mainsPowered body: ' + mainBody.substring(0, 120));
  console.log('  hasRemoveCapability: ' + hasRemove);
  console.log('  measure_battery in capabilities: ' + c.includes('measure_battery'));
});
