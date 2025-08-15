#!/usr/bin/env node

/**
 * 🚀 VALIDATION LOCALE RAPIDE
 * 
 * Vérifie les points critiques sans Homey CLI (plus rapide)
 */

const fs = require('fs-extra');
const path = require('path');

class LocalValidator {
    constructor() {
        this.projectRoot = process.cwd();
        this.errors = [];
        this.warnings = [];
        this.stats = {
            total: 0,
            valid: 0,
            invalid: 0
        };
    }

    async run() {
        try {
            this.log('🚀 VALIDATION LOCALE RAPIDE');
            this.log('=' .repeat(50));
            
            // 1. Vérifier app.json
            await this.validateAppJson();
            
            // 2. Vérifier la structure des drivers
            await this.validateDriversStructure();
            
            // 3. Vérifier les fichiers critiques
            await this.validateCriticalFiles();
            
            // 4. Rapport final
            this.generateReport();
            
        } catch (error) {
            console.error('❌ Erreur critique:', error.message);
            process.exit(1);
        }
    }

    async validateAppJson() {
        this.log('\n🔍 VALIDATION APP.JSON...');
        
        const appJsonPath = path.join(this.projectRoot, 'app.json');
        
        if (!(await fs.pathExists(appJsonPath))) {
            this.addError('app.json manquant');
            return;
        }
        
        try {
            const appJson = await fs.readJson(appJsonPath);
            
            // Vérifications critiques
            const checks = [
                { field: 'id', type: 'string', required: true },
                { field: 'version', type: 'string', required: true },
                { field: 'sdk', type: 'number', required: true, value: 3 },
                { field: 'compose.enable', type: 'boolean', required: true, value: true },
                { field: 'name.en', type: 'string', required: true },
                { field: 'description', type: 'string', required: true }
            ];
            
            for (const check of checks) {
                const value = this.getNestedValue(appJson, check.field);
                
                if (check.required && !value) {
                    this.addError(`app.json: ${check.field} manquant`);
                } else if (check.type === 'number' && typeof value !== 'number') {
                    this.addError(`app.json: ${check.field} doit être un nombre`);
                } else if (check.type === 'string' && typeof value !== 'string') {
                    this.addError(`app.json: ${check.field} doit être une chaîne`);
                } else if (check.type === 'boolean' && typeof value !== 'boolean') {
                    this.addError(`app.json: ${check.field} doit être un booléen`);
                } else if (check.value !== undefined && value !== check.value) {
                    this.addError(`app.json: ${check.field} doit être ${check.value}`);
                }
            }
            
            // Vérifier les drivers
            if (appJson.drivers && Array.isArray(appJson.drivers)) {
                for (const driver of appJson.drivers) {
                    if (!driver.class) {
                        this.addError(`Driver ${driver.id}: propriété 'class' manquante`);
                    }
                    if (!driver.name || !driver.name.en) {
                        this.addError(`Driver ${driver.id}: nom anglais manquant`);
                    }
                }
            }
            
            this.log('✅ app.json validé');
            
        } catch (error) {
            this.addError(`Erreur lecture app.json: ${error.message}`);
        }
    }

    async validateDriversStructure() {
        this.log('\n🔍 VALIDATION STRUCTURE DRIVERS...');
        
        const driversPath = path.join(this.projectRoot, 'drivers');
        
        if (!(await fs.pathExists(driversPath))) {
            this.addError('Dossier drivers/ manquant');
            return;
        }
        
        const driverTypes = await fs.readdir(driversPath);
        
        for (const driverType of driverTypes) {
            if (driverType === '_common') continue;
            
            const driverTypePath = path.join(driversPath, driverType);
            const driverTypeStats = await fs.stat(driverTypePath);
            
            if (driverTypeStats.isDirectory()) {
                await this.validateDriverType(driverType, driverTypePath);
            }
        }
    }

    async validateDriverType(driverType, driverTypePath) {
        const categories = await fs.readdir(driverTypePath);
        
        for (const category of categories) {
            const categoryPath = path.join(driverTypePath, category);
            const categoryStats = await fs.stat(categoryPath);
            
            if (categoryStats.isDirectory()) {
                await this.validateDriverCategory(driverType, category, categoryPath);
            }
        }
    }

    async validateDriverCategory(driverType, category, categoryPath) {
        const drivers = await fs.readdir(categoryPath);
        
        for (const driver of drivers) {
            const driverPath = path.join(categoryPath, driver);
            const driverStats = await fs.stat(driverPath);
            
            if (driverStats.isDirectory()) {
                await this.validateDriver(driverType, category, driver, driverPath);
            }
        }
    }

