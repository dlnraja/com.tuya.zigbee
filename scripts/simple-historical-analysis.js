#!/usr/bin/env node
/**
 * Script simplifié d'analyse des README historiques
 * Version: 1.0.12-20250729-1530
 */
const fs = require('fs');
const { execSync } = require('child_process');

console.log('🚀 === ANALYSE SIMPLIFIÉE DES README HISTORIQUES ===');

// Commits à analyser
const commits = [
    'c736301a', // README récent
    'e112726a', // README ancien
    'e8936adf'  // README très ancien
];

const allDrivers = [];

// Analyser chaque commit
for (const commit of commits) {
    try {
        console.log(`\n=== ANALYSE COMMIT: ${commit} ===`);
        
        // Extraire le README
        const readmeContent = execSync(`git show ${commit}:README.md`, { encoding: 'utf8' });
        
        // Chercher les drivers dans le contenu
        const lines = readmeContent.split('\n');
        let inDriverSection = false;
        let currentProtocol = '';
        
        for (let i = 0; i < lines.length; i++) {
            const line = lines[i].trim();
            
            // Détecter les sections
            if (line.includes('Tuya Drivers') || line.includes('🔌 Tuya')) {
                currentProtocol = 'tuya';
                inDriverSection = true;
                console.log(`Section Tuya détectée dans ${commit}`);
            } else if (line.includes('Zigbee Drivers') || line.includes('📡 Zigbee')) {
                currentProtocol = 'zigbee';
                inDriverSection = true;
                console.log(`Section Zigbee détectée dans ${commit}`);
            }
            
            // Extraire les noms de drivers
            if (inDriverSection && line.includes('-') && !line.startsWith('#')) {
                const driverMatch = line.match(/\*\*([^*]+)\*\*/);
                if (driverMatch) {
                    const driverName = driverMatch[1].trim();
                    
                    // Déterminer la catégorie
                    let category = 'generic';
                    if (driverName.includes('sensor')) {
                        category = 'sensors';
                    } else if (driverName.includes('switch') || driverName.includes('light') || driverName.includes('plug')) {
                        category = 'controllers';
                    } else if (driverName.includes('motion') || driverName.includes('contact') || driverName.includes('lock')) {
                        category = 'security';
                    } else if (driverName.includes('thermostat') || driverName.includes('hvac') || driverName.includes('valve')) {
                        category = 'climate';
                    }
                    
                    allDrivers.push({
                        name: driverName,
                        protocol: currentProtocol,
                        category: category,
                        source: `README-${commit}`,
                        commit: commit
                    });
                    
                    console.log(`Driver extrait: ${driverName} (${currentProtocol}/${category})`);
                }
            }
            
            // Sortir de la section
            if (line.startsWith('##') && inDriverSection) {
                inDriverSection = false;
            }
        }
        
    } catch (error) {
        console.log(`Erreur analyse commit ${commit}: ${error.message}`);
    }
}

// Supprimer les doublons
const uniqueDrivers = [];
const seen = new Set();

allDrivers.forEach(driver => {
    const key = `${driver.name}-${driver.protocol}`;
    if (!seen.has(key)) {
        seen.add(key);
        uniqueDrivers.push(driver);
    }
});

console.log(`\n=== RÉSUMÉ ===`);
console.log(`Total drivers extraits: ${allDrivers.length}`);
console.log(`Drivers uniques: ${uniqueDrivers.length}`);

// Créer les drivers
let created = 0;
for (const driver of uniqueDrivers) {
    try {
        const driverPath = `./drivers/${driver.protocol}/${driver.category}/${driver.name}`;
        fs.mkdirSync(driverPath, { recursive: true });
        
        // Créer driver.compose.json
        const composeJson = {
            id: driver.name,
            title: {
                en: driver.name.replace(/-/g, ' ').replace(/\b\w/g, l => l.toUpperCase()),
                fr: driver.name.replace(/-/g, ' ').replace(/\b\w/g, l => l.toUpperCase()),
                nl: driver.name.replace(/-/g, ' ').replace(/\b\w/g, l => l.toUpperCase()),
                ta: driver.name.replace(/-/g, ' ').replace(/\b\w/g, l => l.toUpperCase())
            },
            description: {
                en: `${driver.protocol.toUpperCase()} driver for ${driver.name} (recovered from historical README)`,
                fr: `Driver ${driver.protocol.toUpperCase()} pour ${driver.name} (récupéré depuis README historique)`,
                nl: `${driver.protocol.toUpperCase()} driver voor ${driver.name} (hersteld van historische README)`,
                ta: `${driver.name} க்கான ${driver.protocol.toUpperCase()} டிரைவர் (வரலாற்று README இலிருந்து மீட்டெடுக்கப்பட்டது)`
            },
            category: driver.category,
            protocol: driver.protocol,
            manufacturer: 'Historical Recovery',
            source: driver.source,
            commit: driver.commit,
            capabilities: ['onoff'],
            clusters: ['genBasic'],
            version: '1.0.0',
            author: 'dlnraja <dylan.rajasekaram+homey@gmail.com>',
            createdAt: new Date().toISOString(),
            recoveredFrom: 'Historical README Analysis'
        };
        
        fs.writeFileSync(`${driverPath}/driver.compose.json`, JSON.stringify(composeJson, null, 2));
        
        // Créer device.js
        const deviceJs = `'use strict';

const { ${driver.protocol === 'tuya' ? 'TuyaDevice' : 'ZigbeeDevice'} } = require('homey-${driver.protocol === 'tuya' ? 'tuya' : 'meshdriver'}');

class ${driver.name.replace(/-/g, '').replace(/\b\w/g, l => l.toUpperCase())}Device extends ${driver.protocol === 'tuya' ? 'TuyaDevice' : 'ZigbeeDevice'} {
    
    async onInit() {
        await super.onInit();
        this.log('${driver.name} device initialized (historical recovery)');
        this.registerCapability('onoff', true);
    }
    
    async onUninit() {
        await super.onUninit();
        this.log('${driver.name} device uninitialized');
    }
}

module.exports = ${driver.name.replace(/-/g, '').replace(/\b\w/g, l => l.toUpperCase())}Device;`;
        
        fs.writeFileSync(`${driverPath}/device.js`, deviceJs);
        
        created++;
        console.log(`Driver créé: ${driver.name}`);
        
    } catch (error) {
        console.log(`Erreur création driver ${driver.name}: ${error.message}`);
    }
}

console.log(`\n🎉 ANALYSE TERMINÉE!`);
console.log(`Drivers créés: ${created}/${uniqueDrivers.length}`);