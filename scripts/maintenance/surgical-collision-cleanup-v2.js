const fs = require('fs');
const path = require('path');

const cleanups = [
  {
    driver: 'drivers/button_wireless_plug_hybrid/driver.compose.json',
    remove: ['_TZ3000_EW31DMGX']
  },
  {
    driver: 'drivers/plug_smart/driver.compose.json',
    remove: ['_TZ3000_PNZFDR9Y', '_TZ3000_BR3LAUKF']
  },
  {
    driver: 'drivers/switch_2gang/driver.compose.json',
    remove: ['_TZ3000_CAUQ1OKQ']
  }
];

for (const cleanup of cleanups) {
  if (fs.existsSync(cleanup.driver)) {
    const compose = JSON.parse(fs.readFileSync(cleanup.driver, 'utf8'));
    if (compose.zigbee && compose.zigbee.manufacturerName) {
      const originalCount = compose.zigbee.manufacturerName.length;
      compose.zigbee.manufacturerName = compose.zigbee.manufacturerName.filter(m => !cleanup.remove.includes(m));
      const newCount = compose.zigbee.manufacturerName.length;
      console.log(`Cleaned ${cleanup.driver}: ${originalCount} -> ${newCount}`);
      fs.writeFileSync(cleanup.driver, JSON.stringify(compose, null, 2) + '\n');
    }
  }
}
