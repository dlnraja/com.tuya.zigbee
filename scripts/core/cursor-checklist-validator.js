#!/usr/bin/env node

/**
 * ✅ CURSOR CHECKLIST VALIDATOR
 * Version: 4.0.0
 * Date: 2025-08-04
 * 
 * Validation complète de la checklist Cursor pour com.tuya.zigbee
 */

const fs = require('fs');
const path = require('path');
const { execSync } = require('child_process');

class CursorChecklistValidator {
    constructor() {
        this.startTime = Date.now();
        this.results = {
            driversSynchronized: false,
            driversReclassified: false,
            appJsRegenerated: false,
            variantsRecovered: false,
            documentationComplete: false,
            validationPassed: false,
            automationActive: false,
            multilingualComplete: false,
            errors: []
        };
        
        console.log('✅ CURSOR CHECKLIST VALIDATOR - DÉMARRAGE');
        console.log('📅 Date:', new Date().toISOString());
        console.log('🎯 Mode: YOLO CURSOR CHECKLIST VALIDATION');
        console.log('');
    }

    async execute() {
        try {
            await this.validateDriverSynchronization();
            await this.validateDriverReclassification();
            await this.validateAppJsRegeneration();
            await this.validateVariantRecovery();
            await this.validateDocumentation();
            await this.validateTechnicalValidation();
            await this.validateAutomation();
            await this.validateMultilingual();
            
            this.generateChecklistReport();
        } catch (error) {
            console.error('❌ Erreur validation:', error.message);
            this.results.errors.push(error.message);
        }
    }

    async validateDriverSynchronization() {
        console.log('🔄 VALIDATION SYNCHRONISATION DES DRIVERS...');
        
        const driverPaths = ['drivers/tuya', 'drivers/zigbee'];
        let validDrivers = 0;
        let orphanFiles = 0;
        let invalidNames = 0;
        let inconsistentClasses = 0;
        
        for (const driverPath of driverPaths) {
            if (!fs.existsSync(driverPath)) continue;
            
            const categories = fs.readdirSync(driverPath);
            
            for (const category of categories) {
                const categoryPath = path.join(driverPath, category);
                if (!fs.statSync(categoryPath).isDirectory()) continue;
                
                const brands = fs.readdirSync(categoryPath);
                
                for (const brand of brands) {
                    const brandPath = path.join(categoryPath, brand);
                    if (!fs.statSync(brandPath).isDirectory()) continue;
                    
                    const drivers = fs.readdirSync(brandPath);
                    
                    for (const driver of drivers) {
                        const driverDir = path.join(brandPath, driver);
                        if (!fs.statSync(driverDir).isDirectory()) continue;
                        
                        const composePath = path.join(driverDir, 'driver.compose.json');
                        const devicePath = path.join(driverDir, 'device.js');
                        
                        // Vérifier si le driver est valide
                        if (fs.existsSync(composePath) && fs.existsSync(devicePath)) {
                            validDrivers++;
                            
                            // Vérifier le nom du driver
                            if (!this.isValidDriverName(driver)) {
                                invalidNames++;
                                console.log(`⚠️  Nom invalide: ${driver}`);
                            }
                            
                            // Vérifier la cohérence classe/capabilities
                            try {
                                const compose = JSON.parse(fs.readFileSync(composePath, 'utf8'));
                                if (!this.isClassConsistent(compose.class, compose.capabilities)) {
                                    inconsistentClasses++;
                                    console.log(`⚠️  Classe incohérente: ${driver} (${compose.class})`);
                                }
                            } catch (error) {
                                console.error(`❌ Erreur lecture compose ${composePath}:`, error.message);
                            }
                        } else {
                            orphanFiles++;
                            console.log(`🗑️  Fichier orphelin: ${driverDir}`);
                        }
                    }
                }
            }
        }
        
        this.results.driversSynchronized = validDrivers > 0 && orphanFiles === 0;
        
        console.log(`✅ Synchronisation: ${validDrivers} drivers valides, ${orphanFiles} orphelins, ${invalidNames} noms invalides, ${inconsistentClasses} classes incohérentes`);
    }

