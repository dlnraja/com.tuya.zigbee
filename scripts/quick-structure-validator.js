#!/usr/bin/env node
'use strict';

#!/usr/bin/env node

/**
 * 🚀 QUICK STRUCTURE VALIDATOR - BRIEF "BÉTON"
 * 
 * Script de validation rapide qui vérifie la structure des drivers
 * sans lancer Homey (pour éviter les longs délais)
 */

const fs = require('fs-extra');
const path = require('path');

class QuickStructureValidator {
    constructor() {
        this.projectRoot = process.cwd();
        this.stats = {
            totalDrivers: 0,
            completeDrivers: 0,
            incompleteDrivers: 0,
            missingFiles: 0,
            errors: 0
        };
        this.report = [];
    }

    async run() {
        try {
            console.log('🚀 QUICK STRUCTURE VALIDATOR - BRIEF "BÉTON"');
            console.log('=' .repeat(60));
            console.log('🎯 Validation rapide de la structure des drivers...\n');

            // 1. Vérifier app.json
            await this.validateAppJson();
            
            // 2. Analyser la structure des drivers
            await this.analyzeDriverStructure();
            
            // 3. Vérifier les fichiers requis
            await this.validateRequiredFiles();
            
            // 4. Vérifier les fallbacks génériques
            await this.validateGenericFallbacks();
            
            // 5. Générer le rapport final
            this.generateFinalReport();
            
        } catch (error) {
            console.error('❌ Erreur lors de la validation:', error);
            this.stats.errors++;
        }
    }

    async validateAppJson() {
        console.log('📋 Validation de app.json...');
        
        try {
            const appJsonPath = path.join(this.projectRoot, 'app.json');
            if (!fs.existsSync(appJsonPath)) {
                throw new Error('app.json manquant');
            }

            const appJson = JSON.parse(fs.readFileSync(appJsonPath, 'utf8'));
            
            // Vérifications critiques
            const checks = [
                { field: 'id', value: appJson.id, expected: 'com.tuya.zigbee' },
                { field: 'version', value: appJson.version, expected: '3.4.2' },
                { field: 'sdk', value: appJson.sdk, expected: 3 },
                { field: 'compose.enable', value: appJson.compose?.enable, expected: true }
            ];

            let allValid = true;
            for (const check of checks) {
                if (check.value !== check.expected) {
                    console.log(`   ❌ ${check.field}: ${check.value} (attendu: ${check.expected})`);
                    allValid = false;
                } else {
                    console.log(`   ✅ ${check.field}: ${check.value}`);
                }
            }

            if (allValid) {
                console.log('   ✅ app.json: VALIDE');
            } else {
                console.log('   ❌ app.json: PROBLÈMES DÉTECTÉS');
            }

        } catch (error) {
            console.log(`   ❌ Erreur app.json: ${error.message}`);
            this.stats.errors++;
        }
        console.log('');
    }

    async analyzeDriverStructure() {
        console.log('📁 Analyse de la structure des drivers...');
        
        const categories = [
            'drivers/tuya_zigbee/light',
            'drivers/tuya_zigbee/switch',
            'drivers/tuya_zigbee/sensor-contact',
            'drivers/tuya_zigbee/sensor-gas',
            'drivers/tuya_zigbee/sensor-humidity',
            'drivers/tuya_zigbee/sensor-motion',
            'drivers/tuya_zigbee/sensor-smoke',
            'drivers/tuya_zigbee/sensor-temp',
            'drivers/tuya_zigbee/sensor-vibration',
            'drivers/tuya_zigbee/sensor-water',
            'drivers/tuya_zigbee/cover',
            'drivers/tuya_zigbee/lock',
            'drivers/tuya_zigbee/fan',
            'drivers/tuya_zigbee/heater',
            'drivers/tuya_zigbee/thermostat',
            'drivers/tuya_zigbee/plug',
            'drivers/tuya_zigbee/siren',
            'drivers/tuya_zigbee/ac',
            'drivers/tuya_zigbee/other'
        ];

        for (const categoryPath of categories) {
            if (fs.existsSync(categoryPath)) {
                const category = path.basename(categoryPath);
                const drivers = fs.readdirSync(categoryPath, { withFileTypes: true })
                    .filter(dirent => dirent.isDirectory())
                    .map(dirent => dirent.name);
                
                console.log(`   📂 ${category}: ${drivers.length} drivers`);
                this.stats.totalDrivers += drivers.length;
            }
        }
        console.log('');
    }

    async validateRequiredFiles() {
        console.log('🔍 Validation des fichiers requis...');
        
        const categories = [
            'drivers/tuya_zigbee/light',
            'drivers/tuya_zigbee/switch',
            'drivers/tuya_zigbee/sensor-contact',
            'drivers/tuya_zigbee/sensor-gas',
            'drivers/tuya_zigbee/sensor-humidity',
            'drivers/tuya_zigbee/sensor-motion',
            'drivers/tuya_zigbee/sensor-smoke',
            'drivers/tuya_zigbee/sensor-temp',
            'drivers/tuya_zigbee/sensor-vibration',
            'drivers/tuya_zigbee/sensor-water',
            'drivers/tuya_zigbee/cover',
            'drivers/tuya_zigbee/lock',
            'drivers/tuya_zigbee/fan',
            'drivers/tuya_zigbee/heater',
            'drivers/tuya_zigbee/thermostat',
            'drivers/tuya_zigbee/plug',
            'drivers/tuya_zigbee/siren',
            'drivers/tuya_zigbee/ac',
            'drivers/tuya_zigbee/other'
        ];

        for (const categoryPath of categories) {
            if (fs.existsSync(categoryPath)) {
                const drivers = fs.readdirSync(categoryPath, { withFileTypes: true })
                    .filter(dirent => dirent.isDirectory())
                    .map(dirent => dirent.name);
                
                for (const driverName of drivers) {
                    const driverPath = path.join(categoryPath, driverName);
                    const isValid = await this.validateDriverFiles(driverPath, driverName);
                    
                    if (isValid) {
                        this.stats.completeDrivers++;
                    } else {
                        this.stats.incompleteDrivers++;
                    }
                }
            }
        }
        
        console.log(`   📊 Résumé: ${this.stats.completeDrivers} complets, ${this.stats.incompleteDrivers} incomplets`);
        console.log('');
    }

