#!/usr/bin/env node

/**
 * 🚀 QUICK FINAL VALIDATION - BRIEF "BÉTON"
 * 
 * Script de validation finale rapide pour vérifier que tout est prêt pour Homey
 */

const fs = require('fs-extra');
const path = require('path');

class QuickFinalValidation {
    constructor() {
        this.projectRoot = process.cwd();
        this.stats = {
            checks: 0,
            passed: 0,
            failed: 0,
            warnings: 0
        };
    }

    async run() {
        try {
            console.log('🚀 QUICK FINAL VALIDATION - BRIEF "BÉTON"');
            console.log('=' .repeat(70));
            console.log('🎯 Validation finale rapide pour Homey...\n');

            // 1. Vérification des fichiers critiques
            await this.checkCriticalFiles();

            // 2. Vérification de la structure des drivers
            await this.checkDriverStructure();

            // 3. Vérification des assets
            await this.checkAssets();

            // 4. Vérification des métadonnées
            await this.checkMetadata();

            // 5. Rapport final
            this.generateFinalReport();

        } catch (error) {
            console.error('❌ Erreur lors de la validation finale:', error);
        }
    }

    async checkCriticalFiles() {
        console.log('🔍 VÉRIFICATION DES FICHIERS CRITIQUES');
        console.log('-' .repeat(50));

        const criticalFiles = [
            'app.json',
            'package.json',
            'drivers/tuya_zigbee/light/tuya_bulb_211/device.js',
            'drivers/tuya_zigbee/light/tuya_bulb_211/driver.js',
            'drivers/tuya_zigbee/light/tuya_bulb_211/driver.compose.json',
            'assets/icon.svg'
        ];

        for (const file of criticalFiles) {
            this.stats.checks++;
            
            if (fs.existsSync(file)) {
                try {
                    if (file.endsWith('.json')) {
                        JSON.parse(fs.readFileSync(file, 'utf8'));
                        console.log(`   ✅ ${file}: JSON valide`);
                        this.stats.passed++;
                    } else {
                        const stats = fs.statSync(file);
                        if (stats.size > 100) {
                            console.log(`   ✅ ${file}: ${(stats.size / 1024).toFixed(2)} KB`);
                            this.stats.passed++;
                        } else {
                            console.log(`   ⚠️ ${file}: ${(stats.size / 1024).toFixed(2)} KB (taille faible)`);
                            this.stats.warnings++;
                        }
                    }
                } catch (error) {
                    console.log(`   ❌ ${file}: ${error.message}`);
                    this.stats.failed++;
                }
            } else {
                console.log(`   ❌ ${file}: Fichier manquant`);
                this.stats.failed++;
            }
        }

        console.log('');
    }

    async checkDriverStructure() {
        console.log('🏗️ VÉRIFICATION DE LA STRUCTURE DES DRIVERS');
        console.log('-' .repeat(50));

        const driverCategories = [
            'drivers/tuya_zigbee/light',
            'drivers/tuya_zigbee/switch',
            'drivers/tuya_zigbee/sensor-temp',
            'drivers/tuya_zigbee/sensor-motion',
            'drivers/tuya_zigbee/cover',
            'drivers/tuya_zigbee/lock'
        ];

        let totalDrivers = 0;
        let validCategories = 0;

        for (const category of driverCategories) {
            this.stats.checks++;
            
            if (fs.existsSync(category)) {
                const drivers = fs.readdirSync(category, { withFileTypes: true })
                    .filter(dirent => dirent.isDirectory())
                    .map(dirent => dirent.name);

                if (drivers.length > 0) {
                    totalDrivers += drivers.length;
                    validCategories++;
                    console.log(`   ✅ ${category}: ${drivers.length} drivers`);
                    this.stats.passed++;
                } else {
                    console.log(`   ⚠️ ${category}: Aucun driver`);
                    this.stats.warnings++;
                }
            } else {
                console.log(`   ❌ ${category}: Catégorie manquante`);
                this.stats.failed++;
            }
        }

        // Vérifier les fallbacks génériques
        this.stats.checks++;
        const genericPath = 'drivers/zigbee/__generic__';
        if (fs.existsSync(genericPath)) {
            const genericCategories = fs.readdirSync(genericPath, { withFileTypes: true })
                .filter(dirent => dirent.isDirectory())
                .map(dirent => dirent.name);
            console.log(`   ✅ Fallbacks génériques: ${genericCategories.length} catégories`);
            this.stats.passed++;
        } else {
            console.log('   ❌ Fallbacks génériques: Manquants');
            this.stats.failed++;
        }

        console.log(`   📊 Total drivers: ${totalDrivers}, Catégories valides: ${validCategories}/6`);
        console.log('');
    }