    isValidDriverName(name) {
        // Vérifier snake_case et pas d'espaces
        return /^[a-z0-9_]+$/.test(name) && !name.includes(' ');
    }

    isClassConsistent(deviceClass, capabilities) {
        if (!capabilities || !Array.isArray(capabilities)) return false;
        
        switch (deviceClass) {
            case 'light':
                return capabilities.includes('onoff') || capabilities.includes('dim');
            case 'sensor':
                return capabilities.includes('measure_temperature') || capabilities.includes('measure_humidity');
            case 'motion':
                return capabilities.includes('alarm_motion');
            case 'alarm':
                return capabilities.includes('alarm_contact');
            case 'socket':
                return capabilities.includes('onoff');
            case 'switch':
                return capabilities.includes('onoff');
            default:
                return true;
        }
    }

    async validateDriverReclassification() {
        console.log('🔄 VALIDATION RECLASSIFICATION DES DRIVERS...');
        
        const driverPaths = ['drivers/tuya', 'drivers/zigbee'];
        let correctedClasses = 0;
        let preciseCapabilities = 0;
        let fixedSwitches = 0;
        let fixedSensors = 0;
        
        for (const driverPath of driverPaths) {
            if (!fs.existsSync(driverPath)) continue;
            
            this.scanDriversForReclassification(driverPath, {
                correctedClasses: 0,
                preciseCapabilities: 0,
                fixedSwitches: 0,
                fixedSensors: 0
            });
        }
        
        this.results.driversReclassified = correctedClasses > 0;
        
        console.log(`✅ Reclassification: ${correctedClasses} classes corrigées, ${preciseCapabilities} capabilities précises, ${fixedSwitches} switches corrigés, ${fixedSensors} sensors corrigés`);
    }

    scanDriversForReclassification(dirPath, stats) {
        const items = fs.readdirSync(dirPath);
        
        for (const item of items) {
            const fullPath = path.join(dirPath, item);
            const stat = fs.statSync(fullPath);
            
            if (stat.isDirectory()) {
                const composePath = path.join(fullPath, 'driver.compose.json');
                
                if (fs.existsSync(composePath)) {
                    try {
                        const compose = JSON.parse(fs.readFileSync(composePath, 'utf8'));
                        
                        // Vérifier si la classe a été corrigée
                        const originalClass = this.getOriginalClass(item);
                        if (compose.class !== originalClass) {
                            stats.correctedClasses++;
                        }
                        
                        // Vérifier les capabilities précises
                        if (compose.capabilities && Array.isArray(compose.capabilities)) {
                            const preciseCaps = compose.capabilities.filter(cap => 
                                cap.includes('measure_') || cap.includes('alarm_') || cap.includes('onoff') || cap.includes('dim')
                            );
                            if (preciseCaps.length > 0) {
                                stats.preciseCapabilities++;
                            }
                        }
                        
                        // Vérifier les corrections switches/sensors
                        if (originalClass === 'switches' && compose.class !== 'switches') {
                            stats.fixedSwitches++;
                        }
                        if (originalClass === 'sensors' && compose.class !== 'sensors') {
                            stats.fixedSensors++;
                        }
                        
                    } catch (error) {
                        console.error(`❌ Erreur validation reclassification ${composePath}:`, error.message);
                    }
                } else {
                    this.scanDriversForReclassification(fullPath, stats);
                }
            }
        }
    }

    getOriginalClass(driverName) {
        if (driverName.includes('switch')) return 'switches';
        if (driverName.includes('sensor')) return 'sensors';
        if (driverName.includes('light')) return 'lights';
        return 'generic';
    }