    async validateDriverFiles(driverPath, driverName) {
        const requiredFiles = ['device.js', 'driver.js', 'driver.compose.json'];
        const missingFiles = [];
        
        for (const file of requiredFiles) {
            if (!fs.existsSync(path.join(driverPath, file))) {
                missingFiles.push(file);
                this.stats.missingFiles++;
            }
        }
        
        if (missingFiles.length > 0) {
            this.report.push(`❌ ${driverName}: Fichiers manquants: ${missingFiles.join(', ')}`);
            return false;
        }
        
        // Vérifier le contenu des fichiers
        try {
            const deviceJsPath = path.join(driverPath, 'device.js');
            const driverJsPath = path.join(driverPath, 'driver.js');
            const composePath = path.join(driverPath, 'driver.compose.json');
            
            // Vérifier device.js
            const deviceContent = fs.readFileSync(deviceJsPath, 'utf8');
            if (!deviceContent.includes('ZigBeeDevice') || !deviceContent.includes('extends')) {
                this.report.push(`⚠️ ${driverName}: device.js invalide`);
                return false;
            }
            
            // Vérifier driver.js
            const driverContent = fs.readFileSync(driverJsPath, 'utf8');
            if (!driverContent.includes('Driver') || !driverContent.includes('extends')) {
                this.report.push(`⚠️ ${driverName}: driver.js invalide`);
                return false;
            }
            
            // Vérifier driver.compose.json
            try {
                const compose = JSON.parse(fs.readFileSync(composePath, 'utf8'));
                if (!compose.class || !compose.capabilities) {
                    this.report.push(`⚠️ ${driverName}: driver.compose.json invalide`);
                    return false;
                }
            } catch (error) {
                this.report.push(`❌ ${driverName}: driver.compose.json JSON invalide`);
                return false;
            }
            
            return true;
            
        } catch (error) {
            this.report.push(`❌ ${driverName}: Erreur de lecture: ${error.message}`);
            return false;
        }
    }

    async validateGenericFallbacks() {
        console.log('🔧 Validation des fallbacks génériques...');
        
        const genericPath = 'drivers/zigbee/__generic__';
        if (!fs.existsSync(genericPath)) {
            console.log('   ❌ Dossier des fallbacks génériques manquant');
            return;
        }
        
        const genericCategories = fs.readdirSync(genericPath, { withFileTypes: true })
            .filter(dirent => dirent.isDirectory())
            .map(dirent => dirent.name);
        
        let validGenerics = 0;
        for (const category of genericCategories) {
            const categoryPath = path.join(genericPath, category);
            const hasDevice = fs.existsSync(path.join(categoryPath, 'device.js'));
            const hasDriver = fs.existsSync(path.join(categoryPath, 'driver.js'));
            const hasCompose = fs.existsSync(path.join(categoryPath, 'driver.compose.json'));
            
            if (hasDevice && hasDriver && hasCompose) {
                validGenerics++;
            }
        }
        
        console.log(`   📊 Fallbacks génériques: ${validGenerics}/${genericCategories.length} valides`);
        console.log('');
    }

    generateFinalReport() {
        console.log('🎯 RAPPORT FINAL DE VALIDATION RAPIDE');
        console.log('=' .repeat(60));
        console.log(`📊 Total drivers: ${this.stats.totalDrivers}`);
        console.log(`✅ Drivers complets: ${this.stats.completeDrivers}`);
        console.log(`❌ Drivers incomplets: ${this.stats.incompleteDrivers}`);
        console.log(`📁 Fichiers manquants: ${this.stats.missingFiles}`);
        console.log(`❌ Erreurs: ${this.stats.errors}`);
        
        if (this.report.length > 0) {
            console.log('\n📝 Détails des problèmes:');
            for (const item of this.report.slice(0, 10)) { // Limiter à 10 items
                console.log(`   ${item}`);
            }
            if (this.report.length > 10) {
                console.log(`   ... et ${this.report.length - 10} autres problèmes`);
            }
        }
        
        const completionRate = ((this.stats.completeDrivers / this.stats.totalDrivers) * 100).toFixed(1);
        console.log(`\n📈 Taux de complétion: ${completionRate}%`);
        
        if (completionRate >= 95) {
            console.log('\n🎉 EXCELLENT ! La structure est prête pour la validation Homey !');
        } else if (completionRate >= 80) {
            console.log('\n⚠️ BON ! Quelques corrections mineures nécessaires avant Homey.');
        } else {
            console.log('\n❌ ATTENTION ! Des corrections majeures sont nécessaires avant Homey.');
        }
        
        console.log('\n🚀 PROCHAINES ÉTAPES RECOMMANDÉES:');
        console.log('   1. Corriger les problèmes détectés ci-dessus');
        console.log('   2. Lancer: node scripts/enable-compose.js');
        console.log('   3. Lancer: node scripts/strip-bom.js');
        console.log('   4. Lancer: npm run validate (ou npx homey app validate)');
        console.log('   5. Si OK: npx homey app run (test local)');
    }
}

if (require.main === module) {
    const validator = new QuickStructureValidator();
    validator.run().catch(console.error);
}

module.exports = QuickStructureValidator;
