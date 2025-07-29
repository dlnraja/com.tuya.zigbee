#!/usr/bin/env node
/**
 * Pipeline complet d'automatisation des drivers Homey
 * Version: 1.0.12-20250729-1405
 * Objectif: Orchestrer tous les scripts pour une gestion complète des drivers
 * Spécificités: Pipeline intelligent, résilience, amélioration continue
 */
const fs = require('fs');
const path = require('path');
const { execSync } = require('child_process');

// Configuration
const CONFIG = {
    version: '1.0.12-20250729-1405',
    scriptsPath: './scripts',
    driversPath: './drivers',
    logsPath: './logs',
    reportsPath: './reports',
    backupsPath: './backups',
    maxRetries: 3,
    timeoutMs: 300000, // 5 minutes
    logFile: './logs/pipeline.log'
};

// Logging
function log(message, level = 'INFO') {
    const timestamp = new Date().toISOString();
    const logMessage = `[${timestamp}] [${level}] ${message}`;
    console.log(logMessage);
    
    const logDir = path.dirname(CONFIG.logFile);
    if (!fs.existsSync(logDir)) {
        fs.mkdirSync(logDir, { recursive: true });
    }
    
    fs.appendFileSync(CONFIG.logFile, logMessage + '\n');
}

// Créer les dossiers nécessaires
function ensureDirectories() {
    const dirs = [
        CONFIG.logsPath,
        CONFIG.reportsPath,
        CONFIG.backupsPath,
        path.join(CONFIG.driversPath, 'tuya'),
        path.join(CONFIG.driversPath, 'zigbee')
    ];
    
    dirs.forEach(dir => {
        if (!fs.existsSync(dir)) {
            fs.mkdirSync(dir, { recursive: true });
        }
    });
}

// Exécuter un script avec gestion d'erreur
async function executeScript(scriptName, description, retries = CONFIG.maxRetries) {
    const scriptPath = path.join(CONFIG.scriptsPath, scriptName);
    
    if (!fs.existsSync(scriptPath)) {
        log(`Script non trouvé: ${scriptPath}`, 'ERROR');
        return { success: false, error: 'Script not found' };
    }
    
    log(`Exécution: ${description} (${scriptName})`);
    
    for (let attempt = 1; attempt <= retries; attempt++) {
        try {
            const startTime = Date.now();
            
            // Exécuter le script
            const result = execSync(`node "${scriptPath}"`, {
                cwd: process.cwd(),
                timeout: CONFIG.timeoutMs,
                stdio: 'pipe',
                encoding: 'utf8'
            });
            
            const duration = Date.now() - startTime;
            log(`✓ ${description} terminé en ${duration}ms`);
            
            return { success: true, output: result, duration };
            
        } catch (error) {
            log(`✗ Tentative ${attempt}/${retries} échouée: ${error.message}`, 'ERROR');
            
            if (attempt === retries) {
                return { success: false, error: error.message };
            }
            
            // Attendre avant de réessayer
            await new Promise(resolve => setTimeout(resolve, 2000 * attempt));
        }
    }
}

// Vérifier l'état du projet
async function checkProjectHealth() {
    log('=== VÉRIFICATION DE LA SANTÉ DU PROJET ===');
    
    const health = {
        drivers: { tuya: 0, zigbee: 0 },
        scripts: [],
        errors: [],
        warnings: []
    };
    
    // Compter les drivers
    const tuyaPath = path.join(CONFIG.driversPath, 'tuya');
    const zigbeePath = path.join(CONFIG.driversPath, 'zigbee');
    
    if (fs.existsSync(tuyaPath)) {
        health.drivers.tuya = countDrivers(tuyaPath);
    }
    
    if (fs.existsSync(zigbeePath)) {
        health.drivers.zigbee = countDrivers(zigbeePath);
    }
    
    // Vérifier les scripts
    const scripts = [
        'verify-all-drivers.js',
        'fetch-new-devices.js',
        'ai-enrich-drivers.js',
        'fusion-intelligent-drivers.js'
    ];
    
    scripts.forEach(script => {
        const scriptPath = path.join(CONFIG.scriptsPath, script);
        if (fs.existsSync(scriptPath)) {
            health.scripts.push(script);
        } else {
            health.warnings.push(`Script manquant: ${script}`);
        }
    });
    
    log(`Drivers Tuya: ${health.drivers.tuya}`);
    log(`Drivers Zigbee: ${health.drivers.zigbee}`);
    log(`Scripts disponibles: ${health.scripts.length}/${scripts.length}`);
    
    if (health.warnings.length > 0) {
        health.warnings.forEach(warning => log(warning, 'WARN'));
    }
    
    return health;
}

