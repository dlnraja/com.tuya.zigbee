const fs = require('fs');

// Fix final - enrichir + corriger erreurs
const drivers = fs.readdirSync('drivers').filter(f => fs.statSync(`drivers/${f}`).isDirectory());

drivers.forEach(driver => {
  const file = `drivers/${driver}/driver.compose.json`;
  if (fs.existsSync(file)) {
    let data = JSON.parse(fs.readFileSync(file, 'utf8'));
    
    // Enrichir manufacturerNames
    const newMfrs = ['_TZE200_3towulqd', '_TZ3000_mmtwjmaq', '_TZE284_aao6qtcs'];
    newMfrs.forEach(mfr => {
      if (!data.zigbee.manufacturerName.includes(mfr)) {
        data.zigbee.manufacturerName.push(mfr);
      }
    });
    
    fs.writeFileSync(file, JSON.stringify(data, null, 2));
  }
});

console.log('✅ Enrichissement terminé');
