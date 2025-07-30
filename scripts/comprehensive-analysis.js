#!/usr/bin/env node

/**
 * Comprehensive Analysis - Tuya Zigbee
 * Analyse complète du projet pour identifier les gaps et optimisations
 * 
 * @author dlnraja / dylan.rajasekaram+homey@gmail.com
 * @version 1.0.12-20250729-1700
 */

const fs = require('fs');
const path = require('path');

// Configuration
const CONFIG = {
    version: "1.0.12-20250729-1700",
    driversDir: "./drivers",
    cacheDir: "./.cache",
    reportsDir: "./reports",
    analysisReportPath: "./reports/comprehensive-analysis.json",
    gapsReportPath: "./reports/gaps-analysis.json",
    optimizationReportPath: "./reports/optimization-plan.json",
    logFile: "./logs/comprehensive-analysis.log"
};

// Fonction de logging
function log(message, level = "INFO") {
    const timestamp = new Date().toISOString();
    const logMessage = `[${timestamp}] [${level}] ${message}`;
    console.log(logMessage);
    
    // Log dans fichier
    const logDir = path.dirname(CONFIG.logFile);
    if (!fs.existsSync(logDir)) {
        fs.mkdirSync(logDir, { recursive: true });
    }
    fs.appendFileSync(CONFIG.logFile, logMessage + "\n");
}

// Fonction pour scanner tous les drivers
function scanAllDrivers() {
    log("🔍 === SCAN COMPLET DES DRIVERS ===");
    
    const drivers = {
        total: 0,
        tuya: 0,
        zigbee: 0,
        generic: 0,
        todo: 0,
        byCategory: {},
        issues: [],
        missingFiles: [],
        incompleteDrivers: []
    };
    
    function scanDirectory(dir, category = "") {
        if (!fs.existsSync(dir)) return;
        
        const items = fs.readdirSync(dir);
        
        for (const item of items) {
            const fullPath = path.join(dir, item);
            const stat = fs.statSync(fullPath);
            
            if (stat.isDirectory()) {
                // Vérifier si c'est un driver
                const composePath = path.join(fullPath, 'driver.compose.json');
                const devicePath = path.join(fullPath, 'device.js');
                const imagesPath = path.join(fullPath, 'assets');
                
                if (fs.existsSync(composePath)) {
                    drivers.total++;
                    
                    // Compter par type
                    const normalizedPath = fullPath.replace(/\\/g, '/');
                    if (normalizedPath.includes('/tuya/')) {
                        drivers.tuya++;
                        category = "tuya";
                    } else if (normalizedPath.includes('/zigbee/')) {
                        drivers.zigbee++;
                        category = "zigbee";
                    } else if (normalizedPath.includes('/generic/')) {
                        drivers.generic++;
                        category = "generic";
                    } else if (normalizedPath.includes('/todo/')) {
                        drivers.todo++;
                        category = "todo";
                    }
                    
                    // Analyser la structure du driver
                    const driverAnalysis = analyzeDriver(fullPath, item);
                    if (driverAnalysis.issues.length > 0) {
                        drivers.issues.push({
                            driver: item,
                            path: fullPath,
                            issues: driverAnalysis.issues
                        });
                    }
                    
                    if (driverAnalysis.isIncomplete) {
                        drivers.incompleteDrivers.push({
                            driver: item,
                            path: fullPath,
                            missingFiles: driverAnalysis.missingFiles
                        });
                    }
                    
                    // Compter par catégorie
                    if (!drivers.byCategory[category]) {
                        drivers.byCategory[category] = 0;
                    }
                    drivers.byCategory[category]++;
                    
                } else {
                    // Vérifier les fichiers manquants
                    const missingFiles = [];
                    if (!fs.existsSync(composePath)) missingFiles.push('driver.compose.json');
                    if (!fs.existsSync(devicePath)) missingFiles.push('device.js');
                    if (!fs.existsSync(imagesPath)) missingFiles.push('assets/');
                    
                    if (missingFiles.length > 0) {
                        drivers.missingFiles.push({
                            path: fullPath,
                            missing: missingFiles
                        });
                    }
                }
                
                // Récursion
                scanDirectory(fullPath, category);
            }
        }
    }
    
    scanDirectory(CONFIG.driversDir);
    
    log(`✅ Scan terminé: ${drivers.total} drivers trouvés`);
    return drivers;
}

