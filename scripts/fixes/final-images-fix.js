const fs = require('fs');
console.log('FINAL FIX START');
const appJson = JSON.parse(fs.readFileSync('app.json', 'utf8'));
let added = 0;
for (const driver of appJson.drivers || []) {
  if (!driver.images && driver.id) {
    driver.images = {
      small: `./drivers/${driver.id}/assets/images/small.png`,
      large: `./drivers/${driver.id}/assets/images/large.png`
    };
    added++;
  }
}
fs.writeFileSync('app.json', JSON.stringify(appJson, null, 2));
console.log(`DONE: ${added} added`);
