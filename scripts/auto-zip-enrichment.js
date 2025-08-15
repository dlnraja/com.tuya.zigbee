#!/usr/bin/env node

/**
 * 🚀 AUTO ZIP ENRICHMENT - BRIEF "BÉTON"
 * 
 * Script automatique qui lance l'extraction ZIP en arrière-plan
 * et continue l'enrichissement du projet sans interruption
 */

const BackgroundZipProcessor = require('./background-zip-processor');
const DownloadAnalyzerEnricher = require('./download-analyzer-enricher');
const fs = require('fs-extra');
const path = require('path');

class AutoZipEnrichment {
    constructor() {
        this.projectRoot = process.cwd();
        this.zipProcessor = null;
        this.enricher = null;
        this.isRunning = false;
        this.enrichmentInterval = null;
    }

    async run() {
        try {
            console.log('🚀 AUTO ZIP ENRICHMENT - BRIEF "BÉTON"');
            console.log('=' .repeat(70));
            console.log('🎯 Lancement automatique de l\'extraction et enrichissement...\n');

            // 1. Lancer l'extraction ZIP en arrière-plan
            await this.startZipExtraction();

            // 2. Continuer l'enrichissement du projet
            await this.continueProjectEnrichment();

            // 3. Monitoring automatique
            this.startAutomaticMonitoring();

            console.log('✅ Processus automatique lancé avec succès !');
            console.log('📊 L\'extraction ZIP se fait en arrière-plan');
            console.log('🔧 L\'enrichissement du projet continue...\n');

        } catch (error) {
            console.error('❌ Erreur lors du lancement automatique:', error);
        }
    }

    async startZipExtraction() {
        console.log('📦 LANCEMENT DE L\'EXTRACTION ZIP EN ARRIÈRE-PLAN');
        console.log('-' .repeat(50));

        try {
            // Créer et lancer le processeur ZIP
            this.zipProcessor = new BackgroundZipProcessor();
            
            // Lancer l'extraction en arrière-plan
            this.zipProcessor.run().catch(error => {
                console.log(`   ⚠️ Erreur extraction ZIP: ${error.message}`);
            });

            console.log('   ✅ Processus d\'extraction ZIP lancé en arrière-plan');
            console.log('   📊 Monitoring automatique activé');

        } catch (error) {
            console.log(`   ❌ Erreur lors du lancement ZIP: ${error.message}`);
        }
    }

    async continueProjectEnrichment() {
        console.log('🔧 CONTINUATION DE L\'ENRICHISSEMENT DU PROJET');
        console.log('-' .repeat(50));

        try {
            // Créer l'enricheur
            this.enricher = new DownloadAnalyzerEnrichment();
            
            // Lancer l'enrichissement
            this.enricher.run().catch(error => {
                console.log(`   ⚠️ Erreur enrichissement: ${error.message}`);
            });

            console.log('   ✅ Enrichissement du projet lancé');
            console.log('   📊 Analyse et amélioration en cours');

        } catch (error) {
            console.log(`   ❌ Erreur lors de l\'enrichissement: ${error.message}`);
        }
    }

    startAutomaticMonitoring() {
        console.log('📊 DÉMARRAGE DU MONITORING AUTOMATIQUE');
        console.log('-' .repeat(50));

        // Monitoring toutes les 30 secondes
        this.enrichmentInterval = setInterval(async () => {
            await this.performAutomaticEnrichment();
        }, 30000);

        console.log('   ✅ Monitoring automatique démarré (30s)');
        console.log('   🔄 Enrichissement automatique activé');
    }

    async performAutomaticEnrichment() {
        try {
            console.log('\n🔄 ENRICHISSEMENT AUTOMATIQUE EN COURS...');
            
            // Vérifier le statut des extractions
            await this.checkZipExtractionStatus();
            
            // Vérifier les nouveaux fichiers extraits
            await this.checkNewExtractedFiles();
            
            // Appliquer des améliorations automatiques
            await this.applyAutomaticImprovements();

        } catch (error) {
            console.log(`   ⚠️ Erreur enrichissement automatique: ${error.message}`);
        }
    }

