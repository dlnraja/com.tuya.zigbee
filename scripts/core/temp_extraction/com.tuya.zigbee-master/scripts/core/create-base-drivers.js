const fs = require('fs');
const path = require('path');

async function createBaseDrivers() {
    console.log('🔧 Création des drivers de base...');
    
    const baseDrivers = [
        {
            id: 'ts0001-switch',
            name: {
                en: 'Tuya TS0001 Switch',
                fr: 'Interrupteur Tuya TS0001',
                nl: 'Tuya TS0001 Schakelaar',
                ta: 'Tuya TS0001 சுவிட்ச்'
            },
            class: 'light',
            capabilities: ['onoff'],
            zigbee: {
                manufacturerName: 'Tuya',
                modelId: 'TS0001',
                clusters: ['genOnOff']
            }
        },
        {
            id: 'ts0002-switch',
            name: {
                en: 'Tuya TS0002 Switch',
                fr: 'Interrupteur Tuya TS0002',
                nl: 'Tuya TS0002 Schakelaar',
                ta: 'Tuya TS0002 சுவிட்ச்'
            },
            class: 'light',
            capabilities: ['onoff', 'onoff'],
            zigbee: {
                manufacturerName: 'Tuya',
                modelId: 'TS0002',
                clusters: ['genOnOff', 'genOnOff']
            }
        },
        {
            id: 'ts0003-switch',
            name: {
                en: 'Tuya TS0003 Switch',
                fr: 'Interrupteur Tuya TS0003',
                nl: 'Tuya TS0003 Schakelaar',
                ta: 'Tuya TS0003 சுவிட்ச்'
            },
            class: 'light',
            capabilities: ['onoff', 'onoff', 'onoff'],
            zigbee: {
                manufacturerName: 'Tuya',
                modelId: 'TS0003',
                clusters: ['genOnOff', 'genOnOff', 'genOnOff']
            }
        },
        {
            id: 'ts0601-switch',
            name: {
                en: 'Tuya TS0601 Switch',
                fr: 'Interrupteur Tuya TS0601',
                nl: 'Tuya TS0601 Schakelaar',
                ta: 'Tuya TS0601 சுவிட்ச்'
            },
            class: 'light',
            capabilities: ['onoff'],
            zigbee: {
                manufacturerName: 'Tuya',
                modelId: 'TS0601',
                clusters: ['genOnOff']
            }
        },
        {
            id: 'ts011f-plug',
            name: {
                en: 'Tuya TS011F Plug',
                fr: 'Prise Tuya TS011F',
                nl: 'Tuya TS011F Stekker',
                ta: 'Tuya TS011F பிளக்'
            },
            class: 'socket',
            capabilities: ['onoff', 'meter_power'],
            zigbee: {
                manufacturerName: 'Tuya',
                modelId: 'TS011F',
                clusters: ['genOnOff', 'seMetering']
            }
        }
    ];

    let createdCount = 0;

    for (const driver of baseDrivers) {
        const driverDir = path.join('drivers/tuya', driver.id);
        
        // Créer le dossier du driver
        if (!fs.existsSync(driverDir)) {
            fs.mkdirSync(driverDir, { recursive: true });
        }

        // Créer driver.compose.json
        const composePath = path.join(driverDir, 'driver.compose.json');
        fs.writeFileSync(composePath, JSON.stringify(driver, null, 2));

        // Créer device.js
        const deviceJs = `'use strict';

const { ZigbeeDevice } = require('homey-meshdriver');

class ${driver.id.replace(/-/g, '').replace(/([A-Z])/g, '$1')}Device extends ZigbeeDevice {
    async onMeshInit() {
        await super.onMeshInit();
        
        // Log device initialization
        this.log('${driver.name.en} initialized');
        
        // Register capabilities
        ${driver.capabilities.map(cap => `this.registerCapability('${cap}', 'genOnOff');`).join('\n        ')}
    }
}

module.exports = ${driver.id.replace(/-/g, '').replace(/([A-Z])/g, '$1')}Device;`;

        const devicePath = path.join(driverDir, 'device.js');
        fs.writeFileSync(devicePath, deviceJs);

        createdCount++;
        console.log(`✅ Driver créé: ${driver.id}`);
    }

    console.log(`🎉 ${createdCount} drivers de base créés avec succès!`);
    return createdCount;
}

async function validateProject() {
    console.log('🔍 Validation du projet...');
    
    try {
        // Vérifier app.json
        if (fs.existsSync('app.json')) {
            const appJson = JSON.parse(fs.readFileSync('app.json', 'utf8'));
            console.log('✅ app.json valide');
        } else {
            console.log('❌ app.json manquant');
            return false;
        }

        // Vérifier app.js
        if (fs.existsSync('app.js')) {
            console.log('✅ app.js présent');
        } else {
            console.log('❌ app.js manquant');
            return false;
        }

        // Vérifier les drivers
        const driversDir = 'drivers/tuya';
        if (fs.existsSync(driversDir)) {
            const driverDirs = fs.readdirSync(driversDir);
            console.log(`✅ ${driverDirs.length} drivers trouvés dans drivers/tuya/`);
            
            let validDrivers = 0;
            for (const driverDir of driverDirs) {
                const composePath = path.join(driversDir, driverDir, 'driver.compose.json');
                const devicePath = path.join(driversDir, driverDir, 'device.js');
                
                if (fs.existsSync(composePath) && fs.existsSync(devicePath)) {
                    validDrivers++;
                }
            }
            console.log(`✅ ${validDrivers} drivers valides`);
        }

        // Vérifier la documentation
        const requiredDocs = ['README.md', 'CHANGELOG.md', 'drivers-matrix.md'];
        for (const doc of requiredDocs) {
            if (fs.existsSync(doc)) {
                console.log(`✅ ${doc} présent`);
            } else {
                console.log(`❌ ${doc} manquant`);
            }
        }

        console.log('✅ Validation du projet terminée avec succès!');
        return true;

    } catch (error) {
        console.error('❌ Erreur lors de la validation:', error.message);
        return false;
    }
}

async function main() {
    console.log('🚀 Début de la création des drivers de base...');
    
    // Créer les drivers de base
    const createdCount = await createBaseDrivers();
    
    // Valider le projet
    const isValid = await validateProject();
    
    if (isValid) {
        console.log('🎉 Projet validé avec succès!');
        console.log(`📊 ${createdCount} drivers créés`);
    } else {
        console.log('❌ Projet invalide');
    }
    
    return { createdCount, isValid };
}

// Exécuter si appelé directement
if (require.main === module) {
    main().then(result => {
        console.log('✅ Script terminé avec succès');
        process.exit(0);
    }).catch(error => {
        console.error('❌ Erreur:', error);
        process.exit(1);
    });
}

module.exports = { createBaseDrivers, validateProject }; 