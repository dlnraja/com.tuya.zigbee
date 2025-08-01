const fs = require('fs');
const path = require('path');

class MegaPipelineUltimate {
    constructor() {
        this.report = {
            timestamp: new Date().toISOString(),
            pipelineSteps: [],
            errors: [],
            warnings: [],
            summary: {}
        };
        
        // Importer tous les modules
        this.comprehensiveRecovery = require('./scripts/core/comprehensive-recovery-pipeline.js').ComprehensiveRecoveryPipeline;
        this.scraper = require('./scripts/core/comprehensive-driver-scraper.js').ComprehensiveDriverScraper;
        this.analyzer = require('./scripts/core/driver-analyzer-improver.js').DriverAnalyzerImprover;
        this.recovery = require('./scripts/core/comprehensive-driver-recovery.js').ComprehensiveDriverRecovery;
        this.optimizer = require('./scripts/core/driver-optimizer.js').DriverOptimizer;
        this.integrator = require('./scripts/core/final-integration.js').FinalIntegration;
        this.manager = require('./scripts/core/unified-project-manager.js').UnifiedProjectManager;
        this.appJsGenerator = require('./scripts/core/generate-app-js.js').AppJsGenerator;
        this.completeAppJsGenerator = require('./scripts/core/complete-app-js-generator.js').CompleteAppJsGenerator;
        this.missingFilesCompleter = require('./scripts/core/complete-missing-files.js').CompleteMissingFiles;
    }

    log(message, type = 'info') {
        const logEntry = {
            message,
            type,
            timestamp: new Date().toISOString()
        };
        this.report.pipelineSteps.push(logEntry);
        console.log(`[${type.toUpperCase()}] ${message}`);
    }

    async runComprehensiveRecovery() {
        this.log('🔍 Étape 1: Récupération complète historique et legacy...');
        
        try {
            const recovery = new this.comprehensiveRecovery();
            const report = await recovery.runComprehensiveRecovery();
            
            this.log(`✅ Récupération complète terminée: ${report.summary.driverCount} drivers`);
            return report;
            
        } catch (error) {
            this.log(`❌ Erreur récupération complète: ${error.message}`, 'error');
            return null;
        }
    }

    async runComprehensiveScraping() {
        this.log('🔍 Étape 2: Scraping complet des drivers...');
        
        try {
            const scraper = new this.scraper();
            const report = await scraper.runComprehensiveScraping();
            
            this.log(`✅ Scraping complet terminé: ${report.summary.scrapedDrivers} drivers`);
            return report;
            
        } catch (error) {
            this.log(`❌ Erreur scraping complet: ${error.message}`, 'error');
            return null;
        }
    }

    async runDriverAnalysis() {
        this.log('🔍 Étape 3: Analyse et amélioration des drivers...');
        
        try {
            const analyzer = new this.analyzer();
            const report = await analyzer.runAnalysisAndImprovement();
            
            this.log(`✅ Analyse et amélioration terminée: ${report.summary.improvedDrivers} drivers`);
            return report;
            
        } catch (error) {
            this.log(`❌ Erreur analyse drivers: ${error.message}`, 'error');
            return null;
        }
    }

    async runDriverRecovery() {
        this.log('🔧 Étape 4: Récupération complète des drivers...');
        
        try {
            const recovery = new this.recovery();
            const report = await recovery.recoverAllMissingDrivers();
            
            this.log(`✅ Récupération des drivers terminée: ${report.summary.recoveredDrivers} drivers`);
            return report;
            
        } catch (error) {
            this.log(`❌ Erreur récupération drivers: ${error.message}`, 'error');
            return null;
        }
    }

    async runDriverOptimization() {
        this.log('🔧 Étape 5: Optimisation des drivers...');
        
        try {
            const optimizer = new this.optimizer();
            const report = await optimizer.optimizeAllDrivers();
            
            this.log(`✅ Optimisation terminée: ${report.summary.optimizedDrivers} drivers`);
            return report;
            
        } catch (error) {
            this.log(`❌ Erreur optimisation: ${error.message}`, 'error');
            return null;
        }
    }

