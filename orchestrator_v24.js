const fs = require('fs');
const { execSync } = require('child_process');

console.log('🎭 ORCHESTRATOR V24 - SCAN COMPLET');

// Phase 1: Extract all manufacturerNames from project
const allManufacturers = new Set();
const drivers = fs.readdirSync('drivers').filter(f => fs.statSync(`drivers/${f}`).isDirectory());

drivers.forEach(driver => {
  const file = `drivers/${driver}/driver.compose.json`;
  if (fs.existsSync(file)) {
    const data = JSON.parse(fs.readFileSync(file, 'utf8'));
    if (data.zigbee?.manufacturerName) {
      data.zigbee.manufacturerName.forEach(m => allManufacturers.add(m));
    }
  }
});

// Phase 2: Extract from Git history
try {
  const gitLog = execSync('git log --all --grep="manufacturer" --format="%B"', { encoding: 'utf8' });
  const gitMatches = gitLog.match(/_TZ[A-Z0-9]{3,4}_[a-z0-9]{8}/g) || [];
  gitMatches.forEach(m => allManufacturers.add(m));
} catch (e) {}

// Save results
const results = {
  total: allManufacturers.size,
  manufacturers: Array.from(allManufacturers).sort()
};

fs.writeFileSync('MANUFACTURERS_DATABASE.json', JSON.stringify(results, null, 2));
console.log(`✅ ${results.total} manufacturerNames extraits`);
console.log('📁 Sauvegardé: MANUFACTURERS_DATABASE.json');