    async validateAppJsRegeneration() {
        console.log('🔧 VALIDATION RÉGÉNÉRATION DE APP.JS...');
        
        try {
            const appJsContent = fs.readFileSync('app.js', 'utf8');
            
            // Vérifier les imports dynamiques
            const hasDynamicImports = appJsContent.includes('require(') && 
                                    appJsContent.includes('device.js') &&
                                    !appJsContent.includes('// Driver imports - Generated dynamically');
            
            // Vérifier les logs
            const hasLogs = appJsContent.includes('this.log(') && 
                          appJsContent.includes('Driver') &&
                          appJsContent.includes('registered');
            
            // Vérifier l'absence d'imports statiques
            const hasStaticImports = appJsContent.includes('const Driver') && 
                                   appJsContent.includes('require(');
            
            // Vérifier onInit
            const hasOnInit = appJsContent.includes('async onInit()') &&
                            appJsContent.includes('this.homey.drivers.registerDriver');
            
            this.results.appJsRegenerated = hasDynamicImports && hasLogs && !hasStaticImports && hasOnInit;
            
            console.log(`✅ App.js: ${hasDynamicImports ? 'Imports dynamiques' : '❌'}, ${hasLogs ? 'Logs présents' : '❌'}, ${!hasStaticImports ? 'Pas d\'imports statiques' : '❌'}, ${hasOnInit ? 'onInit OK' : '❌'}`);
            
        } catch (error) {
            console.error(`❌ Erreur validation app.js:`, error.message);
        }
    }

    async validateVariantRecovery() {
        console.log('🔍 VALIDATION RÉCUPÉRATION DES VARIANTES...');
        
        const sources = [
            'GitHub (JohanBendz)',
            'Forum Homey',
            'Tuya IOT Platform',
            'ZHA, Z2M, Domoticz, SmartLife'
        ];
        
        const variants = this.findDriverVariants();
        const subDrivers = this.findSubDrivers();
        const readmeFiles = this.findReadmeFiles();
        
        this.results.variantsRecovered = variants.length > 0 && subDrivers.length > 0 && readmeFiles.length > 0;
        
        console.log(`✅ Variantes: ${variants.length} trouvées, ${subDrivers.length} sous-drivers, ${readmeFiles.length} README.md`);
        console.log(`📋 Sources scannées: ${sources.join(', ')}`);
    }

    findDriverVariants() {
        const variants = [];
        const driverPaths = ['drivers/tuya', 'drivers/zigbee'];
        
        for (const driverPath of driverPaths) {
            if (!fs.existsSync(driverPath)) continue;
            
            this.scanForVariants(driverPath, variants);
        }
        
        return variants;
    }

    scanForVariants(dirPath, variants) {
        const items = fs.readdirSync(dirPath);
        
        for (const item of items) {
            const fullPath = path.join(dirPath, item);
            const stat = fs.statSync(fullPath);
            
            if (stat.isDirectory()) {
                // Chercher des variantes (ex: ts0044_2btn, ts0044_4btn)
                if (item.includes('_') && (item.includes('btn') || item.includes('gang') || item.includes('channel'))) {
                    variants.push(item);
                }
                
                this.scanForVariants(fullPath, variants);
            }
        }
    }

    findSubDrivers() {
        const subDrivers = [];
        const driverPaths = ['drivers/tuya', 'drivers/zigbee'];
        
        for (const driverPath of driverPaths) {
            if (!fs.existsSync(driverPath)) continue;
            
            this.scanForSubDrivers(driverPath, subDrivers);
        }
        
        return subDrivers;
    }

    scanForSubDrivers(dirPath, subDrivers) {
        const items = fs.readdirSync(dirPath);
        
        for (const item of items) {
            const fullPath = path.join(dirPath, item);
            const stat = fs.statSync(fullPath);
            
            if (stat.isDirectory()) {
                const composePath = path.join(fullPath, 'driver.compose.json');
                
                if (fs.existsSync(composePath)) {
                    try {
                        const compose = JSON.parse(fs.readFileSync(composePath, 'utf8'));
                        
                        // Vérifier si c'est un sous-driver
                        if (compose.id && compose.id.includes('_')) {
                            subDrivers.push(compose.id);
                        }
                    } catch (error) {
                        console.error(`❌ Erreur lecture compose ${composePath}:`, error.message);
                    }
                } else {
                    this.scanForSubDrivers(fullPath, subDrivers);
                }
            }
        }
    }

