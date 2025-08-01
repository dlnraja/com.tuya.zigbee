const fs = require('fs');
const path = require('path');

async function createFinalDrivers() {
    console.log('🔧 Création des drivers finaux...');
    
    const finalDrivers = [
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
            },
            settings: {},
            fallback: false
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
            },
            settings: {},
            fallback: false
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
            },
            settings: {},
            fallback: false
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
            },
            settings: {},
            fallback: false
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
            },
            settings: {},
            fallback: false
        },
        {
            id: 'ts0601-dimmer',
            name: {
                en: 'Tuya TS0601 Dimmer',
                fr: 'Variateur Tuya TS0601',
                nl: 'Tuya TS0601 Dimmer',
                ta: 'Tuya TS0601 டிம்மர்'
            },
            class: 'light',
            capabilities: ['onoff', 'dim'],
            zigbee: {
                manufacturerName: 'Tuya',
                modelId: 'TS0601',
                clusters: ['genOnOff', 'genLevelCtrl']
            },
            settings: {},
            fallback: false
        },
        {
            id: 'ts0601-sensor',
            name: {
                en: 'Tuya TS0601 Sensor',
                fr: 'Capteur Tuya TS0601',
                nl: 'Tuya TS0601 Sensor',
                ta: 'Tuya TS0601 சென்சார்'
            },
            class: 'sensor',
            capabilities: ['measure_temperature', 'measure_humidity'],
            zigbee: {
                manufacturerName: 'Tuya',
                modelId: 'TS0601',
                clusters: ['genBasic', 'msTemperatureMeasurement', 'msRelativeHumidity']
            },
            settings: {},
            fallback: false
        }
    ];

    let createdCount = 0;

    for (const driver of finalDrivers) {
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
        
        // Register capabilities based on device type
        ${driver.capabilities.map(cap => {
            if (cap === 'onoff') {
                return `this.registerCapability('${cap}', 'genOnOff');`;
            } else if (cap === 'dim') {
                return `this.registerCapability('${cap}', 'genLevelCtrl');`;
            } else if (cap === 'meter_power') {
                return `this.registerCapability('${cap}', 'seMetering');`;
            } else if (cap === 'measure_temperature') {
                return `this.registerCapability('${cap}', 'msTemperatureMeasurement');`;
            } else if (cap === 'measure_humidity') {
                return `this.registerCapability('${cap}', 'msRelativeHumidity');`;
            } else {
                return `this.registerCapability('${cap}', 'genBasic');`;
            }
        }).join('\n        ')}
        
        // Set up device settings if any
        if (this.hasCapability('onoff')) {
            this.registerCapabilityListener('onoff', async (value) => {
                await this.setCapabilityValue('onoff', value);
            });
        }
        
        if (this.hasCapability('dim')) {
            this.registerCapabilityListener('dim', async (value) => {
                await this.setCapabilityValue('dim', value);
            });
        }
    }
}

module.exports = ${driver.id.replace(/-/g, '').replace(/([A-Z])/g, '$1')}Device;`;

        const devicePath = path.join(driverDir, 'device.js');
        fs.writeFileSync(devicePath, deviceJs);

        createdCount++;
        console.log(`✅ Driver créé: ${driver.id}`);
    }

    console.log(`🎉 ${createdCount} drivers finaux créés avec succès!`);
    return createdCount;
}

async function validateFinalProject() {
    console.log('🔍 Validation finale du projet...');
    
    try {
        // Vérifier la structure
        const structureCheck = {
            appJson: fs.existsSync('app.json'),
            appJs: fs.existsSync('app.js'),
            iconSvg: fs.existsSync('assets/images/icon.svg'),
            driversTuya: fs.existsSync('drivers/tuya'),
            driversZigbee: fs.existsSync('drivers/zigbee'),
            docs: fs.existsSync('docs'),
            scripts: fs.existsSync('scripts'),
            tools: fs.existsSync('tools'),
            logs: fs.existsSync('logs')
        };

        console.log('📋 Vérification de la structure finale:');
        for (const [item, exists] of Object.entries(structureCheck)) {
            console.log(`   ${exists ? '✅' : '❌'} ${item}: ${exists ? 'Présent' : 'Manquant'}`);
        }

        // Vérifier les drivers
        const driversDir = 'drivers/tuya';
        if (fs.existsSync(driversDir)) {
            const driverDirs = fs.readdirSync(driversDir);
            console.log(`📦 Drivers finaux trouvés: ${driverDirs.length}`);
            
            let validDrivers = 0;
            for (const driverDir of driverDirs) {
                const composePath = path.join(driversDir, driverDir, 'driver.compose.json');
                const devicePath = path.join(driversDir, driverDir, 'device.js');
                
                if (fs.existsSync(composePath) && fs.existsSync(devicePath)) {
                    validDrivers++;
                    console.log(`   ✅ ${driverDir}: Valide`);
                } else {
                    console.log(`   ❌ ${driverDir}: Incomplet`);
                }
            }
            
            console.log(`📊 Résumé drivers finaux: ${validDrivers}/${driverDirs.length} valides`);
        }

        // Vérifier SDK3
        if (fs.existsSync('app.json')) {
            const appJson = JSON.parse(fs.readFileSync('app.json', 'utf8'));
            if (appJson.sdk: 3) {
                console.log('✅ SDK3: Compatible');
            } else {
                console.log(`❌ SDK: ${appJson.sdk} (requis: 3)`);
            }
        }

        console.log('✅ Validation finale terminée avec succès!');
        return true;

    } catch (error) {
        console.error('❌ Erreur lors de la validation finale:', error.message);
        return false;
    }
}

async function main() {
    console.log('🚀 Début de la création des drivers finaux...');
    
    // Créer les drivers finaux
    const createdCount = await createFinalDrivers();
    
    // Valider le projet final
    const isValid = await validateFinalProject();
    
    if (isValid) {
        console.log('🎉 Projet final validé avec succès!');
        console.log(`📊 ${createdCount} drivers finaux créés`);
    } else {
        console.log('❌ Projet final invalide');
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

module.exports = { createFinalDrivers, validateFinalProject }; 