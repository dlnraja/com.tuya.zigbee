#!/usr/bin/env node
'use strict';

'use strict';

const fs = require('fs');
const path = require('path');

const ROOT = process.cwd();
const SOURCES_DIR = path.join(ROOT, 'scripts', 'sources');
const PARSERS_DIR = path.join(SOURCES_DIR, 'parsers');
const DRIVERS_DIR = path.join(ROOT, 'drivers');
const REPORTS_DIR = path.join(PARSERS_DIR, 'reports');

// Fonction pour parser un fichier driver.compose.json
function parseDriverCompose(filePath) {
    try {
        const content = fs.readFileSync(filePath, 'utf8');
        const data = JSON.parse(content);
        
        return {
            path: filePath,
            data: data,
            isValid: true,
            errors: []
        };
    } catch (error) {
        return {
            path: filePath,
            data: null,
            isValid: false,
            errors: [error.message]
        };
    }
}

// Fonction pour parser un fichier device.js
function parseDeviceJs(filePath) {
    try {
        const content = fs.readFileSync(filePath, 'utf8');
        
        // Extraire les informations de base
        const manufacturerMatch = content.match(/manufacturerName\s*:\s*['"`]([^'"`]+)['"`]/i);
        const modelMatch = content.match(/modelId\s*:\s*['"`]([^'"`]+)['"`]/i);
        const productMatch = content.match(/productId\s*:\s*['"`]([^'"`]+)['"`]/i);
        
        return {
            path: filePath,
            manufacturerName: manufacturerMatch ? manufacturerMatch[1] : null,
            modelId: modelMatch ? modelMatch[1] : null,
            productId: productMatch ? productMatch[1] : null,
            isValid: true,
            errors: []
        };
    } catch (error) {
        return {
            path: filePath,
            data: null,
            isValid: false,
            errors: [error.message]
        };
    }
}

// Fonction pour analyser tous les drivers
function parseAllDrivers() {
    console.log('🚀 Début du parsing des drivers...');
    
    const results = {
        drivers: [],
        summary: {
            total: 0,
            valid: 0,
            invalid: 0,
            withCompose: 0,
            withDevice: 0,
            withBoth: 0
        }
    };
    
    function scanDirectory(dirPath, relativePath = '') {
        const items = fs.readdirSync(dirPath);
        
        for (const item of items) {
            const fullPath = path.join(dirPath, item);
            const itemRelativePath = path.join(relativePath, item);
            const stats = fs.statSync(fullPath);
            
            if (stats.isDirectory()) {
                scanDirectory(fullPath, itemRelativePath);
            } else if (item === 'driver.compose.json') {
                const composeData = parseDriverCompose(fullPath);
                const devicePath = path.join(dirPath, 'device.js');
                const deviceData = fs.existsSync(devicePath) ? parseDeviceJs(devicePath) : null;
                
                const driverInfo = {
                    path: itemRelativePath,
                    fullPath: fullPath,
                    compose: composeData,
                    device: deviceData,
                    hasCompose: true,
                    hasDevice: !!deviceData,
                    isValid: composeData.isValid && (!deviceData || deviceData.isValid)
                };
                
                results.drivers.push(driverInfo);
                results.summary.total++;
                
                if (driverInfo.isValid) results.summary.valid++;
                else results.summary.invalid++;
                
                if (driverInfo.hasCompose) results.summary.withCompose++;
                if (driverInfo.hasDevice) results.summary.withDevice++;
                if (driverInfo.hasCompose && driverInfo.hasDevice) results.summary.withBoth++;
            }
        }
    }
    
    if (fs.existsSync(DRIVERS_DIR)) {
        scanDirectory(DRIVERS_DIR);
    }
    
    return results;
}

// Fonction principale
function main() {
    try {
        // Créer les dossiers nécessaires
        [SOURCES_DIR, PARSERS_DIR, REPORTS_DIR].forEach(dir => {
            if (!fs.existsSync(dir)) {
                fs.mkdirSync(dir, { recursive: true });
            }
        });
        
        console.log('📁 Dossiers créés avec succès');
        
        // Parser tous les drivers
        const results = parseAllDrivers();
        
        // Sauvegarder le rapport
        const timestamp = new Date().toISOString().replace(/[:.]/g, '-');
        const reportPath = path.join(REPORTS_DIR, `driver-parsing-${timestamp}.json`);
        
        fs.writeFileSync(reportPath, JSON.stringify(results, null, 2));
        console.log(`\n✅ Rapport de parsing sauvegardé: ${reportPath}`);
        
        console.log('\n🎉 Parsing des drivers terminé avec succès !');
        console.log(`📊 Résumé:`);
        console.log(`  🚗 Total drivers: ${results.summary.total}`);
        console.log(`  ✅ Valides: ${results.summary.valid}`);
        console.log(`  ❌ Invalides: ${results.summary.invalid}`);
        console.log(`  📋 Avec compose: ${results.summary.withCompose}`);
        console.log(`  🔧 Avec device: ${results.summary.withDevice}`);
        console.log(`  🔄 Avec les deux: ${results.summary.withBoth}`);
        
    } catch (error) {
        console.error('❌ Erreur lors du parsing:', error);
        process.exit(1);
    }
}

if (require.main === module) {
    main();
}

module.exports = { parseAllDrivers, parseDriverCompose, parseDeviceJs };
