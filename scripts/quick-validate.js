#!/usr/bin/env node

console.log('🚀 VALIDATION RAPIDE - VÉRIFICATION CRITIQUE');
console.log('=' .repeat(50));

const fs = require('fs');
const path = require('path');

try {
    // 1. Vérifier app.json
    console.log('\n🔍 Vérification app.json...');
    const appJson = JSON.parse(fs.readFileSync('app.json', 'utf8'));
    
    const checks = [
        { name: 'id', value: appJson.id, required: true },
        { name: 'version', value: appJson.version, required: true },
        { name: 'sdk', value: appJson.sdk, required: true, expected: 3 },
        { name: 'compose.enable', value: appJson.compose?.enable, required: true, expected: true },
        { name: 'name.en', value: appJson.name?.en, required: true },
        { name: 'description', value: appJson.description, required: true }
    ];
    
    let errors = 0;
    for (const check of checks) {
        if (check.required && !check.value) {
            console.log(`❌ ${check.name}: MANQUANT`);
            errors++;
        } else if (check.expected !== undefined && check.value !== check.expected) {
            console.log(`❌ ${check.name}: ${check.value} (attendu: ${check.expected})`);
            errors++;
        } else {
            console.log(`✅ ${check.name}: OK`);
        }
    }
    
    // 2. Vérifier drivers
    console.log('\n🔍 Vérification structure drivers...');
    if (fs.existsSync('drivers')) {
        const driverTypes = fs.readdirSync('drivers');
        let totalDrivers = 0;
        let validDrivers = 0;
        
        for (const driverType of driverTypes) {
            if (driverType === '_common') continue;
            
            const driverTypePath = path.join('drivers', driverType);
            if (fs.statSync(driverTypePath).isDirectory()) {
                const categories = fs.readdirSync(driverTypePath);
                
                for (const category of categories) {
                    const categoryPath = path.join(driverTypePath, category);
                    if (fs.statSync(categoryPath).isDirectory()) {
                        const drivers = fs.readdirSync(categoryPath);
                        
                        for (const driver of drivers) {
                            const driverPath = path.join(categoryPath, driver);
                            if (fs.statSync(driverPath).isDirectory()) {
                                totalDrivers++;
                                
                                const hasDriverJs = fs.existsSync(path.join(driverPath, 'driver.js'));
                                const hasDeviceJs = fs.existsSync(path.join(driverPath, 'device.js'));
                                const hasCompose = fs.existsSync(path.join(driverPath, 'driver.compose.json'));
                                
                                if (hasDriverJs && hasDeviceJs && hasCompose) {
                                    validDrivers++;
                                }
                            }
                        }
                    }
                }
            }
        }
        
        console.log(`📊 Drivers: ${validDrivers}/${totalDrivers} valides`);
        
        if (validDrivers === totalDrivers) {
            console.log('✅ Tous les drivers ont les fichiers requis');
        } else {
            console.log('⚠️  Certains drivers sont incomplets');
        }
    }
    
    // 3. Rapport final
    console.log('\n📋 RAPPORT FINAL');
    console.log('=' .repeat(50));
    
    if (errors === 0) {
        console.log('🎉 VALIDATION RÉUSSIE !');
        console.log('✅ L\'app est prête pour la validation Homey complète');
        console.log('\n🚀 PROCHAINES ÉTAPES:');
        console.log('  1. npx homey app validate (validation complète)');
        console.log('  2. npx homey app run (test local)');
        console.log('  3. git add . && git commit && git push');
    } else {
        console.log(`❌ ${errors} erreur(s) détectée(s)`);
        console.log('🔧 Corrigez ces erreurs avant de continuer');
    }
    
} catch (error) {
    console.error('❌ Erreur critique:', error.message);
    process.exit(1);
}
