const fs = require('fs');
const glob = require('glob');
const files = glob.sync('drivers/*/driver.compose.json');

let fixed = 0;
files.forEach(f => {
  const data = JSON.parse(fs.readFileSync(f, 'utf8'));
  if (data.zigbee && Array.isArray(data.zigbee.manufacturerName) && data.zigbee.manufacturerName.length === 0) {
    // Remove the empty array completely to avoid AggregateError
    delete data.zigbee.manufacturerName;
    fs.writeFileSync(f, JSON.stringify(data, null, 2) + '\n');
    console.log('Fixed', f);
    fixed++;
  }
});
console.log(`Fixed ${fixed} driver.compose.json files.`);