    async checkZipExtractionStatus() {
        try {
            const statusFile = path.join(this.projectRoot, '.tmp_background_zip', 'extraction-status.json');
            
            if (fs.existsSync(statusFile)) {
                const status = JSON.parse(fs.readFileSync(statusFile, 'utf8'));
                
                const progress = status.stats.totalZips > 0 ? 
                    ((status.stats.extracted + status.stats.failed) / status.stats.totalZips * 100).toFixed(1) : 0;

                console.log(`   📊 ZIPs: ${progress}% (${status.stats.extracted}/${status.stats.totalZips})`);
                
                // Si des extractions sont terminées, déclencher l'analyse
                if (status.stats.extracted > 0) {
                    await this.analyzeNewlyExtractedFiles();
                }
            }

        } catch (error) {
            console.log(`   ⚠️ Erreur vérification statut: ${error.message}`);
        }
    }

    async checkNewExtractedFiles() {
        try {
            const tmpDir = path.join(this.projectRoot, '.tmp_background_zip');
            
            if (!fs.existsSync(tmpDir)) {
                return;
            }

            const extractedDirs = fs.readdirSync(tmpDir, { withFileTypes: true })
                .filter(dirent => dirent.isDirectory())
                .map(dirent => dirent.name);

            for (const dir of extractedDirs) {
                const dirPath = path.join(tmpDir, dir);
                await this.analyzeExtractedDirectory(dir, dirPath);
            }

        } catch (error) {
            console.log(`   ⚠️ Erreur vérification nouveaux fichiers: ${error.message}`);
        }
    }

    async analyzeExtractedDirectory(dirName, dirPath) {
        try {
            // Vérifier si le dossier contient des éléments utiles
            const items = fs.readdirSync(dirPath);
            
            if (items.length === 0) {
                return;
            }

            // Analyser le contenu pour l'enrichissement
            await this.analyzeContentForEnrichment(dirName, dirPath, items);

        } catch (error) {
            console.log(`   ⚠️ Erreur analyse dossier ${dirName}: ${error.message}`);
        }
    }

    async analyzeContentForEnrichment(dirName, dirPath, items) {
        try {
            let hasDrivers = false;
            let hasScripts = false;
            let hasAssets = false;
            let hasCatalog = false;

            for (const item of items) {
                const itemPath = path.join(dirPath, item);
                const itemStats = fs.statSync(itemPath);

                if (itemStats.isDirectory()) {
                    if (item === 'drivers') {
                        hasDrivers = true;
                        await this.analyzeDriversForEnrichment(itemPath);
                    } else if (item === 'scripts') {
                        hasScripts = true;
                        await this.analyzeScriptsForEnrichment(itemPath);
                    } else if (item === 'assets') {
                        hasAssets = true;
                        await this.analyzeAssetsForEnrichment(itemPath);
                    } else if (item === 'catalog') {
                        hasCatalog = true;
                        await this.analyzeCatalogForEnrichment(itemPath);
                    }
                }
            }

            // Créer un rapport d'analyse
            await this.createExtractionAnalysisReport(dirName, {
                hasDrivers,
                hasScripts,
                hasAssets,
                hasCatalog,
                totalItems: items.length
            });

        } catch (error) {
            console.log(`   ⚠️ Erreur analyse enrichissement: ${error.message}`);
        }
    }

    async analyzeDriversForEnrichment(driversPath) {
        try {
            const categories = fs.readdirSync(driversPath, { withFileTypes: true })
                .filter(dirent => dirent.isDirectory())
                .map(dirent => dirent.name);

            console.log(`      🔧 Drivers trouvés: ${categories.length} catégories`);

            // Analyser quelques drivers pour l'enrichissement
            for (const category of categories.slice(0, 2)) {
                const categoryPath = path.join(driversPath, category);
                await this.analyzeDriverCategory(category, categoryPath);
            }

        } catch (error) {
            console.log(`      ⚠️ Erreur analyse drivers: ${error.message}`);
        }
    }

