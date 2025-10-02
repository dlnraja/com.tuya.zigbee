const fs = require('fs');

const drivers = fs.readdirSync('drivers').filter(f => fs.statSync(`drivers/${f}`).isDirectory());
let fixed = 0;

drivers.forEach(driver => {
  const file = `drivers/${driver}/driver.compose.json`;
  if (fs.existsSync(file)) {
    const data = JSON.parse(fs.readFileSync(file, 'utf8'));
    
    if (data.capabilities?.includes('measure_battery')) {
      if (!data.energy?.batteries) {
        data.energy = data.energy || {};
        data.energy.batteries = ['CR2032'];
        fs.writeFileSync(file, JSON.stringify(data, null, 2));
        fixed++;
        console.log(`✓ ${driver}`);
      }
    }
  }
});

console.log(`✅ ${fixed} drivers corrigés`);
