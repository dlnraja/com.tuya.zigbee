const fs = require('fs');
const file = 'drivers/presence_sensor_radar/driver.compose.json';
let content = JSON.parse(fs.readFileSync(file, 'utf8'));

// Issue #174 fix: Add ZG-204ZE to manufacturerName if missing
if (!content.zigbee.manufacturerName.includes("ZG-204ZE")) {
  content.zigbee.manufacturerName.push("ZG-204ZE");
  fs.writeFileSync(file, JSON.stringify(content, null, 2));
  console.log(' Added ZG-204ZE to manufacturerName in presence_sensor_radar');
} else {
  console.log('ZG-204ZE already in manufacturerName');
}

// Ensure CK-BL702-MWS-01(7016) is in productId
if (!content.zigbee.productId.includes("CK-BL702-MWS-01(7016)")) {
  content.zigbee.productId.push("CK-BL702-MWS-01(7016)");
  fs.writeFileSync(file, JSON.stringify(content, null, 2));
  console.log(' Added CK-BL702-MWS-01(7016) to productId in presence_sensor_radar');
} else {
  console.log('CK-BL702-MWS-01(7016) already in productId');
}
