const fs = require('fs');
const path = require('path');

const ROOT = 'C:\\Users\\HP\\Desktop\\homey app\\tuya_repair';
const d1 = JSON.parse(fs.readFileSync(path.join(ROOT, 'drivers', 'bulb_dimmable', 'driver.compose.json'), 'utf8'));
const d2 = JSON.parse(fs.readFileSync(path.join(ROOT, 'drivers', 'dimmer_dual_channel', 'driver.compose.json'), 'utf8'));

console.log("bulb_dimmable mfrs:", d1.zigbee.manufacturerName.includes('_tz3210_4ubylghk') || d1.zigbee.manufacturerName.includes('_TZ3210_4ubylghk'));
console.log("bulb_dimmable pids:", d1.zigbee.productId.includes('TS1101'));

console.log("dimmer_dual_channel mfrs:", d2.zigbee.manufacturerName.includes('_tz3210_4ubylghk') || d2.zigbee.manufacturerName.includes('_TZ3210_4ubylghk'));
console.log("dimmer_dual_channel pids:", d2.zigbee.productId.includes('TS1101'));