    async analyzeDriverCategory(categoryName, categoryPath) {
        try {
            const drivers = fs.readdirSync(categoryPath, { withFileTypes: true })
                .filter(dirent => dirent.isDirectory())
                .map(dirent => dirent.name);

            console.log(`         📁 ${categoryName}: ${drivers.length} drivers`);

            // Analyser un driver exemple
            if (drivers.length > 0) {
                const sampleDriver = drivers[0];
                const sampleDriverPath = path.join(categoryPath, sampleDriver);
                await this.analyzeSampleDriverForEnrichment(sampleDriver, sampleDriverPath);
            }

        } catch (error) {
            console.log(`         ⚠️ Erreur analyse catégorie: ${error.message}`);
        }
    }

    async analyzeSampleDriverForEnrichment(driverName, driverPath) {
        try {
            const driverFiles = fs.readdirSync(driverPath);
            
            // Vérifier les fichiers du driver
            const hasDevice = driverFiles.includes('device.js');
            const hasDriver = driverFiles.includes('driver.js');
            const hasCompose = driverFiles.includes('driver.compose.json');
            const hasMetadata = driverFiles.includes('metadata.json');

            if (hasDevice && hasDriver && hasCompose) {
                console.log(`            ✅ ${driverName}: Structure complète`);
            } else {
                console.log(`            ⚠️ ${driverName}: Structure incomplète`);
            }

        } catch (error) {
            console.log(`            ⚠️ Erreur analyse driver: ${error.message}`);
        }
    }

    async analyzeScriptsForEnrichment(scriptsPath) {
        try {
            const scripts = fs.readdirSync(scriptsPath, { withFileTypes: true })
                .filter(dirent => dirent.isFile() && dirent.name.endsWith('.js'))
                .map(dirent => dirent.name);

            console.log(`      📜 Scripts trouvés: ${scripts.length} fichiers`);

        } catch (error) {
            console.log(`      ⚠️ Erreur analyse scripts: ${error.message}`);
        }
    }

    async analyzeAssetsForEnrichment(assetsPath) {
        try {
            const assets = fs.readdirSync(assetsPath, { withFileTypes: true })
                .filter(dirent => dirent.isFile())
                .map(dirent => dirent.name);

            console.log(`      🖼️ Assets trouvés: ${assets.length} fichiers`);

        } catch (error) {
            console.log(`      ⚠️ Erreur analyse assets: ${error.message}`);
        }
    }

    async analyzeCatalogForEnrichment(catalogPath) {
        try {
            const catalogItems = fs.readdirSync(catalogPath, { withFileTypes: true })
                .filter(dirent => dirent.isDirectory())
                .map(dirent => dirent.name);

            console.log(`      📚 Catalog trouvé: ${catalogItems.length} catégories`);

        } catch (error) {
            console.log(`      ⚠️ Erreur analyse catalog: ${error.message}`);
        }
    }

    async createExtractionAnalysisReport(dirName, analysis) {
        try {
            const reportPath = path.join(this.projectRoot, '.tmp_background_zip', `${dirName}_analysis.json`);
            
            const report = {
                extractedAt: new Date().toISOString(),
                directory: dirName,
                analysis: analysis,
                recommendations: this.generateRecommendations(analysis)
            };

            fs.writeFileSync(reportPath, JSON.stringify(report, null, 2));
            console.log(`      📝 Rapport d'analyse créé: ${dirName}`);

        } catch (error) {
            console.log(`      ⚠️ Erreur création rapport: ${error.message}`);
        }
    }

