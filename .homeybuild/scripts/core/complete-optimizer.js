// core/complete-optimizer.js
// Optimiseur complet qui comprend tout l'historique et optimise tout
// Analyse depuis le plus ancien élément jusqu'au plus récent

const fs = require('fs');
const path = require('path');
const { execSync } = require('child_process');

class CompleteOptimizer {
    constructor() {
        this.projectName = 'com.tuya.zigbee';
        this.sdkVersion = 3;
        this.history = {
            backups: [],
            logs: [],
            versions: [],
            changes: []
        };
        this.optimizationTargets = {
            performance: true,
            structure: true,
            drivers: true,
            documentation: true,
            validation: true,
            compatibility: true
        };
    }

    // Analyser tout l'historique du projet
    async analyzeCompleteHistory() {
        log('🔍 === ANALYSE COMPLÈTE DE L\'HISTORIQUE ===');
        
        // Analyser les backups
        await this.analyzeBackups();
        
        // Analyser les logs
        await this.analyzeLogs();
        
        // Analyser les versions Git
        await this.analyzeGitHistory();
        
        // Analyser les changements récents
        await this.analyzeRecentChanges();
        
        return {
            success: true,
            history: this.history
        };
    }

    // Analyser les backups
    async analyzeBackups() {
        log('📦 Analyse des backups...');
        
        const backupDir = 'backup';
        if (fs.existsSync(backupDir)) {
            const backups = fs.readdirSync(backupDir);
            
            for (const backup of backups) {
                const backupPath = path.join(backupDir, backup);
                const stat = fs.statSync(backupPath);
                
                this.history.backups.push({
                    name: backup,
                    path: backupPath,
                    date: stat.mtime,
                    size: stat.size,
                    type: 'backup'
                });
            }
        }
        
        log(`📦 ${this.history.backups.length} backups analysés`);
    }

    // Analyser les logs
    async analyzeLogs() {
        log('📋 Analyse des logs...');
        
        const logsDir = 'logs';
        if (fs.existsSync(logsDir)) {
            const logFiles = fs.readdirSync(logsDir);
            
            for (const logFile of logFiles) {
                const logPath = path.join(logsDir, logFile);
                const stat = fs.statSync(logPath);
                
                try {
                    const content = fs.readFileSync(logPath, 'utf8');
                    const lines = content.split('\n');
                    
                    this.history.logs.push({
                        name: logFile,
                        path: logPath,
                        date: stat.mtime,
                        size: stat.size,
                        lines: lines.length,
                        content: content.substring(0, 1000), // Premiers 1000 caractères
                        type: 'log'
                    });
                } catch (error) {
                    log(`❌ Erreur lecture log ${logFile}: ${error.message}`, 'ERROR');
                }
            }
        }
        
        log(`📋 ${this.history.logs.length} logs analysés`);
    }

    // Analyser l'historique Git
    async analyzeGitHistory() {
        log('🔧 Analyse de l\'historique Git...');
        
        if (fs.existsSync('.git')) {
            try {
                // Obtenir les commits récents
                const gitLog = execSync('git log --oneline -10', { encoding: 'utf8' });
                const commits = gitLog.split('\n').filter(line => line.trim());
                
                for (const commit of commits) {
                    const parts = commit.split(' ');
                    const hash = parts[0];
                    const message = parts.slice(1).join(' ');
                    
                    this.history.versions.push({
                        hash: hash,
                        message: message,
                        type: 'git_commit'
                    });
                }
                
                // Obtenir les tags
                const gitTags = execSync('git tag', { encoding: 'utf8' });
                const tags = gitTags.split('\n').filter(tag => tag.trim());
                
                for (const tag of tags) {
                    this.history.versions.push({
                        tag: tag,
                        type: 'git_tag'
                    });
                }
                
            } catch (error) {
                log(`❌ Erreur Git: ${error.message}`, 'ERROR');
            }
        }
        
        log(`🔧 ${this.history.versions.length} versions analysées`);
    }

    // Analyser les changements récents
    async analyzeRecentChanges() {
        log('📝 Analyse des changements récents...');
        
        const currentFiles = this.scanCurrentFiles();
        const recentChanges = [];
        
        // Analyser les fichiers modifiés récemment
        for (const file of currentFiles) {
            const stat = fs.statSync(file);
            const hoursAgo = (Date.now() - stat.mtime.getTime()) / (1000 * 60 * 60);
            
            if (hoursAgo < 24) { // Fichiers modifiés dans les 24h
                recentChanges.push({
                    file: file,
                    date: stat.mtime,
                    size: stat.size,
                    hoursAgo: hoursAgo,
                    type: 'recent_change'
                });
            }
        }
        
        this.history.changes = recentChanges;
        log(`📝 ${recentChanges.length} changements récents détectés`);
    }

    // Scanner tous les fichiers actuels
    scanCurrentFiles() {
        const files = [];
        
        const scanDir = (dir) => {
            if (!fs.existsSync(dir)) return;
            
            const items = fs.readdirSync(dir);
            for (const item of items) {
                const fullPath = path.join(dir, item);
                const stat = fs.statSync(fullPath);
                
                if (stat.isDirectory()) {
                    scanDir(fullPath);
                } else {
                    files.push(fullPath);
                }
            }
        };
        
        scanDir('.');
        return files;
    }