// Fonction pour analyser un driver spécifique
function analyzeDriver(driverPath, driverName) {
    const analysis = {
        issues: [],
        missingFiles: [],
        isIncomplete: false,
        capabilities: [],
        clusters: [],
        score: 100
    };
    
    // Vérifier driver.compose.json
    const composePath = path.join(driverPath, 'driver.compose.json');
    if (fs.existsSync(composePath)) {
        try {
            const composeData = JSON.parse(fs.readFileSync(composePath, 'utf8'));
            
            // Vérifier les champs requis
            if (!composeData.id) {
                analysis.issues.push("ID manquant dans driver.compose.json");
                analysis.score -= 20;
            }
            
            if (!composeData.capabilities || composeData.capabilities.length === 0) {
                analysis.issues.push("Aucune capacité définie");
                analysis.score -= 15;
            } else {
                analysis.capabilities = composeData.capabilities;
            }
            
            if (!composeData.clusters || composeData.clusters.length === 0) {
                analysis.issues.push("Aucun cluster défini");
                analysis.score -= 10;
            } else {
                analysis.clusters = composeData.clusters;
            }
            
        } catch (error) {
            analysis.issues.push(`Erreur parsing driver.compose.json: ${error.message}`);
            analysis.score -= 30;
        }
    } else {
        analysis.issues.push("Fichier driver.compose.json manquant");
        analysis.missingFiles.push('driver.compose.json');
        analysis.score -= 50;
    }
    
    // Vérifier device.js
    const devicePath = path.join(driverPath, 'device.js');
    if (!fs.existsSync(devicePath)) {
        analysis.issues.push("Fichier device.js manquant");
        analysis.missingFiles.push('device.js');
        analysis.score -= 25;
    }
    
    // Vérifier assets
    const assetsPath = path.join(driverPath, 'assets');
    if (!fs.existsSync(assetsPath)) {
        analysis.issues.push("Dossier assets manquant");
        analysis.missingFiles.push('assets/');
        analysis.score -= 10;
    }
    
    analysis.isIncomplete = analysis.score < 100;
    
    return analysis;
}

// Fonction pour analyser la base de données d'inférence
function analyzeInferenceDatabase() {
    log("🧠 === ANALYSE BASE DE DONNÉES D'INFÉRENCE ===");
    
    const analysis = {
        totalModels: 0,
        totalClusters: 0,
        averageConfidence: 0,
        missingModels: [],
        missingClusters: [],
        confidenceDistribution: {}
    };
    
    const inferenceDbPath = path.join(CONFIG.cacheDir, 'tuya-inference-db.json');
    if (fs.existsSync(inferenceDbPath)) {
        try {
            const data = JSON.parse(fs.readFileSync(inferenceDbPath, 'utf8'));
            
            analysis.totalModels = Object.keys(data.devices || {}).length;
            analysis.totalClusters = Object.keys(data.clusters || {}).length;
            
            // Calculer la confiance moyenne
            let totalConfidence = 0;
            let deviceCount = 0;
            
            for (const device of Object.values(data.devices || {})) {
                if (device.confidence) {
                    totalConfidence += device.confidence;
                    deviceCount++;
                    
                    // Distribution de confiance
                    const confidenceRange = Math.floor(device.confidence * 10) / 10;
                    analysis.confidenceDistribution[confidenceRange] = (analysis.confidenceDistribution[confidenceRange] || 0) + 1;
                }
            }
            
            analysis.averageConfidence = deviceCount > 0 ? totalConfidence / deviceCount : 0;
            
            // Identifier les modèles manquants
            const expectedModels = ['TS0001', 'TS0002', 'TS0003', 'TS0004', 'TS000F', 'TS0006', 'TS0007', 'TS0008', 'TS0009', 'TS0010'];
            for (const model of expectedModels) {
                if (!data.devices[model]) {
                    analysis.missingModels.push(model);
                }
            }
            
        } catch (error) {
            log(`❌ Erreur analyse base de données d'inférence: ${error.message}`, "ERROR");
        }
    } else {
        log("⚠️ Base de données d'inférence non trouvée", "WARN");
    }
    
    log(`✅ Analyse IA terminée: ${analysis.totalModels} modèles, ${analysis.totalClusters} clusters, confiance: ${analysis.averageConfidence.toFixed(2)}`);
    return analysis;
}

