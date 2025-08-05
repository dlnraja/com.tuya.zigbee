#!/usr/bin/env node

/**
 * 🔍 VALIDATE.JS
 * Version: 1.0.0
 * Date: 2025-08-05
 * 
 * Validation des drivers avec throttling 5x5
 */

const fs = require('fs');
const path = require('path');
const { execSync } = require('child_process');

class DriverValidator {
    constructor() {
        this.startTime = Date.now();
        this.stats = {
            driversValidated: 0,
            driversValid: 0,
            driversInvalid: 0,
            errors: []
        };
        
        console.log('🔍 DRIVER VALIDATOR - DÉMARRAGE');
        console.log('📅 Date:', new Date().toISOString());
        console.log('🎯 Mode: VALIDATION AVEC THROTTLING 5x5');
        console.log('');
    }

    async execute() {
        try {
            // Étape 1: Scanner tous les drivers
            await this.scanAllDrivers();
            
            // Étape 2: Valider avec throttling
            await this.validateWithThrottling();
            
            // Étape 3: Générer rapport
            await this.generateReport();
            
        } catch (error) {
            console.error('❌ Erreur validation:', error.message);
            this.stats.errors.push(error.message);
        }
    }

    async scanAllDrivers() {
        console.log('📊 SCAN DE TOUS LES DRIVERS...');
        
        try {
            const drivers = [];
            
            // Scanner drivers/tuya
            const tuyaPath = 'drivers/tuya';
            if (fs.existsSync(tuyaPath)) {
                const categories = fs.readdirSync(tuyaPath);
                for (const category of categories) {
                    const categoryPath = path.join(tuyaPath, category);
                    if (fs.statSync(categoryPath).isDirectory()) {
                        const driverFolders = fs.readdirSync(categoryPath);
                        for (const driverFolder of driverFolders) {
                            const driverPath = path.join(categoryPath, driverFolder);
                            if (fs.statSync(driverPath).isDirectory()) {
                                drivers.push({
                                    type: 'tuya',
                                    category: category,
                                    name: driverFolder,
                                    path: `tuya/${category}/${driverFolder}`,
                                    fullPath: driverPath
                                });
                            }
                        }
                    }
                }
            }
            
            // Scanner drivers/zigbee
            const zigbeePath = 'drivers/zigbee';
            if (fs.existsSync(zigbeePath)) {
                const categories = fs.readdirSync(zigbeePath);
                for (const category of categories) {
                    const categoryPath = path.join(zigbeePath, category);
                    if (fs.statSync(categoryPath).isDirectory()) {
                        const driverFolders = fs.readdirSync(categoryPath);
                        for (const driverFolder of driverFolders) {
                            const driverPath = path.join(categoryPath, driverFolder);
                            if (fs.statSync(driverPath).isDirectory()) {
                                drivers.push({
                                    type: 'zigbee',
                                    category: category,
                                    name: driverFolder,
                                    path: `zigbee/${category}/${driverFolder}`,
                                    fullPath: driverPath
                                });
                            }
                        }
                    }
                }
            }
            
            console.log(`📋 ${drivers.length} drivers trouvés`);
            this.drivers = drivers;
            
        } catch (error) {
            console.error('❌ Erreur scan:', error.message);
            this.stats.errors.push(`Scan: ${error.message}`);
        }
    }

    async validateWithThrottling() {
        console.log('🔍 VALIDATION AVEC THROTTLING 5x5...');
        
        try {
            const batchSize = 5;
            const delayMs = 5000; // 5 secondes
            
            for (let i = 0; i < this.drivers.length; i += batchSize) {
                const batch = this.drivers.slice(i, i + batchSize);
                
                console.log(`🔄 Validation batch ${Math.floor(i/batchSize) + 1}/${Math.ceil(this.drivers.length/batchSize)}`);
                
                // Valider le batch en parallèle
                const promises = batch.map(driver => this.validateDriver(driver));
                await Promise.all(promises);
                
                // Attendre 5 secondes entre les batches
                if (i + batchSize < this.drivers.length) {
                    console.log(`⏳ Attente ${delayMs/1000}s avant le prochain batch...`);
                    await this.delay(delayMs);
                }
            }
            
            console.log(`✅ Validation terminée: ${this.stats.driversValid} valides, ${this.stats.driversInvalid} invalides`);
            
        } catch (error) {
            console.error('❌ Erreur validation throttling:', error.message);
            this.stats.errors.push(`Validation throttling: ${error.message}`);
        }
    }

