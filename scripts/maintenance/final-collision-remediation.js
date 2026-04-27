const fs = require('fs');
const path = require('path');

const cleanups = [
  {
    driver: 'drivers/button_wireless_2/driver.compose.json',
    remove: [
      '_TZ3000_1obwwnmq', '_TZ3000_3ooaz3ng', '_TZ3000_amdymr7l', '_TZ3000_cphmq0q7',
      '_TZ3000_g5xawfcq', '_TZ3000_kdi2o9m6', '_TZ3000_rdtixbnu', '_TZ3000_vzopcetz',
      '_TZ3000_w0qqde0g', '_TZ3000_wamqdr3f', '_TZ3000_ysdv91bk', '_TZ3000_tydpdpdpg'
    ]
  },
  {
    driver: 'drivers/switch_4gang/driver.compose.json',
    remove: ['_TZ3000_mmkbptmx'] // Collides with switch_1gang
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
console.log('Collision remediation complete.');
