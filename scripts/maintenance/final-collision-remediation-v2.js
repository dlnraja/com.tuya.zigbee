const fs = require('fs');
const path = require('path');

const cleanups = [
  {
    driver: 'drivers/button_wireless_2/driver.compose.json',
    remove: [
      '_TZ3000_typdpbpg', '_TZ3000_typdpdpg', '_TZ3000_w8jwkczz'
    ]
  },
  {
    driver: 'drivers/button_wireless_plug_hybrid/driver.compose.json',
    remove: ['_TZ3000_ew31dmgx']
  }
];

function cleanDriver(driverPath, removeList) {
  if (!fs.existsSync(driverPath)) return;
  const content = fs.readFileSync(driverPath, 'utf8');
  let compose = JSON.parse(content);
  
  if (compose.zigbee && compose.zigbee.manufacturerName) {
    const originalCount = compose.zigbee.manufacturerName.length;
    const lowerRemove = removeList.map(r => r.toLowerCase());
    
    compose.zigbee.manufacturerName = compose.zigbee.manufacturerName.filter(m => {
      return !lowerRemove.includes(m.toLowerCase());
    });
    
    const newCount = compose.zigbee.manufacturerName.length;
    if (originalCount !== newCount) {
      console.log(`Cleaned ${driverPath}: ${originalCount} -> ${newCount}`);
      fs.writeFileSync(driverPath, JSON.stringify(compose, null, 2) + '\n');
    }
  }
}

cleanups.forEach(c => cleanDriver(c.driver, c.remove));
console.log('Final collision remediation complete.');
