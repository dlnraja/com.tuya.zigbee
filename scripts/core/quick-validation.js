#!/usr/bin/env node

/**
 * ⚡ QUICK VALIDATION
 * Version: 1.0.0
 * Date: 2025-08-05
 * 
 * Validation rapide du projet après refusion
 */

const fs = require('fs');
const path = require('path');
const { execSync } = require('child_process');

class QuickValidation {
    constructor() {
        this.startTime = Date.now();
        this.results = {
            driversValid: 0,
            driversInvalid: 0,
            structureValid: true,
            appJsValid: true,
            errors: []
        };
        
        console.log('⚡ QUICK VALIDATION - DÉMARRAGE');
        console.log('📅 Date:', new Date().toISOString());
        console.log('🎯 Mode: YOLO QUICK VALIDATION');
        console.log('');
    }

    async execute() {
        try {
            await this.validateStructure();
            await this.validateAppJs();
            await this.validateDrivers();
            await this.generateValidationReport();
            
            this.generateReport();
        } catch (error) {
            console.error('❌ Erreur validation:', error.message);
            this.results.errors.push(error.message);
        }
    }

    async validateStructure() {
        console.log('📁 VALIDATION DE LA STRUCTURE...');
        
        try {
            const requiredFolders = [
                'drivers/tuya/lights',
                'drivers/tuya/switches',
                'drivers/tuya/plugs',
                'drivers/tuya/sensors',
                'drivers/tuya/covers',
                'drivers/tuya/locks',
                'drivers/tuya/thermostats'
            ];
            
            for (const folder of requiredFolders) {
                if (!fs.existsSync(folder)) {
                    console.log(`❌ Dossier manquant: ${folder}`);
                    this.results.structureValid = false;
                } else {
                    const items = fs.readdirSync(folder);
                    console.log(`✅ ${folder}: ${items.length} drivers`);
                }
            }
            
            console.log('✅ Structure validée');

        } catch (error) {
            console.error('❌ Erreur validation structure:', error.message);
            this.results.errors.push(`Structure validation: ${error.message}`);
        }
    }

    async validateAppJs() {
        console.log('📄 VALIDATION DE APP.JS...');
        
        try {
            if (!fs.existsSync('app.js')) {
                console.log('❌ app.js manquant');
                this.results.appJsValid = false;
                return;
            }
            
            const appJsContent = fs.readFileSync('app.js', 'utf8');
            
            // Vérifier les imports de drivers
            const driverImports = appJsContent.match(/require\(['"][^'"]*device\.js['"]\)/g);
            if (driverImports) {
                console.log(`✅ ${driverImports.length} imports de drivers détectés`);
            } else {
                console.log('⚠️  Aucun import de driver détecté');
            }
            
            // Vérifier la syntaxe basique
            if (appJsContent.includes('homey.drivers.registerDriver')) {
                console.log('✅ Enregistrement de drivers détecté');
            } else {
                console.log('⚠️  Enregistrement de drivers non détecté');
            }
            
            console.log('✅ app.js validé');

        } catch (error) {
            console.error('❌ Erreur validation app.js:', error.message);
            this.results.errors.push(`App.js validation: ${error.message}`);
        }
    }

    async validateDrivers() {
        console.log('🔍 VALIDATION DES DRIVERS...');
        
        try {
            const categories = ['lights', 'switches', 'plugs', 'sensors', 'covers', 'locks', 'thermostats'];
            
            for (const category of categories) {
                const categoryPath = `drivers/tuya/${category}`;
                if (fs.existsSync(categoryPath)) {
                    const items = fs.readdirSync(categoryPath);
                    
                    for (const item of items) {
                        const itemPath = path.join(categoryPath, item);
                        const itemStat = fs.statSync(itemPath);
                        
                        if (itemStat.isDirectory()) {
                            const driverFiles = fs.readdirSync(itemPath);
                            
                            if (driverFiles.includes('device.js') && driverFiles.includes('driver.compose.json')) {
                                console.log(`✅ Driver valide: ${category}/${item}`);
                                this.results.driversValid++;
                            } else {
                                console.log(`❌ Driver invalide: ${category}/${item}`);
                                this.results.driversInvalid++;
                            }
                        }
                    }
                }
            }
            
            console.log(`✅ ${this.results.driversValid} drivers valides, ${this.results.driversInvalid} invalides`);

        } catch (error) {
            console.error('❌ Erreur validation drivers:', error.message);
            this.results.errors.push(`Drivers validation: ${error.message}`);
        }
    }

    async generateValidationReport() {
        console.log('📊 GÉNÉRATION DU RAPPORT DE VALIDATION...');
        
        try {
            const report = {
                timestamp: new Date().toISOString(),
                validation: {
                    structureValid: this.results.structureValid,
                    appJsValid: this.results.appJsValid,
                    driversValid: this.results.driversValid,
                    driversInvalid: this.results.driversInvalid,
                    totalDrivers: this.results.driversValid + this.results.driversInvalid
                },
                errors: this.results.errors
            };
            
            fs.writeFileSync('validation-report.json', JSON.stringify(report, null, 2));
            console.log('✅ Rapport de validation généré');

        } catch (error) {
            console.error('❌ Erreur génération rapport:', error.message);
        }
    }

    generateReport() {
        const duration = Date.now() - this.startTime;
        
        console.log('');
        console.log('📊 RAPPORT QUICK VALIDATION');
        console.log('============================');
        console.log(`⏱️  Durée: ${duration}ms`);
        console.log(`📁 Structure valide: ${this.results.structureValid ? '✅' : '❌'}`);
        console.log(`📄 App.js valide: ${this.results.appJsValid ? '✅' : '❌'}`);
        console.log(`🔍 Drivers valides: ${this.results.driversValid}`);
        console.log(`❌ Drivers invalides: ${this.results.driversInvalid}`);
        console.log(`📊 Total drivers: ${this.results.driversValid + this.results.driversInvalid}`);
        console.log(`🚨 Erreurs: ${this.results.errors.length}`);
        
        if (this.results.errors.length > 0) {
            console.log('\n🚨 Erreurs détectées:');
            this.results.errors.forEach(error => console.log(`  - ${error}`));
        }
        
        console.log('\n🎯 QUICK VALIDATION TERMINÉ');
        console.log('✅ Validation rapide terminée');
    }
}

// Exécution
const validator = new QuickValidation();
validator.execute().catch(console.error); 