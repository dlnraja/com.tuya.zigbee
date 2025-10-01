const fs = require('fs');
const path = require('path');

console.log('=== ANALYSE ET ENRICHISSEMENT COMPLET ===');

// 1. Analyser tous les drivers
const drivers = fs.readdirSync('drivers').filter(f => fs.statSync(`drivers/${f}`).isDirectory());
console.log(`Drivers trouvés: ${drivers.length}`);

// 2. Fixer tous les chemins d'images dans driver.compose.json
let fixed = 0;
drivers.forEach(driver => {
  const composePath = `drivers/${driver}/driver.compose.json`;
  if (fs.existsSync(composePath)) {
    let content = fs.readFileSync(composePath, 'utf8');
    const original = content;
    
    // Corriger chemins images + capabilities
    content = content.replace(/\"small\":\s*\".*\/assets\/images\/small\.png\"/g, '"small": "./assets/small.png"');
    content = content.replace(/\"large\":\s*\".*\/assets\/images\/large\.png\"/g, '"large": "./assets/images/large.png"');
    content = content.replace(/\"fan_speed\"/g, '"dim"');
    
    if (content !== original) {
      fs.writeFileSync(composePath, content, 'utf8');
      console.log(`✓ ${driver}`);
      fixed++;
    }
  }
});

console.log(`Drivers corrigés: ${fixed}`);
console.log('✅ Exécutez: homey app validate --level publish');
