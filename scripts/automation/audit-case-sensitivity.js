const fs = require('fs');
const path = require('path');

const driversDir = './drivers';
const drivers = fs.readdirSync(driversDir);

drivers.forEach(driver => {
  const composePath = path.join(driversDir, driver, 'driver.compose.json');
  if (fs.existsSync(composePath)) {
    try {
      let content = fs.readFileSync(composePath, 'utf8');
      let json = JSON.parse(content);
      let changed = false;

      if (json.zigbee) {
        if (Array.isArray(json.zigbee.productId)) {
          const original = [...json.zigbee.productId];
          json.zigbee.productId.forEach(id => {
            const lower = id.toLowerCase();
            const upper = id.toUpperCase();
            if (!json.zigbee.productId.includes(lower)) {
              json.zigbee.productId.push(lower);
              changed = true;
            }
            if (!json.zigbee.productId.includes(upper)) {
              json.zigbee.productId.push(upper);
              changed = true;
            }
          });
          if (changed) {
            json.zigbee.productId.sort();
            json.zigbee.productId = [...new Set(json.zigbee.productId)];
          }
        }

        if (Array.isArray(json.zigbee.manufacturerName)) {
          let mfrChanged = false;
          const original = [...json.zigbee.manufacturerName];
          json.zigbee.manufacturerName.forEach(name => {
            const lower = name.toLowerCase();
            const upper = name.toUpperCase();
            if (!json.zigbee.manufacturerName.includes(lower)) {
              json.zigbee.manufacturerName.push(lower);
              mfrChanged = true;
            }
            if (!json.zigbee.manufacturerName.includes(upper)) {
              json.zigbee.manufacturerName.push(upper);
              mfrChanged = true;
            }
          });
          if (mfrChanged) {
            json.zigbee.manufacturerName.sort();
            json.zigbee.manufacturerName = [...new Set(json.zigbee.manufacturerName)];
            changed = true;
          }
        }
      }

      if (changed) {
        fs.writeFileSync(composePath, JSON.stringify(json, null, 2), 'utf8');
        console.log(`Updated ${composePath}`);
      }
    } catch (e) {
      console.error(`Error processing ${composePath}: ${e.message}`);
    }
  }
});
