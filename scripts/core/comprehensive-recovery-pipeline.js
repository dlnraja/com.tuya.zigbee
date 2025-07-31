const fs = require('fs');
const path = require('path');

class ComprehensiveRecoveryPipeline {
    constructor() {
        this.report = {
            timestamp: new Date().toISOString(),
            recoverySteps: [],
            recoveredDrivers: [],
            recoveredScripts: [],
            errors: [],
            warnings: [],
            summary: {}
        };
        
        // Importer les modules de récupération
        this.historicalRecovery = require('./historical-driver-recovery.js').HistoricalDriverRecovery;
        this.legacyRecovery = require('./legacy-script-recovery.js').LegacyScriptRecovery;
        this.ultimateAnalyzer = require('./ultimate-driver-analyzer.js').UltimateDriverAnalyzer;
    }

    log(message, type = 'info') {
        const logEntry = {
            message,
            type,
            timestamp: new Date().toISOString()
        };
        this.report.recoverySteps.push(logEntry);
        console.log(`[${type.toUpperCase()}] ${message}`);
    }

    async runHistoricalRecovery() {
        this.log('🔍 Étape 1: Récupération historique des drivers...');
        
        try {
            const recovery = new this.historicalRecovery();
            const report = await recovery.runHistoricalRecovery();
            
            this.log(`✅ Récupération historique terminée: ${report.summary.recoveredDrivers} drivers`);
            return report;
            
        } catch (error) {
            this.log(`❌ Erreur récupération historique: ${error.message}`, 'error');
            return null;
        }
    }

    async runLegacyRecovery() {
        this.log('🔧 Étape 2: Récupération des scripts legacy...');
        
        try {
            const recovery = new this.legacyRecovery();
            const report = await recovery.runLegacyRecovery();
            
            this.log(`✅ Récupération legacy terminée: ${report.summary.recoveredScripts} scripts`);
            return report;
            
        } catch (error) {
            this.log(`❌ Erreur récupération legacy: ${error.message}`, 'error');
            return null;
        }
    }

    async runUltimateAnalysis() {
        this.log('🔍 Étape 3: Analyse ultime des drivers...');
        
        try {
            const analyzer = new this.ultimateAnalyzer();
            const report = await analyzer.runUltimateAnalysis();
            
            this.log(`✅ Analyse ultime terminée: ${report.summary.createdDrivers} drivers créés`);
            return report;
            
        } catch (error) {
            this.log(`❌ Erreur analyse ultime: ${error.message}`, 'error');
            return null;
        }
    }

    async updateAppJs() {
        this.log('📝 Étape 4: Mise à jour d\'app.js...');
        
        try {
            const appJsPath = 'app.js';
            let appJsContent = '';
            
            if (fs.existsSync(appJsPath)) {
                appJsContent = fs.readFileSync(appJsPath, 'utf8');
            }
            
            // Collecter tous les drivers
            const allDrivers = [];
            
            // Drivers Tuya
            const tuyaDir = 'drivers/tuya';
            if (fs.existsSync(tuyaDir)) {
                const tuyaCategories = fs.readdirSync(tuyaDir);
                for (const category of tuyaCategories) {
                    const categoryDir = path.join(tuyaDir, category);
                    if (fs.statSync(categoryDir).isDirectory()) {
                        const drivers = fs.readdirSync(categoryDir);
                        for (const driver of drivers) {
                            const driverDir = path.join(categoryDir, driver);
                            const composePath = path.join(driverDir, 'driver.compose.json');
                            
                            if (fs.existsSync(composePath)) {
                                const compose = JSON.parse(fs.readFileSync(composePath, 'utf8'));
                                allDrivers.push({
                                    id: driver,
                                    class: compose.class,
                                    path: `./drivers/tuya/${category}/${driver}/device.js`
                                });
                            }
                        }
                    }
                }
            }
            
            // Drivers Zigbee
            const zigbeeDir = 'drivers/zigbee';
            if (fs.existsSync(zigbeeDir)) {
                const zigbeeCategories = fs.readdirSync(zigbeeDir);
                for (const category of zigbeeCategories) {
                    const categoryDir = path.join(zigbeeDir, category);
                    if (fs.statSync(categoryDir).isDirectory()) {
                        const drivers = fs.readdirSync(categoryDir);
                        for (const driver of drivers) {
                            const driverDir = path.join(categoryDir, driver);
                            const composePath = path.join(driverDir, 'driver.compose.json');
                            
                            if (fs.existsSync(composePath)) {
                                const compose = JSON.parse(fs.readFileSync(composePath, 'utf8'));
                                allDrivers.push({
                                    id: driver,
                                    class: compose.class,
                                    path: `./drivers/zigbee/${category}/${driver}/device.js`
                                });
                            }
                        }
                    }
                }
            }
            
            // Générer le nouveau contenu d'app.js
            const newAppJs = this.generateAppJsContent(allDrivers);
            fs.writeFileSync(appJsPath, newAppJs);
            
            this.log(`✅ app.js mis à jour avec ${allDrivers.length} drivers`);
            return allDrivers.length;
            
        } catch (error) {
            this.log(`❌ Erreur mise à jour app.js: ${error.message}`, 'error');
            return 0;
        }
    }

