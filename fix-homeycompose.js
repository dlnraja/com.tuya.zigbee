#!/usr/bin/env node

const fs = require('fs');

console.log('🔧 CORRECTION AUTOMATIQUE .HOMEYCOMPOSE/APP.JSON');

// Lire le fichier .homeycompose/app.json
const appJsonPath = './.homeycompose/app.json';
if (!fs.existsSync(appJsonPath)) {
    console.log('❌ .homeycompose/app.json non trouvé');
    process.exit(1);
}

try {
    const content = fs.readFileSync(appJsonPath, 'utf8');
    const appConfig = JSON.parse(content);
    
    console.log('📋 État actuel:');
    console.log(`   - Drivers: ${appConfig.drivers ? appConfig.drivers.length : 0}`);
    
    // Corriger la classe du premier driver
    if (appConfig.drivers && appConfig.drivers.length > 0) {
        const firstDriver = appConfig.drivers[0];
        if (firstDriver.id === 'climates-TS0601_ac' && firstDriver.class === 'climate') {
            firstDriver.class = 'thermostat';
            console.log('✅ Classe corrigée: climate → thermostat');
        }
    }
    
    // Sauvegarder
    fs.writeFileSync(appJsonPath, JSON.stringify(appConfig, null, 2));
    console.log('✅ Fichier .homeycompose/app.json mis à jour');
    
    // Vérification
    const updatedContent = fs.readFileSync(appJsonPath, 'utf8');
    const updatedConfig = JSON.parse(updatedContent);
    console.log(`📊 Vérification: ${updatedConfig.drivers[0].class}`);
    
} catch (error) {
    console.log(`❌ Erreur: ${error.message}`);
    process.exit(1);
}

console.log('🎯 Correction terminée - Prêt pour validation Homey');
