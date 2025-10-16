const fs = require('fs');

console.log('🔧 REMOVING DRIVER IMAGE DECLARATIONS\n');

const appJson = JSON.parse(fs.readFileSync('app.json', 'utf8'));

let removed = 0;
for (const [name, driver] of Object.entries(appJson.drivers || {})) {
  if (driver.images) {
    delete driver.images;
    removed++;
  }
}

fs.writeFileSync('app.json', JSON.stringify(appJson, null, 2));

console.log(`✅ ${removed} driver image declarations removed`);
console.log('\nHomey will auto-discover images from drivers/*/assets/images/');
console.log('APP images (250x175/500x350) separate from driver images (75x75/500x500)\n');