    generateAppJsContent(drivers) {
        const driverImports = drivers.map(driver => 
            `const ${driver.id.replace(/[-_]/g, '')} = require('${driver.path}');`
        ).join('\n');
        
        const driverRegistrations = drivers.map(driver => 
            `  this.registerDriver(${driver.id.replace(/[-_]/g, '')});`
        ).join('\n');
        
        return `'use strict';

const { HomeyApp } = require('homey');

// Driver imports
${driverImports}

class TuyaZigbeeApp extends HomeyApp {
  async onInit() {
    this.log('Tuya Zigbee App is running...');
    
    // Register all drivers
${driverRegistrations}
  }
}

module.exports = TuyaZigbeeApp;`;
    }

    async validateProject() {
        this.log('🧪 Étape 5: Validation du projet...');
        
        try {
            // Vérifier la structure
            const requiredFiles = ['app.js', 'app.json', 'package.json', 'README.md'];
            const missingFiles = [];
            
            for (const file of requiredFiles) {
                if (!fs.existsSync(file)) {
                    missingFiles.push(file);
                }
            }
            
            if (missingFiles.length > 0) {
                this.log(`⚠️ Fichiers manquants: ${missingFiles.join(', ')}`, 'warning');
            } else {
                this.log('✅ Structure du projet valide');
            }
            
            // Compter les drivers
            let driverCount = 0;
            const tuyaDir = 'drivers/tuya';
            const zigbeeDir = 'drivers/zigbee';
            
            if (fs.existsSync(tuyaDir)) {
                const tuyaCategories = fs.readdirSync(tuyaDir);
                for (const category of tuyaCategories) {
                    const categoryDir = path.join(tuyaDir, category);
                    if (fs.statSync(categoryDir).isDirectory()) {
                        const drivers = fs.readdirSync(categoryDir);
                        driverCount += drivers.length;
                    }
                }
            }
            
            if (fs.existsSync(zigbeeDir)) {
                const zigbeeCategories = fs.readdirSync(zigbeeDir);
                for (const category of zigbeeCategories) {
                    const categoryDir = path.join(zigbeeDir, category);
                    if (fs.statSync(categoryDir).isDirectory()) {
                        const drivers = fs.readdirSync(categoryDir);
                        driverCount += drivers.length;
                    }
                }
            }
            
            this.log(`✅ ${driverCount} drivers détectés`);
            
            return {
                valid: missingFiles.length === 0,
                driverCount: driverCount,
                missingFiles: missingFiles
            };
            
        } catch (error) {
            this.log(`❌ Erreur validation: ${error.message}`, 'error');
            return { valid: false, driverCount: 0, missingFiles: [] };
        }
    }

    async runComprehensiveRecovery() {
        this.log('🚀 Début de la récupération complète...');
        
        try {
            // Étape 1: Récupération historique
            const historicalReport = await this.runHistoricalRecovery();
            
            // Étape 2: Récupération legacy
            const legacyReport = await this.runLegacyRecovery();
            
            // Étape 3: Analyse ultime
            const analysisReport = await this.runUltimateAnalysis();
            
            // Étape 4: Mise à jour app.js
            const driverCount = await this.updateAppJs();
            
            // Étape 5: Validation
            const validation = await this.validateProject();
            
            // Générer le rapport final
            this.report.summary = {
                historicalRecovery: historicalReport?.summary || {},
                legacyRecovery: legacyReport?.summary || {},
                analysisReport: analysisReport?.summary || {},
                driverCount: driverCount,
                validation: validation,
                status: 'comprehensive_recovery_complete'
            };

            // Sauvegarder le rapport
            fs.writeFileSync('reports/comprehensive-recovery-pipeline-report.json', JSON.stringify(this.report, null, 2));

            this.log(`🎉 Récupération complète terminée!`);
            this.log(`📊 Drivers totaux: ${driverCount}`);
            this.log(`📊 Validation: ${validation.valid ? '✅' : '❌'}`);
            
            return this.report;

        } catch (error) {
            this.log(`❌ Erreur récupération complète: ${error.message}`, 'error');
            return this.report;
        }
    }
}

// Fonction principale
async function main() {
    console.log('🚀 Début de la récupération complète...');
    
    const pipeline = new ComprehensiveRecoveryPipeline();
    const report = await pipeline.runComprehensiveRecovery();
    
    console.log('✅ Récupération complète terminée avec succès!');
    console.log(`📊 Rapport: reports/comprehensive-recovery-pipeline-report.json`);
    
    return report;
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

module.exports = { ComprehensiveRecoveryPipeline }; 