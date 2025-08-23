#!/usr/bin/env node

const fs = require('fs');
const path = require('path');

console.log('🚀 CRÉATION D\'UN NOUVEAU APP.JSON COMPLET ET CORRECT');

// Lire tous les drivers
const driversPath = path.join(__dirname, 'drivers');
const drivers = [];

if (fs.existsSync(driversPath)) {
    const driverDirs = fs.readdirSync(driversPath, { withFileTypes: true })
        .filter(dirent => dirent.isDirectory())
        .map(dirent => dirent.name);
    
    console.log(`📂 ${driverDirs.length} dossiers de drivers trouvés`);
    
    driverDirs.forEach(driverDir => {
        const driverComposePath = path.join(driversPath, driverDir, 'driver.compose.json');
        
        if (fs.existsSync(driverComposePath)) {
            try {
                const content = fs.readFileSync(driverComposePath, 'utf8');
                const driverConfig = JSON.parse(content);
                drivers.push(driverConfig);
                console.log(`✅ ${driverDir} - traité`);
            } catch (error) {
                console.log(`❌ ${driverDir} - erreur parsing: ${error.message}`);
            }
        } else {
            console.log(`⚠️  ${driverDir} - driver.compose.json manquant`);
        }
    });
}

// Créer le nouvel app.json
const appConfig = {
    "id": "com.tuya.zigbee",
    "version": "1.0.0",
    "compatibility": ">=5.0.0",
    "category": ["appliances"],
    "name": {
        "en": "Tuya Zigbee",
        "fr": "Tuya Zigbee",
        "nl": "Tuya Zigbee",
        "ta": "Tuya Zigbee"
    },
    "description": {
        "en": "Tuya Zigbee devices support with universal drivers",
        "fr": "Support des appareils Tuya Zigbee avec drivers universaux",
        "nl": "Ondersteuning voor Tuya Zigbee-apparaten met universele drivers",
        "ta": "Tuya Zigbee சாதனங்களுக்கான ஆதரவு உலகளாவிய drivers உடன்"
    },
    "author": {
        "name": "dlnraja",
        "email": "dylan.rajasekaram@gmail.com"
    },
    "contributors": [],
    "support": "mailto:dylan.rajasekaram@gmail.com",
    "homepage": "https://github.com/dlnraja/tuya_repair",
    "license": "MIT",
    "platforms": ["local"],
    "drivers": drivers,
    "images": {
        "small": "assets/small.svg",
        "large": "assets/large.svg"
    },
    "icon": "assets/icon.svg",
    "color": "#FF6B35"
};

// Sauvegarder
const appJsonPath = path.join(__dirname, 'app.json');
fs.writeFileSync(appJsonPath, JSON.stringify(appConfig, null, 2));

console.log('\n🎉 NOUVEAU APP.JSON CRÉÉ !');
console.log(`📊 Drivers inclus: ${drivers.length}`);
console.log(`📄 Fichier: ${appJsonPath}`);

// Vérifier la taille
const stats = fs.statSync(appJsonPath);
console.log(`📊 Taille: ${stats.size} bytes`);

// Vérification rapide
console.log('\n📋 VÉRIFICATION RAPIDE:');
console.log(`   - Drivers: ${drivers.length}`);
console.log(`   - Category: ${appConfig.category ? JSON.stringify(appConfig.category) : 'MANQUANT'}`);
console.log(`   - Platforms: ${appConfig.platforms ? JSON.stringify(appConfig.platforms) : 'MANQUANT'}`);

console.log('\n🎯 Prêt pour validation Homey !');