    async checkAssets() {
        console.log('🖼️ VÉRIFICATION DES ASSETS');
        console.log('-' .repeat(50));

        const mainAssets = [
            'assets/icon.svg',
            'assets/images/small.png',
            'assets/images/large.png',
            'assets/images/xlarge.png'
        ];

        let validAssets = 0;
        for (const asset of mainAssets) {
            this.stats.checks++;
            
            if (fs.existsSync(asset)) {
                const stats = fs.statSync(asset);
                if (stats.size > 100) {
                    console.log(`   ✅ ${asset}: ${(stats.size / 1024).toFixed(2)} KB`);
                    validAssets++;
                    this.stats.passed++;
                } else {
                    console.log(`   ⚠️ ${asset}: ${(stats.size / 1024).toFixed(2)} KB (taille faible)`);
                    this.stats.warnings++;
                }
            } else {
                console.log(`   ❌ ${asset}: Asset manquant`);
                this.stats.failed++;
            }
        }

        if (validAssets === mainAssets.length) {
            console.log('   ✅ Tous les assets principaux sont valides');
        } else {
            console.log(`   ⚠️ ${validAssets}/${mainAssets.length} assets principaux valides`);
        }

        console.log('');
    }

    async checkMetadata() {
        console.log('📝 VÉRIFICATION DES MÉTADONNÉES');
        console.log('-' .repeat(50));

        // Vérifier app.json
        this.stats.checks++;
        try {
            const appJson = JSON.parse(fs.readFileSync('app.json', 'utf8'));
            
            const checks = [
                { field: 'id', value: appJson.id, expected: 'com.tuya.zigbee' },
                { field: 'version', value: appJson.version, expected: '3.4.6' },
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
                this.stats.passed++;
            } else {
                console.log('   ❌ app.json: PROBLÈMES DÉTECTÉS');
                this.stats.failed++;
            }

        } catch (error) {
            console.log(`   ❌ Erreur app.json: ${error.message}`);
            this.stats.failed++;
        }

        // Vérifier package.json
        this.stats.checks++;
        try {
            const packageJson = JSON.parse(fs.readFileSync('package.json', 'utf8'));
            
            if (packageJson.dependencies && packageJson.dependencies['homey-zigbeedriver']) {
                console.log('   ✅ package.json: Dépendances valides');
                this.stats.passed++;
            } else {
                console.log('   ❌ package.json: homey-zigbeedriver manquant');
                this.stats.failed++;
            }

        } catch (error) {
            console.log(`   ❌ Erreur package.json: ${error.message}`);
            this.stats.failed++;
        }

        console.log('');
    }

    generateFinalReport() {
        const successRate = ((this.stats.passed / this.stats.checks) * 100).toFixed(1);
        
        console.log('🎯 RAPPORT FINAL DE VALIDATION RAPIDE');
        console.log('=' .repeat(70));
        console.log(`📊 Total vérifications: ${this.stats.checks}`);
        console.log(`✅ Vérifications réussies: ${this.stats.passed}`);
        console.log(`❌ Vérifications échouées: ${this.stats.failed}`);
        console.log(`⚠️ Avertissements: ${this.stats.warnings}`);
        console.log(`📈 Taux de réussite: ${successRate}%`);

        if (this.stats.failed === 0) {
            console.log('\n🎉 EXCELLENT ! PROJET 100% PRÊT POUR HOMEY !');
            console.log('🚀 Tous les critères critiques sont satisfaits !');
            
            console.log('\n🚀 COMMANDES FINALES RECOMMANDÉES:');
            console.log('   1. ✅ Validation rapide réussie');
            console.log('   2. 🎯 LANCER: npm run validate (validation Homey)');
            console.log('   3. 🎯 Si OK: npx homey app run (test local)');
            console.log('   4. 🎯 Test d\'appairage d\'un device Tuya');
        } else {
            console.log('\n⚠️ CORRECTIONS NÉCESSAIRES AVANT LA VALIDATION HOMEY');
            console.log(`🔧 ${this.stats.failed} problèmes critiques détectés`);
        }

        if (this.stats.warnings > 0) {
            console.log('\n⚠️ AVERTISSEMENTS (non critiques):');
            console.log('   - Assets de petite taille (peuvent être améliorés)');
            console.log('   - Structure globalement OK');
        }

        console.log('\n🎯 VALIDATION FINALE RAPIDE TERMINÉE !');
        console.log(`📊 Projet prêt à ${successRate}% pour Homey !`);
    }
}

if (require.main === module) {
    const validation = new QuickFinalValidation();
    validation.run().catch(console.error);
}

module.exports = QuickFinalValidation;