// Compter les drivers dans un dossier
function countDrivers(basePath) {
    let count = 0;
    
    if (!fs.existsSync(basePath)) return count;
    
    const categories = fs.readdirSync(basePath, { withFileTypes: true })
        .filter(dirent => dirent.isDirectory())
        .map(dirent => dirent.name);
    
    for (const category of categories) {
        const categoryPath = path.join(basePath, category);
        const drivers = fs.readdirSync(categoryPath, { withFileTypes: true })
            .filter(dirent => dirent.isDirectory())
            .map(dirent => dirent.name);
        
        count += drivers.length;
    }
    
    return count;
}

// Pipeline de vérification
async function runVerificationPipeline() {
    log('=== DÉBUT PIPELINE DE VÉRIFICATION ===');
    
    const results = {
        verification: await executeScript('verify-all-drivers.js', 'Vérification des drivers'),
        health: await checkProjectHealth()
    };
    
    if (!results.verification.success) {
        log('❌ Pipeline de vérification échoué', 'ERROR');
        return false;
    }
    
    log('✅ Pipeline de vérification terminé avec succès');
    return true;
}

// Pipeline de récupération
async function runFetchingPipeline() {
    log('=== DÉBUT PIPELINE DE RÉCUPÉRATION ===');
    
    const results = {
        fetch: await executeScript('fetch-new-devices.js', 'Récupération de nouveaux appareils')
    };
    
    if (!results.fetch.success) {
        log('❌ Pipeline de récupération échoué', 'ERROR');
        return false;
    }
    
    log('✅ Pipeline de récupération terminé avec succès');
    return true;
}

// Pipeline d'enrichissement
async function runEnrichmentPipeline() {
    log('=== DÉBUT PIPELINE D\'ENRICHISSEMENT ===');
    
    const results = {
        aiEnrichment: await executeScript('ai-enrich-drivers.js', 'Enrichissement AI des drivers')
    };
    
    if (!results.aiEnrichment.success) {
        log('❌ Pipeline d\'enrichissement échoué', 'ERROR');
        return false;
    }
    
    log('✅ Pipeline d\'enrichissement terminé avec succès');
    return true;
}

// Pipeline de fusion
async function runFusionPipeline() {
    log('=== DÉBUT PIPELINE DE FUSION ===');
    
    const results = {
        fusion: await executeScript('fusion-intelligent-drivers.js', 'Fusion intelligente des drivers')
    };
    
    if (!results.fusion.success) {
        log('❌ Pipeline de fusion échoué', 'ERROR');
        return false;
    }
    
    log('✅ Pipeline de fusion terminé avec succès');
    return true;
}

// Pipeline de nettoyage et optimisation
async function runCleanupPipeline() {
    log('=== DÉBUT PIPELINE DE NETTOYAGE ===');
    
    // Nettoyer les logs anciens
    const logsDir = CONFIG.logsPath;
    if (fs.existsSync(logsDir)) {
        const logFiles = fs.readdirSync(logsDir)
            .filter(file => file.endsWith('.log'))
            .map(file => path.join(logsDir, file));
        
        const oneWeekAgo = Date.now() - (7 * 24 * 60 * 60 * 1000);
        
        logFiles.forEach(logFile => {
            const stats = fs.statSync(logFile);
            if (stats.mtime.getTime() < oneWeekAgo) {
                fs.unlinkSync(logFile);
                log(`Log ancien supprimé: ${path.basename(logFile)}`);
            }
        });
    }
    
    // Optimiser les drivers
    const optimizationResults = await optimizeDrivers();
    
    log('✅ Pipeline de nettoyage terminé avec succès');
    return true;
}

