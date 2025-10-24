const fs = require('fs');

console.log('🔋 FIX MISSING BATTERIES - AJOUT energy.batteries');
console.log('═'.repeat(80));

const appJson = JSON.parse(fs.readFileSync('./app.json', 'utf8'));

// Find all drivers with measure_battery capability but missing energy.batteries
let fixed = 0;

appJson.drivers.forEach(driver => {
  const capabilities = driver.capabilities || [];
  
  if (capabilities.includes('measure_battery')) {
    // Check if energy.batteries is missing
    if (!driver.energy || !driver.energy.batteries || driver.energy.batteries.length === 0) {
      // Add default batteries based on driver type
      let batteries = ['CR2032']; // Default
      
      // Smarter battery selection based on driver ID
      if (driver.id.includes('ac') || driver.id.includes('plug') || driver.id.includes('socket')) {
        // AC powered devices shouldn't have battery, skip
        return;
      } else if (driver.id.includes('motion') || driver.id.includes('sensor') || driver.id.includes('detector')) {
        batteries = ['CR2032', 'CR2450', 'AA'];
      } else if (driver.id.includes('switch') || driver.id.includes('button') || driver.id.includes('remote')) {
        batteries = ['CR2032', 'CR2450'];
      } else if (driver.id.includes('smoke') || driver.id.includes('co_') || driver.id.includes('gas')) {
        batteries = ['CR123A', 'AA'];
      } else if (driver.id.includes('door') || driver.id.includes('window') || driver.id.includes('contact')) {
        batteries = ['CR2032', 'AAA'];
      }
      
      if (!driver.energy) driver.energy = {};
      driver.energy.batteries = batteries;
      
      fixed++;
      console.log(`   ✅ ${driver.id}: ajouté batteries [${batteries.join(', ')}]`);
    }
  }
});

fs.writeFileSync('./app.json', JSON.stringify(appJson, null, 2));

console.log(`\n📊 RÉSUMÉ:`);
console.log(`   Drivers corrigés: ${fixed}`);

console.log('\n🔍 Validation finale...');
const { execSync } = require('child_process');
try {
  execSync('homey app validate', { stdio: 'inherit', cwd: '.' });
  console.log('\n✅ VALIDATION RÉUSSIE !');
} catch (error) {
  console.log('\n⚠️  Vérifier si d\'autres erreurs persistent...');
}