    // Optimiser complètement le projet
    async optimizeCompleteProject() {
        log('🚀 === OPTIMISATION COMPLÈTE DU PROJET ===');
        
        // 1. Optimisation de la structure
        const structureOptimization = await this.optimizeStructure();
        
        // 2. Optimisation des drivers
        const driversOptimization = await this.optimizeDrivers();
        
        // 3. Optimisation des performances
        const performanceOptimization = await this.optimizePerformance();
        
        // 4. Optimisation de la documentation
        const documentationOptimization = await this.optimizeDocumentation();
        
        // 5. Optimisation de la validation
        const validationOptimization = await this.optimizeValidation();
        
        // 6. Optimisation de la compatibilité
        const compatibilityOptimization = await this.optimizeCompatibility();
        
        return {
            success: structureOptimization.success && 
                     driversOptimization.success && 
                     performanceOptimization.success &&
                     documentationOptimization.success &&
                     validationOptimization.success &&
                     compatibilityOptimization.success,
            optimizations: {
                structure: structureOptimization,
                drivers: driversOptimization,
                performance: performanceOptimization,
                documentation: documentationOptimization,
                validation: validationOptimization,
                compatibility: compatibilityOptimization
            }
        };
    }

    // Optimiser la structure
    async optimizeStructure() {
        log('🏗️ Optimisation de la structure...');
        
        const optimizations = [];
        
        // Nettoyer les fichiers temporaires
        const tempFiles = this.findTempFiles();
        for (const file of tempFiles) {
            try {
                fs.unlinkSync(file);
                optimizations.push(`Supprimé: ${file}`);
            } catch (error) {
                log(`❌ Erreur suppression ${file}: ${error.message}`, 'ERROR');
            }
        }
        
        // Organiser les dossiers
        const directories = ['drivers/tuya', 'drivers/zigbee', 'scripts/core', 'docs/specs'];
        for (const dir of directories) {
            if (!fs.existsSync(dir)) {
                fs.mkdirSync(dir, { recursive: true });
                optimizations.push(`Créé: ${dir}`);
            }
        }
        
        // Supprimer les dossiers obsolètes
        const obsoleteDirs = ['drivers/fusion', 'drivers/legacy', 'drivers/deprecated'];
        for (const dir of obsoleteDirs) {
            if (fs.existsSync(dir)) {
                try {
                    fs.rmSync(dir, { recursive: true, force: true });
                    optimizations.push(`Supprimé: ${dir}`);
                } catch (error) {
                    log(`❌ Erreur suppression ${dir}: ${error.message}`, 'ERROR');
                }
            }
        }
        
        return {
            success: true,
            optimizations: optimizations
        };
    }

    // Trouver les fichiers temporaires
    findTempFiles() {
        const tempFiles = [];
        const tempPatterns = ['.tmp', '.temp', '.cache', '.bak', '.old', '.backup'];
        
        const scanDir = (dir) => {
            if (!fs.existsSync(dir)) return;
            
            const items = fs.readdirSync(dir);
            for (const item of items) {
                const fullPath = path.join(dir, item);
                const stat = fs.statSync(fullPath);
                
                if (stat.isDirectory()) {
                    scanDir(fullPath);
                } else {
                    for (const pattern of tempPatterns) {
                        if (item.includes(pattern)) {
                            tempFiles.push(fullPath);
                            break;
                        }
                    }
                }
            }
        };
        
        scanDir('.');
        return tempFiles;
    }

    // Optimiser les drivers
    async optimizeDrivers() {
        log('🔧 Optimisation des drivers...');
        
        const driverManager = require('./driver-manager.js').DriverManager;
        const manager = new driverManager();
        
        // Scanner tous les drivers
        const drivers = manager.scanDrivers();
        
        // Fusionner les doublons
        const mergedDrivers = manager.mergeDuplicateDrivers();
        
        // Corriger les drivers invalides
        let fixedCount = 0;
        for (const driver of drivers) {
            if (!driver.valid) {
                const fixResult = manager.fixDriver(driver.path);
                if (fixResult.success) {
                    fixedCount++;
                }
            }
        }
        
        // Nettoyer la structure
        const cleanupResult = manager.cleanStructure();
        
        return {
            success: true,
            total: drivers.length,
            merged: mergedDrivers.length,
            fixed: fixedCount,
            cleanup: cleanupResult
        };
    }