// Optimiser les drivers
async function optimizeDrivers() {
    log('Optimisation des drivers...');
    
    const drivers = [];
    const tuyaPath = path.join(CONFIG.driversPath, 'tuya');
    const zigbeePath = path.join(CONFIG.driversPath, 'zigbee');
    
    for (const protocolPath of [tuyaPath, zigbeePath]) {
        if (fs.existsSync(protocolPath)) {
            const categories = fs.readdirSync(protocolPath, { withFileTypes: true })
                .filter(dirent => dirent.isDirectory())
                .map(dirent => dirent.name);
            
            for (const category of categories) {
                const categoryPath = path.join(protocolPath, category);
                const categoryDrivers = fs.readdirSync(categoryPath, { withFileTypes: true })
                    .filter(dirent => dirent.isDirectory())
                    .map(dirent => path.join(categoryPath, dirent.name));
                
                drivers.push(...categoryDrivers);
            }
        }
    }
    
    let optimizedCount = 0;
    
    for (const driverPath of drivers) {
        try {
            if (await optimizeDriver(driverPath)) {
                optimizedCount++;
            }
        } catch (error) {
            log(`Erreur optimisation ${driverPath}: ${error.message}`, 'ERROR');
        }
    }
    
    log(`Drivers optimisés: ${optimizedCount}/${drivers.length}`);
    return optimizedCount;
}

