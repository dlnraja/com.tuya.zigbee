const fs = require('fs');

const db = JSON.parse(fs.readFileSync('MANUFACTURERS_DATABASE.json'));
const drivers = fs.readdirSync('drivers').filter(f => fs.statSync(`drivers/${f}`).isDirectory());

const categories = {};
drivers.forEach(driver => {
  const file = `drivers/${driver}/driver.compose.json`;
  if (fs.existsSync(file)) {
    const data = JSON.parse(fs.readFileSync(file, 'utf8'));
    if (data.zigbee?.manufacturerName) {
      const cat = driver.split('_')[0];
      if (!categories[cat]) categories[cat] = new Set();
      data.zigbee.manufacturerName.forEach(m => categories[cat].add(m));
    }
  }
});

Object.keys(categories).forEach(cat => categories[cat] = Array.from(categories[cat]));

fs.writeFileSync('CLASSIFIED.json', JSON.stringify({categories, total: db.total}, null, 2));
console.log(`✅ ${Object.keys(categories).length} catégories, ${db.total} manufacturers`);