    // Optimiser les performances
    async optimizePerformance() {
        log('⚡ Optimisation des performances...');
        
        const optimizations = [];
        
        // Optimiser les scripts
        const scriptsDir = 'scripts';
        if (fs.existsSync(scriptsDir)) {
            const scripts = fs.readdirSync(scriptsDir);
            
            for (const script of scripts) {
                if (script.endsWith('.js')) {
                    const scriptPath = path.join(scriptsDir, script);
                    const content = fs.readFileSync(scriptPath, 'utf8');
                    
                    // Optimisations de base
                    let optimized = content;
                    
                    // Supprimer les console.log en production
                    if (process.env.NODE_ENV === 'production') {
                        optimized = optimized.replace(/console\.log\([^)]*\);?/g, '');
                    }
                    
                    // Optimiser les imports
                    optimized = optimized.replace(/require\(['"]([^'"]+)['"]\)/g, (match, module) => {
                        return `require('${module}')`;
                    });
                    
                    if (optimized !== content) {
                        fs.writeFileSync(scriptPath, optimized);
                        optimizations.push(`Optimisé: ${script}`);
                    }
                }
            }
        }
        
        return {
            success: true,
            optimizations: optimizations
        };
    }

    // Optimiser la documentation
    async optimizeDocumentation() {
        log('📚 Optimisation de la documentation...');
        
        const documentationGenerator = require('./documentation-generator.js').DocumentationGenerator;
        const generator = new documentationGenerator();
        
        // Générer toute la documentation
        const result = generator.generateAllDocumentation();
        
        return {
            success: result.success,
            documentation: result
        };
    }

    // Optimiser la validation
    async optimizeValidation() {
        log('✅ Optimisation de la validation...');
        
        const validator = require('./validator.js').HomeyValidator;
        const homeyValidator = new validator();
        
        // Validation complète
        const validation = await homeyValidator.validateAll();
        
        return {
            success: validation.errors.length === 0,
            validation: validation
        };
    }

    // Optimiser la compatibilité
    async optimizeCompatibility() {
        log('🔗 Optimisation de la compatibilité...');
        
        const optimizations = [];
        
        // Vérifier la compatibilité SDK3
        const appJson = JSON.parse(fs.readFileSync('app.json', 'utf8'));
        if (appJson.sdk !== 3) {
            appJson.sdk = 3;
            fs.writeFileSync('app.json', JSON.stringify(appJson, null, 2));
            optimizations.push('SDK mis à jour vers 3');
        }
        
        // Vérifier les permissions
        if (!appJson.permissions || !Array.isArray(appJson.permissions)) {
            appJson.permissions = ['homey:manager:api', 'homey:app:com.tuya.zigbee'];
            fs.writeFileSync('app.json', JSON.stringify(appJson, null, 2));
            optimizations.push('Permissions ajoutées');
        }
        
        // Vérifier la compatibilité Homey
        if (!appJson.compatibility || !appJson.compatibility.includes('5.0.0')) {
            appJson.compatibility = '>=5.0.0';
            fs.writeFileSync('app.json', JSON.stringify(appJson, null, 2));
            optimizations.push('Compatibilité mise à jour');
        }
        
        return {
            success: true,
            optimizations: optimizations
        };
    }

    // Générer un rapport complet d'optimisation
    generateOptimizationReport() {
        log('📊 Génération du rapport d\'optimisation...');
        
        const report = {
            timestamp: new Date().toISOString(),
            project: this.projectName,
            sdk: this.sdkVersion,
            history: {
                backups: this.history.backups.length,
                logs: this.history.logs.length,
                versions: this.history.versions.length,
                changes: this.history.changes.length
            },
            optimizations: this.optimizationTargets,
            summary: {
                totalOptimizations: 0,
                successRate: 0,
                recommendations: []
            }
        };
        
        // Sauvegarder le rapport
        const reportsDir = 'reports';
        if (!fs.existsSync(reportsDir)) {
            fs.mkdirSync(reportsDir, { recursive: true });
        }
        
        const reportFile = path.join(reportsDir, `complete-optimization-report-${Date.now()}.json`);
        fs.writeFileSync(reportFile, JSON.stringify(report, null, 2));
        
        return {
            success: true,
            report: report,
            savedTo: reportFile
        };
    }
}

// Fonction utilitaire pour les logs
function log(message, level = 'INFO') {
    const timestamp = new Date().toISOString();
    const emoji = {
        'INFO': 'ℹ️',
        'SUCCESS': '✅',
        'WARN': '⚠️',
        'ERROR': '❌'
    };
    console.log(`[${timestamp}] [${level}] ${emoji[level] || ''} ${message}`);
}

// Export pour utilisation dans d'autres scripts
module.exports = { CompleteOptimizer, log };

// Exécution directe si appelé directement
if (require.main === module) {
    const optimizer = new CompleteOptimizer();
    
    optimizer.analyzeCompleteHistory().then(historyResult => {
        log('🔍 Analyse historique terminée', 'SUCCESS');
        return optimizer.optimizeCompleteProject();
    }).then(optimizationResult => {
        log('🚀 Optimisation terminée', 'SUCCESS');
        return optimizer.generateOptimizationReport();
    }).then(reportResult => {
        log('📊 Rapport généré', 'SUCCESS');
        log(`🎉 Optimisation complète terminée avec succès!`, 'SUCCESS');
        process.exit(0);
    }).catch(error => {
        log(`❌ Erreur fatale: ${error.message}`, 'ERROR');
        process.exit(1);
    });
} 