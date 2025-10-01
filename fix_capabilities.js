const fs = require('fs');

console.log('=== CORRECTION DES CAPABILITIES SDK3 ===');

const drivers = fs.readdirSync('drivers').filter(f => fs.statSync(`drivers/${f}`).isDirectory());

const unsupportedCapabilities = {
  'measure_distance': 'measure_generic',
  'fan_speed': 'dim',
  'measure_formaldehyde': 'measure_generic',
  'alarm_test': 'onoff'
};

let fixed = 0;

drivers.forEach(driver => {
  const composePath = `drivers/${driver}/driver.compose.json`;
  if (fs.existsSync(composePath)) {
    let content = fs.readFileSync(composePath, 'utf8');
    const original = content;
    
    // Remplacer capabilities non supportées
    for (const [old, replacement] of Object.entries(unsupportedCapabilities)) {
      const regex = new RegExp(`"${old}"`, 'g');
      content = content.replace(regex, `"${replacement}"`);
    }
    
    if (content !== original) {
      fs.writeFileSync(composePath, content, 'utf8');
      console.log(`✓ ${driver}`);
      fixed++;
    }
  }
});

console.log(`\n✅ ${fixed} drivers avec capabilities corrigées`);
console.log('Prêt pour validation finale!');