    async validateDriver(driverType, category, driver, driverPath) {
        this.stats.total++;
        
        try {
            // Vérifier les fichiers requis
            const requiredFiles = ['driver.js', 'device.js', 'driver.compose.json'];
            const missingFiles = [];
            
            for (const file of requiredFiles) {
                if (!(await fs.pathExists(path.join(driverPath, file)))) {
                    missingFiles.push(file);
                }
            }
            
            if (missingFiles.length > 0) {
                this.addError(`Driver ${driver}: fichiers manquants: ${missingFiles.join(', ')}`);
                this.stats.invalid++;
            } else {
                // Vérifier le contenu des fichiers
                await this.validateDriverFiles(driver, driverPath);
                this.stats.valid++;
            }
            
        } catch (error) {
            this.addError(`Driver ${driver}: erreur validation: ${error.message}`);
            this.stats.invalid++;
        }
    }

    async validateDriverFiles(driver, driverPath) {
        // Vérifier driver.js
        const driverJsPath = path.join(driverPath, 'driver.js');
        if (await fs.pathExists(driverJsPath)) {
            const content = await fs.readFile(driverJsPath, 'utf8');
            if (content.includes('TODO') || content.length < 100) {
                this.addWarning(`Driver ${driver}: driver.js semble incomplet`);
            }
        }
        
        // Vérifier device.js
        const deviceJsPath = path.join(driverPath, 'device.js');
        if (await fs.pathExists(deviceJsPath)) {
            const content = await fs.readFile(deviceJsPath, 'utf8');
            if (content.includes('TODO') || content.length < 100) {
                this.addWarning(`Driver ${driver}: device.js semble incomplet`);
            }
        }
        
        // Vérifier driver.compose.json
        const composePath = path.join(driverPath, 'driver.compose.json');
        if (await fs.pathExists(composePath)) {
            try {
                const compose = await fs.readJson(composePath);
                if (!compose.capabilities || compose.capabilities.length === 0) {
                    this.addWarning(`Driver ${driver}: capabilities manquantes dans driver.compose.json`);
                }
            } catch (error) {
                this.addError(`Driver ${driver}: driver.compose.json invalide: ${error.message}`);
            }
        }
    }

    async validateCriticalFiles() {
        this.log('\n🔍 VALIDATION FICHIERS CRITIQUES...');
        
        const criticalFiles = [
            'package.json',
            'README.md',
            'assets/icon.svg'
        ];
        
        for (const file of criticalFiles) {
            const filePath = path.join(this.projectRoot, file);
            if (await fs.pathExists(filePath)) {
                this.log(`  ✅ ${file}`);
            } else {
                this.addWarning(`${file} manquant`);
            }
        }
    }

    getNestedValue(obj, path) {
        return path.split('.').reduce((current, key) => current && current[key], obj);
    }

    addError(message) {
        this.errors.push(message);
    }

    addWarning(message) {
        this.warnings.push(message);
    }

    generateReport() {
        this.log('\n📋 RAPPORT DE VALIDATION LOCALE');
        this.log('=' .repeat(50));
        
        this.log(`📊 STATISTIQUES:`);
        this.log(`  Total drivers: ${this.stats.total}`);
        this.log(`  Valides: ${this.stats.valid}`);
        this.log(`  Invalides: ${this.stats.invalid}`);
        
        if (this.errors.length > 0) {
            this.log(`\n❌ ERREURS (${this.errors.length}):`);
            this.errors.forEach(error => this.log(`  - ${error}`));
        }
        
        if (this.warnings.length > 0) {
            this.log(`\n⚠️  AVERTISSEMENTS (${this.warnings.length}):`);
            this.warnings.forEach(warning => this.log(`  - ${warning}`));
        }
        
        if (this.errors.length === 0) {
            this.log('\n🎉 VALIDATION LOCALE RÉUSSIE !');
            this.log('✅ L\'app est prête pour la validation Homey complète');
        } else {
            this.log('\n🔧 CORRECTIONS REQUISES:');
            this.log('  Corrigez les erreurs ci-dessus avant de continuer');
        }
        
        this.log('\n🚀 PROCHAINES ÉTAPES:');
        if (this.errors.length === 0) {
            this.log('  1. Lancer: npx homey app validate (validation complète)');
            this.log('  2. Tester en local: npx homey app run');
            this.log('  3. Push vers GitHub');
        } else {
            this.log('  1. Corriger les erreurs ci-dessus');
            this.log('  2. Relancer la validation locale');
        }
    }
}

// Exécuter
if (require.main === module) {
    const validator = new LocalValidator();
    validator.run().catch(console.error);
}
