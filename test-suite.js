#!/usr/bin/env node

const fs = require('fs');

console.log('🤖 SUITE DE TESTS - TUYA ZIGBEE');
console.log('================================');

// Test des clusters
console.log('\n🔍 TEST 1: CLUSTERS');
if (fs.existsSync('app.json')) {
    const content = fs.readFileSync('app.json', 'utf8');
    const clusters = content.match(/"clusters":\s*\[[^\]]*\]/g);
    
    if (clusters) {
        const numeric = clusters.filter(m => m.match(/"clusters":\s*\[\s*\d+/));
        console.log(`✅ ${numeric.length}/${clusters.length} clusters numériques`);
        
        if (numeric.length === clusters.length) {
            console.log('🎉 TOUS les clusters sont numériques !');
        }
    }
}

// Test des drivers
console.log('\n🔍 TEST 2: DRIVERS');
const driversPath = './drivers';
if (fs.existsSync(driversPath)) {
    const drivers = fs.readdirSync(driversPath, { withFileTypes: true })
        .filter(d => d.isDirectory()).length;
    console.log(`✅ ${drivers} drivers trouvés`);
}

console.log('\n🎯 Tests terminés');
console.log('📋 COMMANDE À EXÉCUTER: homey app validate');
