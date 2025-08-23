#!/usr/bin/env node

const fs = require('fs');

console.log('🔧 CORRECTION FINALE APP.JSON - PROPRIÉTÉS REQUISES');

// Lire app.json
const appJsonPath = './app.json';
if (!fs.existsSync(appJsonPath)) {
    console.log('❌ app.json non trouvé');
    process.exit(1);
}

try {
    const content = fs.readFileSync(appJsonPath, 'utf8');
    const appConfig = JSON.parse(content);
    
    console.log('📋 Propriétés actuelles:');
    console.log(`   - id: ${appConfig.id ? '✅' : '❌'}`);
    console.log(`   - version: ${appConfig.version ? '✅' : '❌'}`);
    console.log(`   - compatibility: ${appConfig.compatibility ? '✅' : '❌'}`);
    console.log(`   - category: ${appConfig.category ? '✅' : '❌'}`);
    console.log(`   - name: ${appConfig.name ? '✅' : '❌'}`);
    console.log(`   - author: ${appConfig.author ? '✅' : '❌'}`);
    console.log(`   - platforms: ${appConfig.platforms ? '✅' : '❌'}`);
    console.log(`   - drivers: ${appConfig.drivers ? `✅ (${appConfig.drivers.length})` : '❌'}`);
    
    // Ajouter/corriger les propriétés manquantes
    let modified = false;
    
    if (!appConfig.category) {
        appConfig.category = ["appliances"];
        modified = true;
        console.log('✅ Propriété category ajoutée');
    }
    
    if (!appConfig.name) {
        appConfig.name = {
            "en": "Tuya Zigbee",
            "fr": "Tuya Zigbee",
            "nl": "Tuya Zigbee",
            "ta": "Tuya Zigbee"
        };
        modified = true;
        console.log('✅ Propriété name ajoutée');
    }
    
    if (!appConfig.description) {
        appConfig.description = {
            "en": "Tuya Zigbee devices support with universal drivers",
            "fr": "Support des appareils Tuya Zigbee avec drivers universaux",
            "nl": "Ondersteuning voor Tuya Zigbee-apparaten met universele drivers",
            "ta": "Tuya Zigbee சாதனங்களுக்கான ஆதரவு உலகளாவிய drivers உடன்"
        };
        modified = true;
        console.log('✅ Propriété description ajoutée');
    }
    
    if (!appConfig.author) {
        appConfig.author = {
            "name": "dlnraja",
            "email": "[redacted-email]"
        };
        modified = true;
        console.log('✅ Propriété author ajoutée');
    }
    
    if (!appConfig.platforms) {
        appConfig.platforms = ["local"];
        modified = true;
        console.log('✅ Propriété platforms ajoutée');
    }
    
    if (!appConfig.images) {
        appConfig.images = {
            "small": "assets/small.svg",
            "large": "assets/large.svg"
        };
        modified = true;
        console.log('✅ Propriété images ajoutée');
    }
    
    if (!appConfig.icon) {
        appConfig.icon = "assets/icon.svg";
        modified = true;
        console.log('✅ Propriété icon ajoutée');
    }
    
    if (!appConfig.color) {
        appConfig.color = "#FF6B35";
        modified = true;
        console.log('✅ Propriété color ajoutée');
    }
    
    if (modified) {
        // Sauvegarder
        fs.writeFileSync(appJsonPath, JSON.stringify(appConfig, null, 2));
        console.log('✅ app.json mis à jour avec toutes les propriétés requises');
        
        // Vérifier la taille
        const stats = fs.statSync(appJsonPath);
        console.log(`📊 Taille finale: ${stats.size} bytes`);
    } else {
        console.log('✅ Toutes les propriétés sont déjà présentes');
    }
    
    // Vérification finale
    console.log('\n📋 VÉRIFICATION FINALE:');
    console.log(`   - Drivers: ${appConfig.drivers ? appConfig.drivers.length : 0}`);
    console.log(`   - Category: ${appConfig.category ? JSON.stringify(appConfig.category) : 'MANQUANT'}`);
    console.log(`   - Platforms: ${appConfig.platforms ? JSON.stringify(appConfig.platforms) : 'MANQUANT'}`);
    
} catch (error) {
    console.log(`❌ Erreur: ${error.message}`);
    process.exit(1);
}

console.log('\n🎯 Correction finale terminée - Prêt pour validation Homey');
