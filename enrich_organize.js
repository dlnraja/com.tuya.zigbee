const fs = require('fs');

console.log('🔧 ENRICHISSEMENT ET ORGANISATION');

const classified = JSON.parse(fs.readFileSync('CLASSIFIED.json'));
const drivers = fs.readdirSync('drivers').filter(f => fs.statSync(`drivers/${f}`).isDirectory());

let enriched = 0, organized = 0;

// Enrichir chaque driver avec manufacturerNames classifiés
drivers.forEach(driver => {
  const file = `drivers/${driver}/driver.compose.json`;
  if (fs.existsSync(file)) {
    let data = JSON.parse(fs.readFileSync(file, 'utf8'));
    const cat = driver.split('_')[0];
    
    // Ajouter manufacturers de la catégorie
    if (classified.categories[cat]) {
      const current = new Set(data.zigbee.manufacturerName);
      classified.categories[cat].forEach(m => {
        if (!current.has(m) && m.startsWith('_TZ')) {
          current.add(m);
          enriched++;
        }
      });
      data.zigbee.manufacturerName = Array.from(current);
    }
    
    // Enrichir productId si manquant
    if (!data.zigbee.productId || data.zigbee.productId.length === 0) {
      if (driver.includes('switch')) data.zigbee.productId = ['TS0001'];
      else if (driver.includes('motion')) data.zigbee.productId = ['TS0202'];
      else if (driver.includes('plug')) data.zigbee.productId = ['TS011F'];
      else if (driver.includes('light')) data.zigbee.productId = ['TS0505'];
    }
    
    fs.writeFileSync(file, JSON.stringify(data, null, 2));
    organized++;
  }
});

console.log(`✅ ${enriched} manufacturers ajoutés, ${organized} drivers organisés`);
