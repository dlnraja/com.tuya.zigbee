#!/usr/bin/env node
// 🎯 FIX DÉFINITIF ENDPOINTS - Selon mémoires et solutions éprouvées
// Basé sur succès v1.1.9, v2.0.0, v1.0.31

const fs = require('fs');
const { execSync } = require('child_process');

console.log('🎯 FIX DÉFINITIF ENDPOINTS');
console.log('📚 Basé sur mémoires: 1gang=1ep, 2gang=2ep, 3gang=3ep');
console.log('✅ Solutions éprouvées v1.1.9, v2.0.0, v1.0.31\n');

// ÉTAPE 1: Nettoyage cache complet
console.log('🧹 Nettoyage cache complet...');
try {
    if (fs.existsSync('.homeybuild')) fs.rmSync('.homeybuild', {recursive: true, force: true});
    if (fs.existsSync('.homeycompose')) fs.rmSync('.homeycompose', {recursive: true, force: true});
    console.log('✅ Cache nettoyé');
} catch(e) {
    console.log('⚠️ Erreur cache:', e.message);
}

// ÉTAPE 2: Fix endpoints selon mémoires
console.log('\n🔧 Fix endpoints selon mémoires...');

const criticalDrivers = [
    {
        name: 'motion_sensor_battery',
        endpoints: {"1": {"clusters": [0, 4, 5, 1030]}}, // PIR + battery
        description: 'Motion sensor avec battery'
    },
    {
        name: 'smart_plug_energy', 
        endpoints: {"1": {"clusters": [0, 4, 5, 6, 1794]}}, // Switch + energy
        description: 'Smart plug avec energy monitoring'
    },
    {
        name: 'smart_switch_1gang_ac',
        endpoints: {"1": {"clusters": [0, 4, 5, 6]}}, // 1 endpoint
        description: 'Switch 1 gang - 1 endpoint'
    },
    {
        name: 'smart_switch_2gang_ac',
        endpoints: {
            "1": {"clusters": [0, 4, 5, 6]},
            "2": {"clusters": [0, 4, 5, 6]}
        }, // 2 endpoints
        description: 'Switch 2 gang - 2 endpoints'
    },
    {
        name: 'smart_switch_3gang_ac',
        endpoints: {
            "1": {"clusters": [0, 4, 5, 6]},
            "2": {"clusters": [0, 4, 5, 6]}, 
            "3": {"clusters": [0, 4, 5, 6]}
        }, // 3 endpoints
        description: 'Switch 3 gang - 3 endpoints'
    }
];

let fixed = 0;

criticalDrivers.forEach(driver => {
    const filePath = `drivers/${driver.name}/driver.compose.json`;
    
    if (fs.existsSync(filePath)) {
        try {
            let config = JSON.parse(fs.readFileSync(filePath, 'utf8'));
            
            // Force zigbee object
            if (!config.zigbee) config.zigbee = {};
            
            // Force endpoints
            config.zigbee.endpoints = driver.endpoints;
            
            // Write avec formatage propre
            fs.writeFileSync(filePath, JSON.stringify(config, null, 2));
            
            console.log(`✅ ${driver.name}: ${driver.description}`);
            fixed++;
            
        } catch(e) {
            console.log(`❌ ${driver.name}: ${e.message}`);
        }
    } else {
        console.log(`⚠️ ${driver.name}: Fichier introuvable`);
    }
});

// ÉTAPE 3: Configuration
console.log('\n📝 Configuration...');
if (!fs.existsSync('config')) fs.mkdirSync('config');
fs.writeFileSync('config/drivers-count.json', JSON.stringify({total: 149, fixed: fixed}, null, 2));

console.log(`\n🎉 FIX DÉFINITIF TERMINÉ`);
console.log(`   ✅ ${fixed}/5 drivers critiques fixés`);
console.log(`   🧹 Cache complètement nettoyé`);
console.log(`   📝 Configuration mise à jour`);
console.log(`\n🔄 Prochaine étape: homey app validate`);