// Fonction pour analyser les gaps
function analyzeGaps(driversAnalysis, inferenceAnalysis) {
    log("🔍 === ANALYSE DES GAPS ===");
    
    const gaps = {
        drivers: {
            missing: [],
            incomplete: [],
            issues: []
        },
        inference: {
            missingModels: inferenceAnalysis.missingModels,
            missingClusters: inferenceAnalysis.missingClusters,
            lowConfidence: []
        },
        compatibility: {
            firmwareGaps: [],
            homeyBoxGaps: []
        },
        performance: {
            slowDrivers: [],
            memoryIssues: [],
            optimizationOpportunities: []
        }
    };
    
    // Analyser les drivers manquants
    if (driversAnalysis.tuya < 10) {
        gaps.drivers.missing.push("Drivers Tuya insuffisants");
    }
    
    if (driversAnalysis.zigbee < 5) {
        gaps.drivers.missing.push("Drivers Zigbee insuffisants");
    }
    
    // Analyser les drivers incomplets
    for (const incomplete of driversAnalysis.incompleteDrivers) {
        gaps.drivers.incomplete.push({
            driver: incomplete.driver,
            missingFiles: incomplete.missingFiles
        });
    }
    
    // Analyser les problèmes de confiance IA
    if (inferenceAnalysis.averageConfidence < 0.85) {
        gaps.inference.lowConfidence.push("Confiance moyenne trop faible");
    }
    
    // Identifier les opportunités d'optimisation
    if (driversAnalysis.total < 50) {
        gaps.performance.optimizationOpportunities.push("Nombre de drivers insuffisant");
    }
    
    log(`✅ Analyse gaps terminée: ${gaps.drivers.missing.length} drivers manquants, ${gaps.drivers.incomplete.length} incomplets`);
    return gaps;
}

// Fonction pour générer le plan d'optimisation
function generateOptimizationPlan(gaps) {
    log("🎯 === GÉNÉRATION PLAN D'OPTIMISATION ===");
    
    const plan = {
        priority: {
            high: [],
            medium: [],
            low: []
        },
        timeline: {
            immediate: [],
            shortTerm: [],
            longTerm: []
        },
        resources: {
            required: [],
            estimated: {}
        }
    };
    
    // Priorités hautes
    if (gaps.drivers.missing.length > 0) {
        plan.priority.high.push("Créer les drivers manquants");
        plan.timeline.immediate.push("Créer les drivers manquants");
    }
    
    if (gaps.drivers.incomplete.length > 0) {
        plan.priority.high.push("Compléter les drivers incomplets");
        plan.timeline.immediate.push("Compléter les drivers incomplets");
    }
    
    if (gaps.inference.lowConfidence.length > 0) {
        plan.priority.high.push("Améliorer la confiance IA");
        plan.timeline.immediate.push("Améliorer la confiance IA");
    }
    
    // Priorités moyennes
    if (gaps.inference.missingModels.length > 0) {
        plan.priority.medium.push("Ajouter les modèles manquants");
        plan.timeline.shortTerm.push("Ajouter les modèles manquants");
    }
    
    // Priorités basses
    if (gaps.performance.optimizationOpportunities.length > 0) {
        plan.priority.low.push("Optimisations de performance");
        plan.timeline.longTerm.push("Optimisations de performance");
    }
    
    // Estimation des ressources
    plan.resources.estimated = {
        driversToCreate: gaps.drivers.missing.length,
        driversToComplete: gaps.drivers.incomplete.length,
        modelsToAdd: gaps.inference.missingModels.length,
        estimatedTime: "2-3 jours"
    };
    
    log(`✅ Plan d'optimisation généré: ${plan.priority.high.length} priorités hautes, ${plan.priority.medium.length} moyennes, ${plan.priority.low.length} basses`);
    return plan;
}

