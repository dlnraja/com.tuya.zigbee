const { CLUSTERS } = require('../../lib/constants/ZigbeeConstants.js');
const fs = require('fs');
const file = 'drivers/soil_sensor/device.js';
let content = fs.readFileSync(file, 'utf8');

// The issue is "No connection possible" -> this typically happens during the initial Homey Zigbee pairing when binding fails or endpoints are strictly checked and don't match.
// For _TZE284_oitavov2, it is a pure DP device (cluster CLUSTERS.TUYA_EF00).
// Check what endpoints / clusters we are asking for in driver.compose.json and device.js.

if (content.includes('this.registerCapabilityListener')) {
  console.log('Has capability listeners');
}

if (content.includes('super.onNodeInit')) {
  console.log('Has super.onNodeInit');
}
