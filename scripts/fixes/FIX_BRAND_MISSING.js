#!/usr/bin/env node

/**
 * FIX BRAND MISSING - CRITICAL FIX
 * 
 * PROBLÈME CRITIQUE IDENTIFIÉ:
 * L'app n'apparaît pas dans la liste des marques lors du pairing d'appareils Zigbee
 * car la section "brand" est MANQUANTE dans app.json
 * 
 * SOLUTION:
 * Ajouter la configuration brand obligatoire dans app.json
 */

const fs = require('fs');
const path = require('path');

console.log('\n🚨 FIX BRAND MISSING - CRITICAL\n');
console.log('═'.repeat(70));

const APP_JSON_PATH = path.join(__dirname, '..', '..', 'app.json');

console.log('\n🔍 Analyse du problème...\n');

// Lire app.json
const appJson = JSON.parse(fs.readFileSync(APP_JSON_PATH, 'utf8'));

console.log('❌ PROBLÈME IDENTIFIÉ:');
console.log('   L\'app n\'apparaît pas dans la liste des marques Homey');
console.log('   lors de l\'ajout d\'un appareil Zigbee\n');

console.log('🔍 CAUSE ROOT:');
if (!appJson.brand) {
    console.log('   ❌ Section "brand" MANQUANTE dans app.json');
    console.log('   ❌ Homey ne peut pas afficher l\'app dans la liste des marques');
    console.log('   ❌ Tous les appareils passent en "Zigbee inconnu générique"\n');
} else {
    console.log('   ✅ Section "brand" présente');
    console.log('   Brand ID:', appJson.brand.id);
    console.log('\n   ℹ️  Le problème peut être ailleurs (vérifier drivers)\n');
}

if (!appJson.platforms) {
    console.log('   ⚠️  Section "platforms" manquante (recommandée)');
}

if (!appJson.connectivity) {
    console.log('   ⚠️  Section "connectivity" manquante (recommandée)\n');
}

console.log('═'.repeat(70));
console.log('\n✅ SOLUTION:\n');

// Backup
const backupPath = APP_JSON_PATH + '.backup-brand-fix';
fs.writeFileSync(backupPath, fs.readFileSync(APP_JSON_PATH));
console.log(`📦 Backup créé: ${backupPath}\n`);

let modified = false;

// Ajouter brand si manquant
if (!appJson.brand) {
    console.log('🔧 Ajout de la section "brand"...');
    
    // Trouver la position après "author" pour insérer brand
    const newBrand = {
        id: "tuya"
    };
    
    // Créer un nouvel objet avec brand inséré après author
    const orderedAppJson = {};
    
    for (const [key, value] of Object.entries(appJson)) {
        orderedAppJson[key] = value;
        
        // Après "author", insérer "brand"
        if (key === 'author') {
            orderedAppJson.brand = newBrand;
        }
    }
    
    // Remplacer appJson par la version ordonnée
    Object.keys(appJson).forEach(key => delete appJson[key]);
    Object.assign(appJson, orderedAppJson);
    
    modified = true;
    console.log('   ✅ Section "brand" ajoutée: { id: "tuya" }\n');
}

// Ajouter platforms si manquant
if (!appJson.platforms) {
    console.log('🔧 Ajout de la section "platforms"...');
    
    const newPlatforms = ["local"];
    
    // Insérer après "permissions"
    const orderedAppJson = {};
    
    for (const [key, value] of Object.entries(appJson)) {
        orderedAppJson[key] = value;
        
        if (key === 'permissions') {
            orderedAppJson.platforms = newPlatforms;
        }
    }
    
    Object.keys(appJson).forEach(key => delete appJson[key]);
    Object.assign(appJson, orderedAppJson);
    
    modified = true;
    console.log('   ✅ Section "platforms" ajoutée: ["local"]\n');
}

// Ajouter connectivity si manquant
if (!appJson.connectivity) {
    console.log('🔧 Ajout de la section "connectivity"...');
    
    const newConnectivity = ["zigbee"];
    
    // Insérer après "platforms"
    const orderedAppJson = {};
    
    for (const [key, value] of Object.entries(appJson)) {
        orderedAppJson[key] = value;
        
        if (key === 'platforms') {
            orderedAppJson.connectivity = newConnectivity;
        }
    }
    
    Object.keys(appJson).forEach(key => delete appJson[key]);
    Object.assign(appJson, orderedAppJson);
    
    modified = true;
    console.log('   ✅ Section "connectivity" ajoutée: ["zigbee"]\n');
}

if (modified) {
    // Sauvegarder app.json corrigé
    fs.writeFileSync(APP_JSON_PATH, JSON.stringify(appJson, null, 2));
    
    console.log('═'.repeat(70));
    console.log('\n✅ APP.JSON CORRIGÉ!\n');
    
    console.log('📋 NOUVELLES SECTIONS AJOUTÉES:\n');
    
    if (appJson.platforms) {
        console.log('   "platforms": ["local"]');
    }
    
    if (appJson.connectivity) {
        console.log('   "connectivity": ["zigbee"]');
    }
    
    if (appJson.brand) {
        console.log('   "brand": { "id": "tuya" }');
    }
    
    console.log('\n═'.repeat(70));
    console.log('\n🎯 RÉSULTAT ATTENDU:\n');
    console.log('✅ L\'app "Universal Tuya Zigbee" apparaîtra maintenant');
    console.log('   dans la liste des marques lors du pairing Zigbee\n');
    console.log('✅ Les appareils Tuya seront détectés automatiquement');
    console.log('   par l\'app au lieu de passer en "Zigbee générique"\n');
    
    console.log('═'.repeat(70));
    console.log('\n📝 PROCHAINES ÉTAPES:\n');
    console.log('1. Tester localement: homey app run');
    console.log('2. Tester pairing d\'un appareil Tuya');
    console.log('3. Vérifier que l\'app apparaît dans la liste');
    console.log('4. Commit: git add app.json && git commit');
    console.log('5. Push: git push origin master\n');
    
} else {
    console.log('═'.repeat(70));
    console.log('\nℹ️  Aucune modification nécessaire');
    console.log('   Les sections brand/platforms/connectivity sont déjà présentes\n');
    console.log('🔍 VÉRIFIER AUTRES CAUSES POSSIBLES:\n');
    console.log('1. Cache Homey: Désinstaller/Réinstaller l\'app');
    console.log('2. Drivers: Vérifier zigbee.manufacturerName dans drivers');
    console.log('3. Version: Vérifier version de l\'app installée');
    console.log('4. Publication: Vérifier que l\'app est bien publiée\n');
}

console.log('✅ FIX BRAND COMPLETE!\n');