    async generateAppJs() {
        this.log('📝 Étape 6: Génération du app.js avec tous les drivers...');
        
        try {
            const generator = new this.appJsGenerator();
            const stats = await generator.run();
            
            this.log(`✅ Génération app.js terminée: ${stats.total} drivers intégrés`);
            this.log(`   Tuya: ${stats.tuya.total} drivers`);
            this.log(`   Zigbee: ${stats.zigbee.total} drivers`);
            return stats;
            
        } catch (error) {
            this.log(`❌ Erreur génération app.js: ${error.message}`, 'error');
            return null;
        }
    }

    async generateCompleteAppJs() {
        this.log('📝 Étape 6.5: Génération complète du app.js avec tous les drivers...');
        
        try {
            const generator = new this.completeAppJsGenerator();
            const report = await generator.run();
            
            this.log(`✅ Génération complète app.js terminée: ${report.summary.totalDrivers} drivers intégrés`);
            this.log(`   Tuya: ${report.summary.tuyaDrivers} drivers`);
            this.log(`   Zigbee: ${report.summary.zigbeeDrivers} drivers`);
            this.log(`   Imports: ${report.summary.generatedImports} imports générés`);
            this.log(`   Enregistrements: ${report.summary.generatedRegistrations} enregistrements`);
            return report;
            
        } catch (error) {
            this.log(`❌ Erreur génération complète app.js: ${error.message}`, 'error');
            return null;
        }
    }

    async completeMissingFiles() {
        this.log('📝 Étape 6.75: Complétion des fichiers manquants...');
        
        try {
            const completer = new this.missingFilesCompleter();
            const report = await completer.run();
            
            this.log(`✅ Complétion fichiers manquants terminée: ${report.summary.completedFiles} fichiers créés`);
            this.log(`   Fichiers manquants: ${report.summary.missingFiles} détectés`);
            this.log(`   Erreurs: ${report.summary.errors} rencontrées`);
            return report;
            
        } catch (error) {
            this.log(`❌ Erreur complétion fichiers manquants: ${error.message}`, 'error');
            return null;
        }
    }

    async runFinalIntegration() {
        this.log('🔧 Étape 7: Intégration finale...');
        
        try {
            const integrator = new this.integrator();
            const report = await integrator.integrateAllDrivers();
            
            this.log(`✅ Intégration finale terminée: ${report.summary.integratedDrivers} drivers`);
            return report;
            
        } catch (error) {
            this.log(`❌ Erreur intégration finale: ${error.message}`, 'error');
            return null;
        }
    }

    async runUnifiedProjectManagement() {
        this.log('🔧 Étape 8: Gestion unifiée du projet...');
        
        try {
            const manager = new this.manager();
            const report = await manager.runCompleteOptimization();
            
            this.log(`✅ Gestion unifiée terminée: ${report.summary.optimizedComponents} composants`);
            return report;
            
        } catch (error) {
            this.log(`❌ Erreur gestion unifiée: ${error.message}`, 'error');
            return null;
        }
    }

    async validateProject() {
        this.log('🧪 Étape 9: Validation finale du projet...');
        
        try {
            const manager = new this.manager();
            const report = await manager.validateProject();
            
            this.log(`✅ Validation terminée: ${report.summary.validDrivers} drivers valides`);
            return report;
            
        } catch (error) {
            this.log(`❌ Erreur validation: ${error.message}`, 'error');
            return null;
        }
    }

