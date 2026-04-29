const fs = require('fs');
const path = require('path');
const appJsonPath = path.join(process.cwd(), 'app.json');
const appJson = JSON.parse(fs.readFileSync(appJsonPath, 'utf8'));

const fixups = {
  "wall_remote_3_gang": ["_TZ3000_w8jwkczz", "_tz3000_w8jwkczz"],
  "wall_remote_4_gang": ["_TZ3000_ee8nrt2l", "_tz3000_ee8nrt2l"]
};

let fixed = false;
if (appJson.drivers) {
  appJson.drivers.forEach(driver => {
    if (fixups[driver.id]) {
      console.log(`Fixing driver ${driver.id}`);
      driver.zigbee.manufacturerName = [...new Set([...(driver.zigbee.manufacturerName || []), ...fixups[driver.id]])];
      fixed = true;
    }
  });
}

if (fixed) {
  fs.writeFileSync(appJsonPath, JSON.stringify(appJson, null, 2));
  console.log('Successfully updated app.json');
} else {
  console.log('No drivers found to fix');
}
