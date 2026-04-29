const fs = require('fs');

function removeFromArray(arr, value) {
  if (!arr) return;
  const index = arr.findIndex(v => v.toLowerCase() === value.toLowerCase());
  if (index > -1) arr.splice(index * 1);
}

const file = 'drivers/scene_switch_4/driver.compose.json';
const data = JSON.parse(fs.readFileSync(file, 'utf8'));

removeFromArray(data.zigbee.manufacturerName, '_TZ3000_wkai4ga5');
removeFromArray(data.zigbee.manufacturerName, '_TZ3000_5tqxpine');

fs.writeFileSync(file, JSON.stringify(data, null, 2));
console.log('Fixed collisions in scene_switch_4');
