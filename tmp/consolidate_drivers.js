const fs = require('fs');
const path = require('path');

const root = 'c:\\Users\\HP\\Desktop\\homey app\\tuya_repair';

const consolidationMap = {
  'wall_switch_1gang_1way': 'switch_1gang',
  'wall_switch_2gang_1way': 'switch_2gang',
  'wall_switch_3gang_1way': 'switch_3gang',
  'wall_switch_4gang_1way': 'switch_4gang'
};

for (const [oldDriver, newDriver] of Object.entries(consolidationMap)) {
  const oldPath = path.join(root, 'drivers', oldDriver, 'driver.compose.json');
  const newPath = path.join(root, 'drivers', newDriver, 'driver.compose.json');

  if (!fs.existsSync(oldPath)) {
    console.log(`Skipping ${oldDriver} (not found)`);
    continue;
  }

  const oldData = JSON.parse(fs.readFileSync(oldPath, 'utf8'));
  const newData = JSON.parse(fs.readFileSync(newPath, 'utf8'));

  let addedCount = 0;
  if (oldData.zigbee && oldData.zigbee.manufacturerName) {
    newData.zigbee = newData.zigbee || {};
    newData.zigbee.manufacturerName = newData.zigbee.manufacturerName || [];
    
    for (const mfr of oldData.zigbee.manufacturerName) {
      if (!newData.zigbee.manufacturerName.includes(mfr)) {
        newData.zigbee.manufacturerName.push(mfr);
        addedCount++;
      }
    }
  }

  if (oldData.zigbee && oldData.zigbee.productId) {
    newData.zigbee.productId = newData.zigbee.productId || [];
    for (const prod of oldData.zigbee.productId) {
      if (!newData.zigbee.productId.includes(prod)) {
        newData.zigbee.productId.push(prod);
      }
    }
  }

  if (addedCount > 0) {
    fs.writeFileSync(newPath, JSON.stringify(newData, null, 2));
    console.log(`Merged ${addedCount} fingerprints from ${oldDriver} to ${newDriver}`);
  } else {
    console.log(`No new fingerprints to merge from ${oldDriver}`);
  }
}