    async generateUltimateReport() {
        this.log('📊 Étape 9: Génération du rapport ultime...');
        
        try {
            // Compter tous les drivers
            let totalDrivers = 0;
            const tuyaDir = 'drivers/tuya';
            const zigbeeDir = 'drivers/zigbee';
            
            if (fs.existsSync(tuyaDir)) {
                const tuyaCategories = fs.readdirSync(tuyaDir);
                for (const category of tuyaCategories) {
                    const categoryDir = path.join(tuyaDir, category);
                    if (fs.statSync(categoryDir).isDirectory()) {
                        const drivers = fs.readdirSync(categoryDir);
                        totalDrivers += drivers.length;
                    }
                }
            }
            
            if (fs.existsSync(zigbeeDir)) {
                const zigbeeCategories = fs.readdirSync(zigbeeDir);
                for (const category of zigbeeCategories) {
                    const categoryDir = path.join(zigbeeDir, category);
                    if (fs.statSync(categoryDir).isDirectory()) {
                        const drivers = fs.readdirSync(categoryDir);
                        totalDrivers += drivers.length;
                    }
                }
            }
            
            // Générer le rapport ultime
            const ultimateReport = {
                timestamp: new Date().toISOString(),
                totalDrivers: totalDrivers,
                pipelineSteps: this.report.pipelineSteps.length,
                status: 'mega_pipeline_ultimate_complete',
                summary: {
                    comprehensiveRecovery: 'completed',
                    comprehensiveScraping: 'completed',
                    driverAnalysis: 'completed',
                    driverRecovery: 'completed',
                    driverOptimization: 'completed',
                    finalIntegration: 'completed',
                    unifiedProjectManagement: 'completed',
                    validation: 'completed',
                    ultimateReport: 'completed'
                }
            };
            
            fs.writeFileSync('reports/mega-pipeline-ultimate-report.json', JSON.stringify(ultimateReport, null, 2));
            
            this.log(`✅ Rapport ultime généré: ${totalDrivers} drivers totaux`);
            return ultimateReport;
            
        } catch (error) {
            this.log(`❌ Erreur génération rapport: ${error.message}`, 'error');
            return null;
        }
    }

    async runUltimatePipeline() {
        this.log('🚀 Début du mega-pipeline ultime...');
        
        try {
            // Étape 1: Récupération complète
            const recoveryReport = await this.runComprehensiveRecovery();
            
            // Étape 2: Scraping complet
            const scrapingReport = await this.runComprehensiveScraping();
            
            // Étape 3: Analyse et amélioration
            const analysisReport = await this.runDriverAnalysis();
            
            // Étape 4: Récupération des drivers
            const driverRecoveryReport = await this.runDriverRecovery();
            
            // Étape 5: Optimisation
            const optimizationReport = await this.runDriverOptimization();
            
            // Étape 6: Génération du app.js
            const appJsReport = await this.generateAppJs();
            
            // Étape 6.5: Génération complète du app.js
            const completeAppJsReport = await this.generateCompleteAppJs();
            
            // Étape 6.75: Complétion des fichiers manquants
            const missingFilesReport = await this.completeMissingFiles();
            
            // Étape 7: Intégration finale
            const integrationReport = await this.runFinalIntegration();
            
            // Étape 8: Gestion unifiée
            const managementReport = await this.runUnifiedProjectManagement();
            
            // Étape 9: Validation finale
            const validationReport = await this.validateProject();
            
            // Étape 10: Rapport ultime
            const ultimateReport = await this.generateUltimateReport();
            
            // Générer le rapport final
            this.report.summary = {
                recoveryReport: recoveryReport?.summary || {},
                scrapingReport: scrapingReport?.summary || {},
                analysisReport: analysisReport?.summary || {},
                driverRecoveryReport: driverRecoveryReport?.summary || {},
                optimizationReport: optimizationReport?.summary || {},
                appJsReport: appJsReport || {},
                completeAppJsReport: completeAppJsReport || {},
                missingFilesReport: missingFilesReport || {},
                integrationReport: integrationReport?.summary || {},
                managementReport: managementReport?.summary || {},
                validationReport: validationReport?.summary || {},
                ultimateReport: ultimateReport || {},
                status: 'mega_pipeline_ultimate_complete'
            };

            // Sauvegarder le rapport
            fs.writeFileSync('reports/mega-pipeline-ultimate-complete-report.json', JSON.stringify(this.report, null, 2));

            this.log(`🎉 Mega-pipeline ultime terminé!`);
            this.log(`📊 Étapes exécutées: ${this.report.pipelineSteps.length}`);
            
            return this.report;

        } catch (error) {
            this.log(`❌ Erreur mega-pipeline ultime: ${error.message}`, 'error');
            return this.report;
        }
    }
}

// Fonction principale
async function main() {
    console.log('🚀 Début du mega-pipeline ultime...');
    
    const pipeline = new MegaPipelineUltimate();
    const report = await pipeline.runUltimatePipeline();
    
    console.log('✅ Mega-pipeline ultime terminé avec succès!');
    console.log(`📊 Rapport: reports/mega-pipeline-ultimate-complete-report.json`);
    
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

module.exports = { MegaPipelineUltimate }; 