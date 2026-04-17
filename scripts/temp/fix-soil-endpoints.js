const { CLUSTERS } = require('../../lib/constants/ZigbeeConstants.js');
const fs = require('fs');
const file = 'drivers/soil_sensor/driver.compose.json';
let content = fs.readFileSync(file, 'utf8');
const data = JSON.parse(content);

// For Tuya DP devices (_TZE284), enforcing cluster 6 (On/Off) in endpoints can block pairing if the device doesn't expose it.
// According to the diagnostic log in issue 178:
// The device has basic cluster (0) and Tuya DP cluster (CLUSTERS.TUYA_EF00 / CLUSTERS.TUYA_EF00).
// Let's remove the strict `endpoints` definition to allow generic pairing.

delete data.zigbee.endpoints;

fs.writeFileSync(file, JSON.stringify(data, null, 2));
console.log('✅ Removed strict endpoints definition from soil_sensor driver to fix pairing issues (Issue #178)');
