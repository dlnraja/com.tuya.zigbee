#!/usr/bin/env node

const fs = require('fs');
const path = require('path');

console.log('🎯 VALIDATION FINALE - ANALYSE COMPLÈTE');
console.log('========================================');

// Fonction de validation des clusters
function validateClusters() {
    console.log('\n🔍 VALIDATION DES CLUSTERS...');
    
    if (!fs.existsSync('app.json')) {
        console.log('❌ app.json non trouvé');
        return false;
    }
    
    const content = fs.readFileSync('app.json', 'utf8');
    const clusterMatches = content.match(/"clusters":\s*\[[^\]]*\]/g);
    
    if (!clusterMatches) {
        console.log('❌ Aucune section clusters trouvée');
        return false;
    }
    
    console.log(`📊 ${clusterMatches.length} sections clusters trouvées`);
    
    // Vérifier si les clusters sont numériques
    const numericClusters = clusterMatches.filter(match => 
        match.match(/"clusters":\s*\[\s*\d+/)
    );
    
    const nonNumericClusters = clusterMatches.filter(match => 
        !match.match(/"clusters":\s*\[\s*\d+/)
    );
    
    console.log(`✅ ${numericClusters.length} sections avec clusters numériques`);
    
    if (nonNumericClusters.length > 0) {
        console.log(`❌ ${nonNumericClusters.length} sections avec clusters non numériques`);
        console.log('📋 Exemples de clusters non numériques:');
        nonNumericClusters.slice(0, 3).forEach((cluster, index) => {
            console.log(`   ${index + 1}. ${cluster}`);
        });
        return false;
    }
    
    console.log('🎉 TOUS les clusters sont numériques !');
    return true;
}

// Fonction de validation des drivers
function validateDrivers() {
    console.log('\n🔍 VALIDATION DES DRIVERS...');
    
    const driversPath = path.join(__dirname, 'drivers');
    
    if (!fs.existsSync(driversPath)) {
        console.log('❌ Dossier drivers non trouvé');
        return false;
    }
    
    const driverDirs = fs.readdirSync(driversPath, { withFileTypes: true })
        .filter(dirent => dirent.isDirectory())
        .map(dirent => dirent.name);
    
    console.log(`📂 ${driverDirs.length} dossiers de drivers trouvés`);
    
    let validDrivers = 0;
    let invalidDrivers = 0;
    
    for (const driverDir of driverDirs) {
        const driverComposePath = path.join(driversPath, driverDir, 'driver.compose.json');
        
        if (!fs.existsSync(driverComposePath)) {
            console.log(`⚠️  ${driverDir}: driver.compose.json manquant`);
            invalidDrivers++;
            continue;
        }
        
        try {
            const content = fs.readFileSync(driverComposePath, 'utf8');
            const driverConfig = JSON.parse(content);
            
            // Vérifier la structure
            if (driverConfig.zigbee && 
                driverConfig.zigbee.manufacturerName && 
                driverConfig.zigbee.productId && 
                driverConfig.zigbee.endpoints) {
                
                // Vérifier les clusters
                let clustersValid = true;
                for (const endpointId in driverConfig.zigbee.endpoints) {
                    const endpoint = driverConfig.zigbee.endpoints[endpointId];
                    if (endpoint.clusters && Array.isArray(endpoint.clusters)) {
                        if (!endpoint.clusters.every(c => typeof c === 'number')) {
                            clustersValid = false;
                            break;
                        }
                    }
                }
                
                if (clustersValid) {
                    validDrivers++;
                } else {
                    console.log(`❌ ${driverDir}: clusters non numériques`);
                    invalidDrivers++;
                }
            } else {
                console.log(`❌ ${driverDir}: structure zigbee incomplète`);
                invalidDrivers++;
            }
            
        } catch (error) {
            console.log(`❌ ${driverDir}: erreur de parsing - ${error.message}`);
            invalidDrivers++;
        }
    }
    
    console.log(`\n📊 RÉSUMÉ DRIVERS:`);
    console.log(`   - Valides: ${validDrivers}`);
    console.log(`   - Invalides: ${invalidDrivers}`);
    console.log(`   - Total: ${driverDirs.length}`);
    
    return invalidDrivers === 0;
}

// Fonction de validation de la structure générale
function validateStructure() {
    console.log('\n🔍 VALIDATION DE LA STRUCTURE...');
    
    try {
        const content = fs.readFileSync('app.json', 'utf8');
        const appConfig = JSON.parse(content);
        
        // Vérifications de base
        const checks = [
            { name: 'ID', valid: !!appConfig.id },
            { name: 'Version', valid: !!appConfig.version },
            { name: 'Platforms', valid: Array.isArray(appConfig.platforms) },
            { name: 'Drivers', valid: Array.isArray(appConfig.drivers) },
            { name: 'Author', valid: !!appConfig.author?.name }
        ];
        
        let allValid = true;
        checks.forEach(check => {
            if (check.valid) {
                console.log(`✅ ${check.name}: OK`);
            } else {
                console.log(`❌ ${check.name}: MANQUANT`);
                allValid = false;
            }
        });
        
        if (appConfig.drivers) {
            console.log(`📊 Nombre de drivers: ${appConfig.drivers.length}`);
        }
        
        return allValid;
        
    } catch (error) {
        console.log(`❌ Erreur de validation structure: ${error.message}`);
        return false;
    }
}

// Exécution principale
console.log('🚀 Début de la validation finale...\n');

const results = {
    clusters: validateClusters(),
    drivers: validateDrivers(),
    structure: validateStructure()
};

console.log('\n📊 RÉSUMÉ FINAL:');
console.log('==================');
console.log(`🔍 Clusters: ${results.clusters ? '✅ VALIDE' : '❌ INVALIDE'}`);
console.log(`🔍 Drivers: ${results.drivers ? '✅ VALIDE' : '❌ INVALIDE'}`);
console.log(`🔍 Structure: ${results.structure ? '✅ VALIDE' : '❌ INVALIDE'}`);

const allValid = Object.values(results).every(r => r);

if (allValid) {
    console.log('\n🎉 VALIDATION COMPLÈTE RÉUSSIE !');
    console.log('🚀 Prêt pour validation Homey');
    console.log('📋 Prochaines étapes:');
    console.log('   1. homey app validate');
    console.log('   2. Tests des drivers');
    console.log('   3. Enrichissement continu');
} else {
    console.log('\n⚠️  VALIDATION INCOMPLÈTE');
    console.log('🔧 Corrections nécessaires avant validation Homey');
}

console.log('\n🎯 Validation finale terminée');
