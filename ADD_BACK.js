const fs = require('fs');
const appJson = JSON.parse(fs.readFileSync('app.json', 'utf8'));

let added = 0;
for (const [name, driver] of Object.entries(appJson.drivers || {})) {
  if (!driver.images) {
    driver.images = {
      small: "./assets/images/small.png",
      large: "./assets/images/large.png"
    };
    added++;
  }
}

fs.writeFileSync('app.json', JSON.stringify(appJson, null, 2));
console.log(`✅ ${added} images declarations added`);