    async validateDriver(driver) {
        try {
            const composePath = path.join(driver.fullPath, 'driver.compose.json');
            const devicePath = path.join(driver.fullPath, 'device.js');
            
            let isValid = true;
            const errors = [];
            
            // Vérifier driver.compose.json
            if (fs.existsSync(composePath)) {
                try {
                    const composeData = JSON.parse(fs.readFileSync(composePath, 'utf8'));
                    
                    // Vérifications de base
                    if (!composeData.id) {
                        errors.push('ID manquant');
                        isValid = false;
                    }
                    
                    if (!composeData.class) {
                        errors.push('Classe manquante');
                        isValid = false;
                    }
                    
                    if (!composeData.capabilities || !Array.isArray(composeData.capabilities)) {
                        errors.push('Capabilities manquantes ou invalides');
                        isValid = false;
                    }
                    
                } catch (error) {
                    errors.push(`JSON invalide: ${error.message}`);
                    isValid = false;
                }
            } else {
                errors.push('driver.compose.json manquant');
                isValid = false;
            }
            
            // Vérifier device.js
            if (!fs.existsSync(devicePath)) {
                errors.push('device.js manquant');
                isValid = false;
            }
            
            // Mettre à jour les stats
            this.stats.driversValidated++;
            if (isValid) {
                this.stats.driversValid++;
                console.log(`✅ ${driver.path} - VALIDE`);
            } else {
                this.stats.driversInvalid++;
                console.log(`❌ ${driver.path} - INVALIDE: ${errors.join(', ')}`);
            }
            
        } catch (error) {
            console.error(`❌ Erreur validation ${driver.path}:`, error.message);
            this.stats.driversInvalid++;
        }
    }

    delay(ms) {
        return new Promise(resolve => setTimeout(resolve, ms));
    }

    async generateReport() {
        console.log('📊 GÉNÉRATION DU RAPPORT...');
        
        try {
            const report = {
                timestamp: new Date().toISOString(),
                stats: this.stats,
                drivers: this.drivers.map(driver => ({
                    path: driver.path,
                    type: driver.type,
                    category: driver.category,
                    name: driver.name
                }))
            };
            
            fs.writeFileSync('validation-report.json', JSON.stringify(report, null, 2));
            
            const markdownReport = this.generateMarkdownReport(report);
            fs.writeFileSync('validation-report.md', markdownReport);
            
            console.log('✅ Rapport généré');
            
        } catch (error) {
            console.error('❌ Erreur génération rapport:', error.message);
        }
    }

    generateMarkdownReport(report) {
        return `# 🔍 Validation Report

## 📊 Statistics
- **Drivers validated**: ${report.stats.driversValidated}
- **Drivers valid**: ${report.stats.driversValid}
- **Drivers invalid**: ${report.stats.driversInvalid}
- **Success rate**: ${((report.stats.driversValid / report.stats.driversValidated) * 100).toFixed(2)}%
- **Errors**: ${report.stats.errors.length}

## 📅 Date
${report.timestamp}

## 🎯 Status
${report.stats.driversInvalid === 0 ? '✅ ALL DRIVERS VALID' : '⚠️ SOME DRIVERS INVALID'}

## 📋 Drivers List
${report.drivers.map(d => `- ${d.path} (${d.type}/${d.category})`).join('\n')}

---

**📊 Total Drivers**: ${report.stats.driversValidated}  
**✅ Valid Drivers**: ${report.stats.driversValid}  
**❌ Invalid Drivers**: ${report.stats.driversInvalid}  
**🎯 Success Rate**: ${((report.stats.driversValid / report.stats.driversValidated) * 100).toFixed(2)}%
`;
    }
}

// Exécution
const validator = new DriverValidator();
validator.execute().catch(console.error); 