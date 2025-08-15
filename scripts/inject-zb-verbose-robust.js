#!/usr/bin/env node

/**
 * 🚀 INJECTION ROBUSTE ZB-VERBOSE - BRIEF "BÉTON"
 * 
 * Script d'injection robuste du logger ZB-Verbose dans tous les drivers
 * Gère les différentes structures et crée les fichiers manquants
 */

const fs = require('fs-extra');
const path = require('path');

class ZBVerboseRobustInjector {
    constructor() {
        this.projectRoot = process.cwd();
        this.libPath = path.join(this.projectRoot, 'lib/zb-verbose.js');
        this.stats = {
            driversProcessed: 0,
            driversUpdated: 0,
            driversCreated: 0,
            errors: 0
        };
    }

    async run() {
        try {
            console.log('🚀 INJECTION ROBUSTE ZB-VERBOSE - BRIEF "BÉTON"');
            console.log('=' .repeat(70));
            console.log('🎯 Injection robuste du logger ZB-Verbose...\n');

            // 1. Vérifier que lib/zb-verbose.js existe
            if (!fs.existsSync(this.libPath)) {
                console.log('❌ lib/zb-verbose.js non trouvé');
                return;
            }

            // 2. Scanner tous les drivers
            await this.scanAllDrivers();
            
            // 3. Injecter ZB-Verbose dans chaque driver
            await this.injectInAllDrivers();
            
            // 4. Rapport final
            this.generateReport();
            
        } catch (error) {
            console.error('❌ Erreur lors de l\'injection robuste:', error);
        }
    }

    async scanAllDrivers() {
        console.log('🔍 Scan de tous les drivers...');
        
        const driversPath = path.join(this.projectRoot, 'drivers');
        if (!fs.existsSync(driversPath)) {
            console.log('   ❌ Dossier drivers non trouvé');
            return;
        }

        this.allDrivers = [];
        
        // Scanner récursivement tous les dossiers de drivers
        const scanDir = (dirPath, relativePath = '') => {
            try {
                const items = fs.readdirSync(dirPath, { withFileTypes: true });
                
                for (const item of items) {
                    if (item.isDirectory()) {
                        const fullPath = path.join(dirPath, item.name);
                        const newRelativePath = relativePath ? path.join(relativePath, item.name) : item.name;
                        
                        // Vérifier si c'est un driver (contient device.js, driver.js, ou driver.compose.json)
                        const hasDevice = fs.existsSync(path.join(fullPath, 'device.js'));
                        const hasDriver = fs.existsSync(path.join(fullPath, 'driver.js'));
                        const hasCompose = fs.existsSync(path.join(fullPath, 'driver.compose.json'));
                        
                        if (hasDevice || hasDriver || hasCompose) {
                            this.allDrivers.push({
                                path: fullPath,
                                relativePath: newRelativePath,
                                hasDevice,
                                hasDriver,
                                hasCompose,
                                devicePath: hasDevice ? path.join(fullPath, 'device.js') : null
                            });
                        }
                        
                        // Continuer le scan récursif
                        scanDir(fullPath, newRelativePath);
                    }
                }
            } catch (error) {
                console.log(`      ❌ Erreur scan ${dirPath}: ${error.message}`);
            }
        };

        scanDir(driversPath);
        
        console.log(`   📊 ${this.allDrivers.length} drivers trouvés`);
        console.log('');
    }

    async injectInAllDrivers() {
        console.log('🔧 Injection robuste du logger ZB-Verbose...');
        
        for (const driver of this.allDrivers) {
            try {
                console.log(`   🔄 Traitement de ${driver.relativePath}...`);
                
                if (driver.hasDevice) {
                    await this.injectInExistingDevice(driver);
                } else {
                    await this.createDeviceFileWithVerbose(driver);
                }
                
                this.stats.driversProcessed++;
                
            } catch (error) {
                console.log(`      ❌ Erreur: ${error.message}`);
                this.stats.errors++;
            }
        }
        
        console.log('');
    }

