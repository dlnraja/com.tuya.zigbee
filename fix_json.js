const fs = require('fs');

console.log('🔧 Réparation fichiers JSON corrompus...');

const drivers = fs.readdirSync('drivers').filter(f => fs.statSync(`drivers/${f}`).isDirectory());

drivers.forEach(driver => {
  const file = `drivers/${driver}/driver.compose.json`;
  if (fs.existsSync(file)) {
    try {
      const content = fs.readFileSync(file, 'utf8');
      JSON.parse(content); // Test parsing
      console.log(`✅ ${driver} - OK`);
    } catch (e) {
      console.log(`❌ ${driver} - JSON corrompu: ${e.message}`);
      
      // Restaurer depuis Git
      const { execSync } = require('child_process');
      try {
        execSync(`git checkout HEAD -- "${file}"`, { cwd: process.cwd() });
        console.log(`🔄 ${driver} - Restauré depuis Git`);
      } catch (gitError) {
        console.log(`⚠️ ${driver} - Impossible de restaurer`);
      }
    }
  }
});

console.log('✅ Validation JSON terminée');