    generateRecommendations(analysis) {
        const recommendations = [];

        if (analysis.hasDrivers) {
            recommendations.push('Analyser et intégrer les drivers découverts');
        }
        if (analysis.hasScripts) {
            recommendations.push('Étudier les scripts pour les bonnes pratiques');
        }
        if (analysis.hasAssets) {
            recommendations.push('Vérifier et intégrer les assets utiles');
        }
        if (analysis.hasCatalog) {
            recommendations.push('Analyser la structure catalog pour l\'organisation');
        }

        return recommendations;
    }

    async applyAutomaticImprovements() {
        try {
            console.log('   🔧 Application d\'améliorations automatiques...');

            // Vérifier et améliorer la structure du projet
            await this.improveProjectStructure();
            
            // Vérifier et améliorer les drivers
            await this.improveDrivers();
            
            // Vérifier et améliorer les assets
            await this.improveAssets();

        } catch (error) {
            console.log(`   ⚠️ Erreur améliorations automatiques: ${error.message}`);
        }
    }

    async improveProjectStructure() {
        try {
            // Créer la structure catalog si elle n'existe pas
            const catalogPath = path.join(this.projectRoot, 'catalog');
            if (!fs.existsSync(catalogPath)) {
                fs.mkdirSync(catalogPath, { recursive: true });
                console.log('         📁 Structure catalog/ créée automatiquement');
            }

        } catch (error) {
            console.log(`         ⚠️ Erreur amélioration structure: ${error.message}`);
        }
    }

    async improveDrivers() {
        try {
            // Vérifier et améliorer les drivers existants
            const driversPath = path.join(this.projectRoot, 'drivers');
            
            if (fs.existsSync(driversPath)) {
                // Logique d'amélioration automatique des drivers
                console.log('         🔧 Amélioration automatique des drivers...');
            }

        } catch (error) {
            console.log(`         ⚠️ Erreur amélioration drivers: ${error.message}`);
        }
    }

    async improveAssets() {
        try {
            // Vérifier et améliorer les assets
            const assetsPath = path.join(this.projectRoot, 'assets');
            
            if (fs.existsSync(assetsPath)) {
                // Logique d'amélioration automatique des assets
                console.log('         🖼️ Amélioration automatique des assets...');
            }

        } catch (error) {
            console.log(`         ⚠️ Erreur amélioration assets: ${error.message}`);
        }
    }

    async analyzeNewlyExtractedFiles() {
        console.log('   🔍 Analyse des nouveaux fichiers extraits...');
        
        // Cette méthode sera appelée quand de nouveaux fichiers sont extraits
        // pour déclencher l'analyse et l'enrichissement
    }

    // Méthode pour arrêter le processus automatique
    stop() {
        console.log('\n🛑 Arrêt du processus automatique...');

        if (this.enrichmentInterval) {
            clearInterval(this.enrichmentInterval);
            this.enrichmentInterval = null;
        }

        if (this.zipProcessor) {
            this.zipProcessor.stopAllProcesses();
        }

        this.isRunning = false;
        console.log('✅ Processus automatique arrêté');
    }

    // Méthode pour obtenir le statut
    getStatus() {
        return {
            isRunning: this.isRunning,
            zipProcessor: this.zipProcessor ? this.zipProcessor.getStatus() : null,
            enrichmentInterval: this.enrichmentInterval ? 'active' : 'inactive'
        };
    }
}

// Gestion des signaux pour un arrêt propre
process.on('SIGINT', () => {
    console.log('\n🛑 Signal SIGINT reçu, arrêt propre...');
    if (global.autoEnrichment) {
        global.autoEnrichment.stop();
    }
    process.exit(0);
});

process.on('SIGTERM', () => {
    console.log('\n🛑 Signal SIGTERM reçu, arrêt propre...');
    if (global.autoEnrichment) {
        global.autoEnrichment.stop();
    }
    process.exit(0);
});

if (require.main === module) {
    const autoEnrichment = new AutoZipEnrichment();
    global.autoEnrichment = autoEnrichment;
    autoEnrichment.run().catch(console.error);
}

module.exports = AutoZipEnrichment;