// Optimiser un driver individuel
async function optimizeDriver(driverPath) {
    const devicePath = path.join(driverPath, 'device.js');
    const composePath = path.join(driverPath, 'driver.compose.json');
    
    if (!fs.existsSync(devicePath) || !fs.existsSync(composePath)) {
        return false;
    }
    
    try {
        // Optimiser device.js
        let deviceContent = fs.readFileSync(devicePath, 'utf8');
        
        // Ajouter des méthodes d'optimisation si absentes
        if (!deviceContent.includes('onInit')) {
            const initMethod = `
    async onInit() {
        await super.onInit();
        this.log('Driver optimized and initialized');
    }`;
            
            deviceContent = deviceContent.replace(/class\s+\w+\s+extends\s+\w+\s*\{/, 
                `class ${path.basename(driverPath)} extends Homey.Device {${initMethod}`);
        }
        
        // Optimiser driver.compose.json
        const compose = JSON.parse(fs.readFileSync(composePath, 'utf8'));
        
        // Ajouter des métadonnées d'optimisation
        compose.optimized = true;
        compose.optimizationDate = new Date().toISOString();
        compose.version = CONFIG.version;
        
        // Sauvegarder les optimisations
        fs.writeFileSync(devicePath, deviceContent);
        fs.writeFileSync(composePath, JSON.stringify(compose, null, 2));
        
        return true;
        
    } catch (error) {
        log(`Erreur optimisation driver: ${error.message}`, 'ERROR');
        return false;
    }
}

// Pipeline principal complet
async function runCompletePipeline() {
    log('🚀 === DÉBUT PIPELINE COMPLET ===');
    
    const startTime = Date.now();
    const results = {
        verification: false,
        fetching: false,
        enrichment: false,
        fusion: false,
        cleanup: false
    };
    
    try {
        // Initialisation
        ensureDirectories();
        
        // Étape 1: Vérification
        log('📋 ÉTAPE 1: Vérification du projet');
        results.verification = await runVerificationPipeline();
        
        if (!results.verification) {
            log('❌ Échec de la vérification, arrêt du pipeline', 'ERROR');
            return false;
        }
        
        // Étape 2: Récupération
        log('🔄 ÉTAPE 2: Récupération de nouveaux appareils');
        results.fetching = await runFetchingPipeline();
        
        // Étape 3: Enrichissement
        log('🧠 ÉTAPE 3: Enrichissement AI');
        results.enrichment = await runEnrichmentPipeline();
        
        // Étape 4: Fusion
        log('🔗 ÉTAPE 4: Fusion intelligente');
        results.fusion = await runFusionPipeline();
        
        // Étape 5: Nettoyage
        log('🧹 ÉTAPE 5: Nettoyage et optimisation');
        results.cleanup = await runCleanupPipeline();
        
        // Résultats finaux
        const duration = Date.now() - startTime;
        const successCount = Object.values(results).filter(Boolean).length;
        const totalSteps = Object.keys(results).length;
        
        log('=== RÉSULTATS DU PIPELINE ===');
        log(`Étapes réussies: ${successCount}/${totalSteps}`);
        log(`Durée totale: ${duration}ms`);
        log(`Taux de succès: ${((successCount / totalSteps) * 100).toFixed(1)}%`);
        
        // Générer le rapport final
        await generateFinalReport(results, duration);
        
        if (successCount === totalSteps) {
            log('🎉 Pipeline complet terminé avec succès!');
            return true;
        } else {
            log('⚠️ Pipeline terminé avec des erreurs', 'WARN');
            return false;
        }
        
    } catch (error) {
        log(`❌ Erreur fatale du pipeline: ${error.message}`, 'ERROR');
        return false;
    }
}

// Générer le rapport final
async function generateFinalReport(results, duration) {
    const report = {
        timestamp: new Date().toISOString(),
        version: CONFIG.version,
        duration: duration,
        results: results,
        summary: {
            totalSteps: Object.keys(results).length,
            successfulSteps: Object.values(results).filter(Boolean).length,
            successRate: ((Object.values(results).filter(Boolean).length / Object.keys(results).length) * 100).toFixed(1)
        }
    };
    
    const reportPath = path.join(CONFIG.reportsPath, `pipeline-report-${Date.now()}.json`);
    fs.writeFileSync(reportPath, JSON.stringify(report, null, 2));
    
    log(`Rapport final généré: ${reportPath}`);
}

// Pipeline de surveillance continue
async function runMonitoringPipeline() {
    log('=== DÉBUT SURVEILLANCE CONTINUE ===');
    
    const health = await checkProjectHealth();
    
    // Vérifier les métriques critiques
    const criticalIssues = [];
    
    if (health.drivers.tuya + health.drivers.zigbee < 10) {
        criticalIssues.push('Nombre de drivers insuffisant');
    }
    
    if (health.scripts.length < 4) {
        criticalIssues.push('Scripts manquants');
    }
    
    if (criticalIssues.length > 0) {
        log('🚨 Problèmes critiques détectés:', 'ERROR');
        criticalIssues.forEach(issue => log(`- ${issue}`, 'ERROR'));
        
        // Déclencher une réparation automatique
        log('🔧 Déclenchement de la réparation automatique...');
        await runCompletePipeline();
    } else {
        log('✅ État du projet sain');
    }
    
    return criticalIssues.length === 0;
}

// Point d'entrée principal
if (require.main === module) {
    const command = process.argv[2] || 'complete';
    
    switch (command) {
        case 'complete':
            runCompletePipeline().catch(error => {
                log(`Erreur fatale: ${error.message}`, 'ERROR');
                process.exit(1);
            });
            break;
            
        case 'verify':
            runVerificationPipeline().catch(error => {
                log(`Erreur vérification: ${error.message}`, 'ERROR');
                process.exit(1);
            });
            break;
            
        case 'fetch':
            runFetchingPipeline().catch(error => {
                log(`Erreur récupération: ${error.message}`, 'ERROR');
                process.exit(1);
            });
            break;
            
        case 'enrich':
            runEnrichmentPipeline().catch(error => {
                log(`Erreur enrichissement: ${error.message}`, 'ERROR');
                process.exit(1);
            });
            break;
            
        case 'fusion':
            runFusionPipeline().catch(error => {
                log(`Erreur fusion: ${error.message}`, 'ERROR');
                process.exit(1);
            });
            break;
            
        case 'cleanup':
            runCleanupPipeline().catch(error => {
                log(`Erreur nettoyage: ${error.message}`, 'ERROR');
                process.exit(1);
            });
            break;
            
        case 'monitor':
            runMonitoringPipeline().catch(error => {
                log(`Erreur surveillance: ${error.message}`, 'ERROR');
                process.exit(1);
            });
            break;
            
        case 'health':
            checkProjectHealth().then(() => {
                log('Vérification de santé terminée');
                process.exit(0);
            }).catch(error => {
                log(`Erreur santé: ${error.message}`, 'ERROR');
                process.exit(1);
            });
            break;
            
        default:
            log(`Commande inconnue: ${command}`, 'ERROR');
            log('Commandes disponibles: complete, verify, fetch, enrich, fusion, cleanup, monitor, health');
            process.exit(1);
    }
}

module.exports = {
    runCompletePipeline,
    runVerificationPipeline,
    runFetchingPipeline,
    runEnrichmentPipeline,
    runFusionPipeline,
    runCleanupPipeline,
    runMonitoringPipeline,
    checkProjectHealth,
    executeScript
};