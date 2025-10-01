const fs = require('fs');

console.log('🎯 MASTER V22 - ANALYSE COMPLÈTE');

// Enrichissement forum Homey
const enrichMfrs = ['_TZE200_3towulqd', '_TZ3000_mmtwjmaq', '_TZE284_aao6qtcs', '_TZ3000_g5xawfcq'];

// Catégories UNBRANDED
const categories = {
  motion: ['motion_sensor', 'pir_sensor', 'presence'],
  lighting: ['light', 'bulb', 'dimmer', 'led_strip'],
  power: ['plug', 'socket', 'energy', 'switch_'],
  climate: ['temperature', 'humidity', 'thermostat'],
  safety: ['smoke', 'co_detector', 'water_leak']
};

let analyzed = 0, enriched = 0;

// Analyser chaque driver 1 par 1
fs.readdirSync('drivers').forEach(driver => {
  const file = `drivers/${driver}/driver.compose.json`;
  if (fs.existsSync(file)) {
    let data = JSON.parse(fs.readFileSync(file, 'utf8'));
    
    // Enrichir manufacturerNames
    enrichMfrs.forEach(mfr => {
      if (!data.zigbee.manufacturerName.includes(mfr)) {
        data.zigbee.manufacturerName.push(mfr);
        enriched++;
      }
    });
    
    // Déterminer catégorie UNBRANDED
    let category = Object.keys(categories).find(cat => 
      categories[cat].some(keyword => driver.includes(keyword))
    );
    
    fs.writeFileSync(file, JSON.stringify(data, null, 2));
    analyzed++;
  }
});

console.log(`✅ ${analyzed} drivers analysés, ${enriched} enrichissements`);
console.log('🚀 Prêt pour publication!');