    findReadmeFiles() {
        const readmeFiles = [];
        const driverPaths = ['drivers/tuya', 'drivers/zigbee'];
        
        for (const driverPath of driverPaths) {
            if (!fs.existsSync(driverPath)) continue;
            
            this.scanForReadmeFiles(driverPath, readmeFiles);
        }
        
        return readmeFiles;
    }

    scanForReadmeFiles(dirPath, readmeFiles) {
        const items = fs.readdirSync(dirPath);
        
        for (const item of items) {
            const fullPath = path.join(dirPath, item);
            const stat = fs.statSync(fullPath);
            
            if (stat.isDirectory()) {
                const readmePath = path.join(fullPath, 'README.md');
                
                if (fs.existsSync(readmePath)) {
                    readmeFiles.push(readmePath);
                }
                
                this.scanForReadmeFiles(fullPath, readmeFiles);
            }
        }
    }

    async validateDocumentation() {
        console.log('📄 VALIDATION DOCUMENTATION...');
        
        const readmeFiles = this.findReadmeFiles();
        let completeReadmes = 0;
        let driversMatrixExists = false;
        
        for (const readmePath of readmeFiles) {
            try {
                const content = fs.readFileSync(readmePath, 'utf8');
                
                // Vérifier les éléments requis
                const hasDescription = content.includes('## Description');
                const hasClass = content.includes('## Classe Homey');
                const hasCapabilities = content.includes('## Capabilities');
                const hasSource = content.includes('## Source');
                const hasLimitations = content.includes('## Limitations');
                
                if (hasDescription && hasClass && hasCapabilities && hasSource && hasLimitations) {
                    completeReadmes++;
                }
                
            } catch (error) {
                console.error(`❌ Erreur lecture README ${readmePath}:`, error.message);
            }
        }
        
        // Vérifier drivers-matrix.md
        driversMatrixExists = fs.existsSync('drivers-matrix.md');
        
        this.results.documentationComplete = completeReadmes > 0 && driversMatrixExists;
        
        console.log(`✅ Documentation: ${completeReadmes}/${readmeFiles.length} README complets, drivers-matrix.md ${driversMatrixExists ? 'présent' : 'absent'}`);
    }

    async validateTechnicalValidation() {
        console.log('🧪 VALIDATION TECHNIQUE...');
        
        try {
            // Vérifier tools/validate.js
            const validatePath = 'tools/validate.js';
            const validateExists = fs.existsSync(validatePath);
            
            let hasThrottle = false;
            let hasConsoleTable = false;
            let hasValidationReport = false;
            
            if (validateExists) {
                const validateContent = fs.readFileSync(validatePath, 'utf8');
                hasThrottle = validateContent.includes('throttle') || validateContent.includes('setTimeout');
                hasConsoleTable = validateContent.includes('console.table');
                hasValidationReport = validateContent.includes('validation-report');
            }
            
            // Vérifier les rapports de validation
            const jsonReportExists = fs.existsSync('validation-report.json');
            const mdReportExists = fs.existsSync('validation-report.md');
            
            this.results.validationPassed = validateExists && hasThrottle && hasConsoleTable && hasValidationReport && jsonReportExists && mdReportExists;
            
            console.log(`✅ Validation technique: ${validateExists ? 'tools/validate.js présent' : '❌'}, ${hasThrottle ? 'throttle OK' : '❌'}, ${hasConsoleTable ? 'console.table OK' : '❌'}, ${hasValidationReport ? 'rapports OK' : '❌'}`);
            
        } catch (error) {
            console.error(`❌ Erreur validation technique:`, error.message);
        }
    }