// Fonction pour sauvegarder les rapports
function saveReports(reports) {
    log("💾 === SAUVEGARDE RAPPORTS D'ANALYSE ===");
    
    // Créer le dossier reports s'il n'existe pas
    if (!fs.existsSync(CONFIG.reportsDir)) {
        fs.mkdirSync(CONFIG.reportsDir, { recursive: true });
    }
    
    try {
        // Sauvegarder le rapport d'analyse complète
        fs.writeFileSync(CONFIG.analysisReportPath, JSON.stringify(reports.analysis, null, 2));
        log(`✅ Rapport d'analyse sauvegardé: ${CONFIG.analysisReportPath}`);
        
        // Sauvegarder le rapport des gaps
        fs.writeFileSync(CONFIG.gapsReportPath, JSON.stringify(reports.gaps, null, 2));
        log(`✅ Rapport des gaps sauvegardé: ${CONFIG.gapsReportPath}`);
        
        // Sauvegarder le plan d'optimisation
        fs.writeFileSync(CONFIG.optimizationReportPath, JSON.stringify(reports.optimization, null, 2));
        log(`✅ Plan d'optimisation sauvegardé: ${CONFIG.optimizationReportPath}`);
        
        return true;
    } catch (error) {
        log(`❌ Erreur sauvegarde rapports: ${error.message}`, "ERROR");
        return false;
    }
}

// Fonction principale
function main() {
    log("🚀 === DÉMARRAGE ANALYSE COMPLÈTE ===");
    
    try {
        // 1. Scanner tous les drivers
        const driversAnalysis = scanAllDrivers();
        
        // 2. Analyser la base de données d'inférence
        const inferenceAnalysis = analyzeInferenceDatabase();
        
        // 3. Analyser les gaps
        const gaps = analyzeGaps(driversAnalysis, inferenceAnalysis);
        
        // 4. Générer le plan d'optimisation
        const optimizationPlan = generateOptimizationPlan(gaps);
        
        // 5. Sauvegarder les rapports
        const reports = {
            analysis: {
                timestamp: new Date().toISOString(),
                version: CONFIG.version,
                drivers: driversAnalysis,
                inference: inferenceAnalysis
            },
            gaps: gaps,
            optimization: optimizationPlan
        };
        
        const success = saveReports(reports);
        
        if (success) {
            log("🎉 Analyse complète terminée avec succès");
            log(`📊 Résultats: ${driversAnalysis.total} drivers, ${inferenceAnalysis.totalModels} modèles IA, ${gaps.drivers.missing.length} gaps identifiés`);
        } else {
            log("❌ Échec analyse complète", "ERROR");
            process.exit(1);
        }
        
    } catch (error) {
        log(`❌ Erreur critique: ${error.message}`, "ERROR");
        process.exit(1);
    }
}

// Exécution
if (require.main === module) {
    main();
}

module.exports = {
    comprehensiveAnalysis: main,
    scanAllDrivers,
    analyzeDriver,
    analyzeInferenceDatabase,
    analyzeGaps,
    generateOptimizationPlan,
    saveReports
}; 