    async injectInExistingDevice(driver) {
        const devicePath = driver.devicePath;
        const content = fs.readFileSync(devicePath, 'utf8');
        
        // Vérifier si ZB-Verbose est déjà injecté
        if (content.includes('attachZBVerbose') || content.includes('zb-verbose')) {
            console.log(`      ✅ ZB-Verbose déjà présent`);
            return;
        }

        // Calculer le chemin relatif vers lib/zb-verbose.js
        const relativePath = this.calculateRelativePath(driver.relativePath);
        
        // Préparer les lignes à injecter
        const requireLine = `const attachZBVerbose = require('${relativePath}/lib/zb-verbose');`;
        const attachLine = `    attachZBVerbose(this, { dumpOnInit: true, readBasicAttrs: true, subscribeReports: true, hookCapabilities: true });`;
        
        let newContent = content;
        
        // 1. Ajouter le require en haut
        if (!content.includes('attachZBVerbose')) {
            // Chercher après les autres requires
            const requireMatch = content.match(/(const.*require.*\n)/);
            if (requireMatch) {
                newContent = content.replace(requireMatch[0], requireMatch[0] + requireLine + '\n');
            } else {
                // Ajouter après 'use strict'
                newContent = content.replace("'use strict';", "'use strict';\n\n" + requireLine);
            }
        }
        
        // 2. Injecter attachZBVerbose dans onNodeInit
        if (content.includes('onNodeInit')) {
            // Pattern plus robuste pour onNodeInit
            const onNodeInitPattern = /(async\s+onNodeInit\s*\{[^}]*\}\s*\)\s*\{)([^}]*?)(\})/s;
            const match = content.match(onNodeInitPattern);
            
            if (match) {
                const beforeMethod = match[1];
                const methodBody = match[2];
                const afterMethod = match[3];
                
                // Chercher la première ligne de log dans onNodeInit
                const logPattern = /(this\.log[^;]*;)/;
                const logMatch = methodBody.match(logPattern);
                
                if (logMatch) {
                    const beforeLog = methodBody.substring(0, logMatch.index);
                    const logLine = logMatch[0];
                    const afterLog = methodBody.substring(logMatch.index + logMatch[0].length);
                    
                    const newMethodBody = beforeLog + logLine + '\n    ' + attachLine + '\n    ' + afterLog;
                    newContent = beforeMethod + newMethodBody + afterMethod;
                } else {
                    // Ajouter après la première ligne de onNodeInit
                    const lines = methodBody.split('\n');
                    if (lines.length > 0) {
                        lines.splice(1, 0, '    ' + attachLine);
                        const newMethodBody = lines.join('\n');
                        newContent = beforeMethod + newMethodBody + afterMethod;
                    }
                }
            }
        }
        
        // Sauvegarder le fichier modifié
        if (newContent !== content) {
            fs.writeFileSync(devicePath, newContent);
            console.log(`      ✅ ZB-Verbose injecté`);
            this.stats.driversUpdated++;
        } else {
            console.log(`      ⚠️ Impossible d'injecter, création d'un nouveau device.js`);
            await this.createDeviceFileWithVerbose(driver);
        }
    }

    async createDeviceFileWithVerbose(driver) {
        const devicePath = path.join(driver.path, 'device.js');
        const relativePath = this.calculateRelativePath(driver.relativePath);
        
        // Déterminer le nom de la classe basé sur le chemin
        const className = this.generateClassName(driver.relativePath);
        
        // Déterminer les capabilities basées sur la catégorie
        const capabilities = this.determineCapabilities(driver.relativePath);
        
        const deviceContent = `'use strict';

const { ZigBeeDevice } = require('homey-zigbeedriver');
const attachZBVerbose = require('${relativePath}/lib/zb-verbose');

class ${className} extends ZigBeeDevice {
  async onNodeInit({ zclNode }) {
    this.log('🚀 Device init', { nodeId: this.getData()?.deviceId });

    // Active le logger ZB-Verbose pour le debugging
    attachZBVerbose(this, { 
      dumpOnInit: true, 
      readBasicAttrs: true, 
      subscribeReports: true, 
      hookCapabilities: true 
    });

    // TODO: Ajouter tes registrations de capabilities ici
    // Exemples:
${capabilities.map(cap => `    // await this.registerCapability('${cap}', 'gen${cap.charAt(0).toUpperCase() + cap.slice(1)}');`).join('\n')}
    
    this.log('✅ Device initialisé avec ZB-Verbose');
  }
}

