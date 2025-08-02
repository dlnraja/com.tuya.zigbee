const DriverGenerator = require('./lib/generator.js');

console.log('🧪 Test du générateur de drivers...');

const generator = new DriverGenerator();
const drivers = generator.generateAllDrivers();

console.log(`✅ ${drivers.length} drivers générés avec succès`);

for (const driver of drivers) {
    console.log(`📦 Driver: ${driver.name}`);
    console.log(`   Type: ${driver.type}`);
    console.log(`   Capabilities: ${driver.capabilities.join(', ')}`);
    console.log(`   Clusters: ${driver.clusters.join(', ')}`);
    console.log('---');
}

console.log('🎉 Test terminé avec succès!');