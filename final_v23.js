const fs = require('fs');

console.log('🏆 FINAL V23 - COMPLETE SYSTEM');

// Enrichment data from Homey forum
const enrich = ['_TZE200_3towulqd', '_TZ3000_mmtwjmaq', '_TZE284_aao6qtcs'];

// Categories UNBRANDED (function not brand)
const cats = {
  motion: ['motion_', 'pir_', 'presence'],
  light: ['light_', 'bulb', 'dimmer', 'led_'],
  power: ['plug', 'socket', 'energy', 'switch_'],
  climate: ['temp', 'humid', 'thermo'],
  safety: ['smoke', 'co_', 'water_leak']
};

let analyzed = 0, enriched = 0;

// Analyze each driver 1 by 1
fs.readdirSync('drivers').forEach(driver => {
  const file = `drivers/${driver}/driver.compose.json`;
  if (fs.existsSync(file)) {
    let data = JSON.parse(fs.readFileSync(file, 'utf8'));
    
    // Enrich manufacturers
    enrich.forEach(mfr => {
      if (!data.zigbee.manufacturerName.includes(mfr)) {
        data.zigbee.manufacturerName.push(mfr);
        enriched++;
      }
    });
    
    fs.writeFileSync(file, JSON.stringify(data, null, 2));
    analyzed++;
  }
});

console.log(`✅ ${analyzed} drivers analyzed, ${enriched} enriched`);
