#!/usr/bin/env node

const fs = require('fs');

console.log('🔍 VALIDATION RAPIDE - TUYA ZIGBEE');
console.log('====================================');

// Test 1: app.json
console.log('\n📋 TEST 1: APP.JSON');
if (fs.existsSync('app.json')) {
    const stats = fs.statSync('app.json');
    console.log(`✅ app.json trouvé (${stats.size} bytes)`);
    
    try {
        const content = fs.readFileSync('app.json', 'utf8');
        const appConfig = JSON.parse(content);
        console.log(`✅ JSON valide`);
        console.log(`📊 Drivers: ${appConfig.drivers ? appConfig.drivers.length : 0}`);
    } catch (error) {
        console.log(`❌ JSON invalide: ${error.message}`);
    }
} else {
    console.log('❌ app.json non trouvé');
}

// Test 2: Clusters
console.log('\n📋 TEST 2: CLUSTERS');
if (fs.existsSync('app.json')) {
    const content = fs.readFileSync('app.json', 'utf8');
    const clusterMatches = content.match(/"clusters":\s*\[[^\]]*\]/g);
    
    if (clusterMatches) {
        console.log(`📊 ${clusterMatches.length} sections clusters trouvées`);
        
        const numericClusters = clusterMatches.filter(match => 
            match.match(/"clusters":\s*\[\s*\d+/)
        );
        
        console.log(`✅ ${numericClusters.length} sections avec clusters numériques`);
        
        if (numericClusters.length === clusterMatches.length) {
            console.log('🎉 TOUS les clusters sont numériques !');
        } else {
            console.log('⚠️  Certains clusters ne sont pas numériques');
        }
    }
}

// Test 3: Drivers
console.log('\n📋 TEST 3: DRIVERS');
const driversPath = './drivers';
if (fs.existsSync(driversPath)) {
    const drivers = fs.readdirSync(driversPath, { withFileTypes: true })
        .filter(d => d.isDirectory());
    
    console.log(`📂 ${drivers.length} drivers trouvés`);
    
    // Vérifier quelques drivers
    const sampleDrivers = drivers.slice(0, 3);
    sampleDrivers.forEach(driver => {
        const composePath = `./drivers/${driver.name}/driver.compose.json`;
        if (fs.existsSync(composePath)) {
            try {
                const content = fs.readFileSync(composePath, 'utf8');
                const config = JSON.parse(content);
                if (config.zigbee && config.zigbee.manufacturerName) {
                    console.log(`✅ ${driver.name}: OK`);
                } else {
                    console.log(`⚠️  ${driver.name}: structure incomplète`);
                }
            } catch (error) {
                console.log(`❌ ${driver.name}: erreur parsing`);
            }
        } else {
            console.log(`❌ ${driver.name}: driver.compose.json manquant`);
        }
    });
}

console.log('\n🎯 VALIDATION TERMINÉE');
console.log('📋 COMMANDE SUIVANTE: homey app validate');
