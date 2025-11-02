#!/usr/bin/env node

/**
 * FIX BATTERY INDICATORS - ALL DRIVERS
 * 
 * PROBLÈME (Diagnostic 5bbbabc5):
 * "pas de petit icône de batterie en indicateur de batterie dans la page 
 * où il y a tous les devices (homey appelle ça indicateur d'état et il 
 * est sur désactivé)"
 * 
 * SOLUTION:
 * Ajouter maintenanceAction: true à tous les drivers avec measure_battery
 * pour activer l'icône batterie sur les miniatures devices
 */

const fs = require('fs');
const path = require('path');

console.log('\n🔋 FIX BATTERY INDICATORS - ALL DRIVERS\n');
console.log('═'.repeat(70));

const DRIVERS_DIR = path.join(__dirname, '..', '..', 'drivers');
const APP_JSON_PATH = path.join(__dirname, '..', '..', 'app.json');

// Lire app.json
const appJson = JSON.parse(fs.readFileSync(APP_JSON_PATH, 'utf8'));

console.log('\n🔍 Analyse des drivers avec batterie...\n');

let totalDrivers = 0;
let driversWithBattery = 0;
let driversFixed = 0;
const fixedList = [];

// Parcourir tous les drivers dans app.json
if (appJson.drivers) {
    totalDrivers = appJson.drivers.length;
    
    for (const driver of appJson.drivers) {
        // Vérifier si le driver a measure_battery
        if (driver.capabilities && driver.capabilities.includes('measure_battery')) {
            driversWithBattery++;
            
            // Vérifier si maintenanceAction est déjà configuré
            const hasMaintenanceAction = 
                driver.capabilitiesOptions?.measure_battery?.maintenanceAction === true;
            
            if (!hasMaintenanceAction) {
                // Fixer!
                if (!driver.capabilitiesOptions) {
                    driver.capabilitiesOptions = {};
                }
                if (!driver.capabilitiesOptions.measure_battery) {
                    driver.capabilitiesOptions.measure_battery = {};
                }
                
                driver.capabilitiesOptions.measure_battery.maintenanceAction = true;
                
                driversFixed++;
                fixedList.push(driver.id);
                console.log(`   ✅ Fixed: ${driver.id}`);
            } else {
                console.log(`   ✓  OK:    ${driver.id} (déjà configuré)`);
            }
        }
    }
}

console.log('\n═'.repeat(70));
console.log('\n📊 RÉSULTATS:\n');
console.log(`   Total drivers:              ${totalDrivers}`);
console.log(`   Drivers avec batterie:      ${driversWithBattery}`);
console.log(`   Drivers à corriger:         ${driversFixed}`);
console.log(`   Drivers déjà OK:            ${driversWithBattery - driversFixed}\n`);

if (driversFixed > 0) {
    // Backup
    const backupPath = APP_JSON_PATH + '.backup-battery-indicators';
    fs.writeFileSync(backupPath, fs.readFileSync(APP_JSON_PATH));
    console.log(`📦 Backup créé: ${backupPath}\n`);
    
    // Sauvegarder app.json
    fs.writeFileSync(APP_JSON_PATH, JSON.stringify(appJson, null, 2));
    
    console.log('═'.repeat(70));
    console.log('\n✅ APP.JSON CORRIGÉ!\n');
    
    console.log('🎯 CE QUI VA CHANGER:\n');
    console.log('AVANT:');
    console.log('   📱 Device miniature sans icône batterie');
    console.log('   ❌ User doit ouvrir device pour voir batterie\n');
    
    console.log('APRÈS:');
    console.log('   📱🔋 Device miniature avec icône batterie visible');
    console.log('   ✅ User voit batterie sur aperçu devices');
    console.log('   ✅ Notification automatique si batterie faible\n');
    
    console.log('═'.repeat(70));
    console.log('\n📝 CONFIGURATION AJOUTÉE:\n');
    console.log('```json');
    console.log('"capabilitiesOptions": {');
    console.log('  "measure_battery": {');
    console.log('    "maintenanceAction": true  // ✅ Active l\'indicateur');
    console.log('  }');
    console.log('}');
    console.log('```\n');
    
} else {
    console.log('ℹ️  Aucune correction nécessaire\n');
    console.log('   Tous les drivers avec batterie ont déjà maintenanceAction activé!\n');
}

console.log('═'.repeat(70));
console.log('\n📝 PROCHAINES ÉTAPES:\n');
console.log('1. Valider: homey app validate');
console.log('2. Tester: homey app run');
console.log('3. Vérifier icônes batterie sur miniatures');
console.log('4. Commit: git add app.json && git commit');
console.log('5. Push: git push origin master\n');

console.log('✅ FIX BATTERY INDICATORS COMPLETE!\n');
