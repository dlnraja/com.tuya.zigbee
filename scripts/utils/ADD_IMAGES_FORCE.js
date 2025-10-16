const fs = require('fs');

console.log('FORCING IMAGE DECLARATIONS...');

const appJson = JSON.parse(fs.readFileSync('app.json', 'utf8'));
let added = 0;
let total = 0;

if (Array.isArray(appJson.drivers)) {
  for (let i = 0; i < appJson.drivers.length; i++) {
    const driver = appJson.drivers[i];
    total++;
    if (driver.id && !driver.images) {
      driver.images = {
        small: './drivers/' + driver.id + '/assets/images/small.png',
        large: './drivers/' + driver.id + '/assets/images/large.png'
      };
      added++;
    }
  }
}

fs.writeFileSync('app.json', JSON.stringify(appJson, null, 2), 'utf8');

console.log('Total drivers:', total);
console.log('Images added:', added);
console.log('DONE!');