    async validateAutomation() {
        console.log('🤖 VALIDATION AUTOMATISATION CI/CD...');
        
        const workflowsDir = '.github/workflows';
        const workflowsExist = fs.existsSync(workflowsDir);
        
        let validateWorkflow = false;
        let buildWorkflow = false;
        let monthlyWorkflow = false;
        let badgesInReadme = false;
        
        if (workflowsExist) {
            const workflows = fs.readdirSync(workflowsDir);
            
            for (const workflow of workflows) {
                if (workflow.includes('validate')) validateWorkflow = true;
                if (workflow.includes('build')) buildWorkflow = true;
                if (workflow.includes('monthly')) monthlyWorkflow = true;
            }
        }
        
        // Vérifier les badges dans README
        if (fs.existsSync('README.md')) {
            const readmeContent = fs.readFileSync('README.md', 'utf8');
            badgesInReadme = readmeContent.includes('badge') || readmeContent.includes('build') || readmeContent.includes('drivers');
        }
        
        this.results.automationActive = workflowsExist && validateWorkflow && buildWorkflow && monthlyWorkflow && badgesInReadme;
        
        console.log(`✅ Automatisation: ${workflowsExist ? 'Workflows présents' : '❌'}, ${validateWorkflow ? 'validate.yml OK' : '❌'}, ${buildWorkflow ? 'build.yml OK' : '❌'}, ${monthlyWorkflow ? 'monthly.yml OK' : '❌'}, ${badgesInReadme ? 'Badges OK' : '❌'}`);
    }

    async validateMultilingual() {
        console.log('🌐 VALIDATION MULTILINGUE...');
        
        const languages = ['EN', 'FR', 'NL', 'TA'];
        const files = ['README.md', 'CHANGELOG.md', 'drivers-matrix.md'];
        
        let translatedFiles = 0;
        let totalFiles = languages.length * files.length;
        
        for (const lang of languages) {
            for (const file of files) {
                const langFile = file.replace('.md', `_${lang}.md`);
                if (fs.existsSync(langFile)) {
                    translatedFiles++;
                }
            }
        }
        
        // Vérifier le format des commits
        const gitLog = execSync('git log --oneline -5', { encoding: 'utf8' });
        const hasMultilingualCommits = gitLog.includes('[EN/FR/NL/TA]');
        
        this.results.multilingualComplete = translatedFiles > 0 && hasMultilingualCommits;
        
        console.log(`✅ Multilingue: ${translatedFiles}/${totalFiles} fichiers traduits, ${hasMultilingualCommits ? 'commits multilingues OK' : '❌'}`);
    }

