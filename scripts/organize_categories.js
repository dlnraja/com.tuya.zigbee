const fs = require('fs');

console.log('📁 ORGANISATION CATÉGORIES UNBRANDED');

// Catégories par fonction (pas marque) - Memory 9f7be57a
const categories = {
  '01_Motion_Presence': ['motion_sensor', 'pir_sensor', 'presence', 'radar'],
  '02_Smart_Lighting': ['light', 'bulb', 'dimmer', 'led_strip', 'rgb'],
  '03_Power_Energy': ['plug', 'socket', 'energy', 'switch_'],
  '04_Climate_Control': ['temperature', 'humidity', 'thermostat', 'co2'],
  '05_Safety_Detection': ['smoke', 'co_detector', 'water_leak', 'gas'],
  '06_Security_Access': ['door_', 'lock', 'fingerprint', 'window'],
  '07_Automation': ['controller', 'button', 'scene', 'remote']
};

const drivers = fs.readdirSync('drivers').filter(f => 
  fs.statSync(`drivers/${f}`).isDirectory()
);

let categorized = {};
drivers.forEach(driver => {
  let found = false;
  for (const [catName, keywords] of Object.entries(categories)) {
    if (keywords.some(keyword => driver.includes(keyword))) {
      if (!categorized[catName]) categorized[catName] = [];
      categorized[catName].push(driver);
      found = true;
      break;
    }
  }
  if (!found) {
    if (!categorized['99_Other']) categorized['99_Other'] = [];
    categorized['99_Other'].push(driver);
  }
});

// Afficher organisation
console.log('\n📊 ORGANISATION FINALE:');
Object.entries(categorized).forEach(([cat, drivers]) => {
  console.log(`${cat}: ${drivers.length} drivers`);
});

console.log(`\n✅ Total: ${drivers.length} drivers organisés par catégories UNBRANDED`);