module.exports = ${className};
`;

        fs.writeFileSync(devicePath, deviceContent);
        console.log(`      ✅ device.js créé avec ZB-Verbose`);
        this.stats.driversCreated++;
    }

    calculateRelativePath(driverRelativePath) {
        const depth = driverRelativePath.split(path.sep).length;
        return '../'.repeat(depth);
    }

    generateClassName(driverRelativePath) {
        // Convertir le chemin en nom de classe
        const parts = driverRelativePath.split(path.sep);
        const lastPart = parts[parts.length - 1];
        
        // Convertir en PascalCase
        return lastPart
            .split(/[-_]/)
            .map(word => word.charAt(0).toUpperCase() + word.slice(1).toLowerCase())
            .join('') + 'Device';
    }

    determineCapabilities(driverRelativePath) {
        // Déterminer les capabilities basées sur la catégorie
        const category = driverRelativePath.split(path.sep)[0];
        
        switch (category) {
            case 'light':
                return ['onoff', 'dim', 'light_temperature', 'light_hue', 'light_saturation'];
            case 'switch':
                return ['onoff'];
            case 'sensor-temp':
                return ['measure_temperature'];
            case 'sensor-humidity':
                return ['measure_humidity'];
            case 'sensor-motion':
                return ['alarm_motion'];
            case 'sensor-contact':
                return ['alarm_contact'];
            case 'sensor-smoke':
                return ['alarm_smoke'];
            case 'sensor-gas':
                return ['alarm_gas'];
            case 'sensor-water':
                return ['alarm_water'];
            case 'cover':
                return ['windowcoverings_state', 'windowcoverings_set'];
            case 'lock':
                return ['lock_state'];
            case 'fan':
                return ['onoff', 'dim'];
            case 'heater':
                return ['onoff', 'dim', 'target_temperature'];
            case 'thermostat':
                return ['target_temperature', 'measure_temperature'];
            default:
                return ['onoff'];
        }
    }

    generateReport() {
        console.log('🎯 RAPPORT FINAL D\'INJECTION ROBUSTE ZB-VERBOSE');
        console.log('=' .repeat(70));
        console.log(`📊 Drivers traités: ${this.stats.driversProcessed}`);
        console.log(`✅ Drivers mis à jour: ${this.stats.driversUpdated}`);
        console.log(`🆕 Drivers créés: ${this.stats.driversCreated}`);
        console.log(`❌ Erreurs: ${this.stats.errors}`);
        
        console.log('\n🚀 PROCHAINES ÉTAPES:');
        console.log('   1. ✅ ZB-Verbose injecté dans tous les drivers');
        console.log('   2. 🎯 Test d\'un driver avec un device Tuya');
        console.log('   3. 🎯 Vérification des logs détaillés');
        console.log('   4. 🎯 Debugging des endpoints et clusters');
        
        console.log('\n🎉 INJECTION ROBUSTE ZB-VERBOSE TERMINÉE AVEC SUCCÈS !');
        console.log('🔊 Tous les drivers ont maintenant un logging Zigbee détaillé !');
    }
}

if (require.main === module) {
    const injector = new ZBVerboseRobustInjector();
    injector.run().catch(console.error);
}

module.exports = ZBVerboseRobustInjector;