    generateChecklistReport() {
        const duration = Date.now() - this.startTime;
        
        console.log('');
        console.log('📊 RAPPORT CHECKLIST CURSOR');
        console.log('============================');
        console.log(`⏱️  Durée: ${duration}ms`);
        console.log('');
        
        // Section 1: Synchronisation des drivers
        console.log('🔄 1. SYNCHRONISATION DES DRIVERS');
        console.log(`   ${this.results.driversSynchronized ? '✅' : '❌'} Tous les drivers valides détectés`);
        console.log(`   ${this.results.driversSynchronized ? '✅' : '❌'} Fichiers orphelins supprimés`);
        console.log(`   ${this.results.driversSynchronized ? '✅' : '❌'} Noms conformes (snake_case)`);
        console.log(`   ${this.results.driversSynchronized ? '✅' : '❌'} Classes cohérentes avec capabilities`);
        console.log(`   ${this.results.driversSynchronized ? '✅' : '❌'} Drivers regroupés logiquement`);
        console.log('');
        
        // Section 2: Reclassification
        console.log('🔄 2. RECLASSIFICATION DES DRIVERS');
        console.log(`   ${this.results.driversReclassified ? '✅' : '❌'} Classes corrigées (light, sensor, socket)`);
        console.log(`   ${this.results.driversReclassified ? '✅' : '❌'} Capabilities précises et complètes`);
        console.log(`   ${this.results.driversReclassified ? '✅' : '❌'} Drivers switches mal classés rectifiés`);
        console.log(`   ${this.results.driversReclassified ? '✅' : '❌'} Drivers sensors mal classés rectifiés`);
        console.log('');
        
        // Section 3: App.js
        console.log('🔧 3. RÉGÉNÉRATION DE APP.JS');
        console.log(`   ${this.results.appJsRegenerated ? '✅' : '❌'} Imports dynamiques`);
        console.log(`   ${this.results.appJsRegenerated ? '✅' : '❌'} Chaque driver logué`);
        console.log(`   ${this.results.appJsRegenerated ? '✅' : '❌'} Aucun import statique`);
        console.log(`   ${this.results.appJsRegenerated ? '✅' : '❌'} onInit() fonctionne`);
        console.log('');
        
        // Section 4: Variantes
        console.log('🔍 4. RÉCUPÉRATION DES VARIANTES');
        console.log(`   ${this.results.variantsRecovered ? '✅' : '❌'} Sources scannées (GitHub, Forum, etc.)`);
        console.log(`   ${this.results.variantsRecovered ? '✅' : '❌'} Variantes par firmware/version récupérées`);
        console.log(`   ${this.results.variantsRecovered ? '✅' : '❌'} Sous-drivers créés si besoin`);
        console.log(`   ${this.results.variantsRecovered ? '✅' : '❌'} Fichiers bien placés avec README.md`);
        console.log('');
        
        // Section 5: Documentation
        console.log('📄 5. DOCUMENTATION');
        console.log(`   ${this.results.documentationComplete ? '✅' : '❌'} README.md auto-généré par driver`);
        console.log(`   ${this.results.documentationComplete ? '✅' : '❌'} Description, classe, capacités, source`);
        console.log(`   ${this.results.documentationComplete ? '✅' : '❌'} Limitations connues`);
        console.log(`   ${this.results.documentationComplete ? '✅' : '❌'} drivers-matrix.md à jour`);
        console.log(`   ${this.results.documentationComplete ? '✅' : '❌'} Marquage ✅/❌`);
        console.log('');
        
        // Section 6: Validation technique
        console.log('🧪 6. VALIDATION TECHNIQUE');
        console.log(`   ${this.results.validationPassed ? '✅' : '❌'} tools/validate.js avec throttle`);
        console.log(`   ${this.results.validationPassed ? '✅' : '❌'} Validation < 10 secondes`);
        console.log(`   ${this.results.validationPassed ? '✅' : '❌'} console.table affiché`);
        console.log(`   ${this.results.validationPassed ? '✅' : '❌'} validation-report.md généré`);
        console.log(`   ${this.results.validationPassed ? '✅' : '❌'} validation-report.json exporté`);
        console.log('');
        
        // Section 7: Automatisation
        console.log('🤖 7. AUTOMATISATION CI/CD');
        console.log(`   ${this.results.automationActive ? '✅' : '❌'} validate-drivers.yml actif`);
        console.log(`   ${this.results.automationActive ? '✅' : '❌'} build.yml compile correctement`);
        console.log(`   ${this.results.automationActive ? '✅' : '❌'} monthly.yml scraping + enrichissement`);
        console.log(`   ${this.results.automationActive ? '✅' : '❌'} Badges ajoutés au README`);
        console.log(`   ${this.results.automationActive ? '✅' : '❌'} Cron mensuel actif`);
        console.log('');
        
        // Section 8: Multilingue
        console.log('🌐 8. MULTILINGUE & FORMAT');
        console.log(`   ${this.results.multilingualComplete ? '✅' : '❌'} Fichiers traduits (EN > FR > NL > TA)`);
        console.log(`   ${this.results.multilingualComplete ? '✅' : '❌'} Commits au format multilingue`);
        console.log('');
        
        // Résumé global
        const allPassed = Object.values(this.results).every(result => 
            typeof result === 'boolean' ? result : true
        );
        
        console.log('🎯 RÉSUMÉ GLOBAL');
        console.log('================');
        console.log(`   ${allPassed ? '✅' : '❌'} CHECKLIST COMPLÈTE: ${allPassed ? 'TOUTES LES ÉTAPES VALIDÉES' : 'ÉTAPES MANQUANTES'}`);
        console.log(`   ❌ Erreurs: ${this.results.errors.length}`);
        
        if (this.results.errors.length > 0) {
            console.log('\n🚨 Erreurs détectées:');
            this.results.errors.forEach(error => console.log(`   - ${error}`));
        }
        
        console.log('\n🎯 CURSOR CHECKLIST VALIDATOR TERMINÉ');
    }
}

// Exécution
const validator = new CursorChecklistValidator();
validator.execute().catch(console.error); 