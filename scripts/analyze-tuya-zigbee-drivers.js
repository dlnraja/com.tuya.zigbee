#!/usr/bin/env node

/**
 * 🔍 Script d'analyse spécialisée des drivers Tuya et Zigbee
 * Optimisation et validation des drivers les plus importants
 * 
 * @author dlnraja / dylan.rajasekaram+homey@gmail.com
 * @version 1.0.0-20250730-2200
 */

const fs = require('fs');
const path = require('path');

// Configuration spécialisée Tuya/Zigbee
const CONFIG = {
    version: "1.0.0-20250730-2200",
    verbose: true,
    logFile: "./logs/tuya-zigbee-analysis.log",
    tuyaPatterns: [
        'TS0601', 'TS0602', 'TS0603', 'TS0604', 'TS0605',
        'TS0001', 'TS0002', 'TS0003', 'TS0004', 'TS0005',
        'TS0006', 'TS0007', 'TS0008', 'TS0009', 'TS0010',
        '_TZ3000', '_TZ3001', '_TZ3002', '_TZ3003', '_TZ3004',
        '_TZ3005', '_TZ3006', '_TZ3007', '_TZ3008', '_TZ3009',
        '_TZ3010', '_TZ3011', '_TZ3012', '_TZ3013', '_TZ3014'
    ],
    zigbeePatterns: [
        'zigbee', 'Zigbee', 'ZIGBEE',
        'cluster', 'Cluster', 'CLUSTER',
        'endpoint', 'Endpoint', 'ENDPOINT'
    ],
    criticalDrivers: [
        'TS0601_temperature_humidity',
        'TS0004_switch',
        'TS0602_switch',
        'TS0603_switch',
        'TS0604_switch',
        'TS0605_switch',
        '_TZ3000_generic',
        '_TZ3001_generic',
        '_TZ3002_generic'
    ]
};

// Fonction de logging spécialisée
function log(message, level = "INFO", details = null) {
    const timestamp = new Date().toISOString();
    const colors = {
        INFO: '\x1b[36m',    // Cyan
        SUCCESS: '\x1b[32m', // Green
        WARN: '\x1b[33m',    // Yellow
        ERROR: '\x1b[31m',   // Red
        DEBUG: '\x1b[35m',   // Magenta
        TUYA: '\x1b[34m',    // Blue
        ZIGBEE: '\x1b[37m',  // White
        RESET: '\x1b[0m'     // Reset
    };
    
    const color = colors[level] || colors.INFO;
    let logMessage = `${color}[${timestamp}] [${level}] ${message}${colors.RESET}`;
    
    if (details && CONFIG.verbose) {
        logMessage += `\n${colors.DEBUG}   Details: ${JSON.stringify(details, null, 2)}${colors.RESET}`;
    }
    
    console.log(logMessage);

    // Sauvegarder dans le fichier de log
    const logDir = path.dirname(CONFIG.logFile);
    if (!fs.existsSync(logDir)) {
        fs.mkdirSync(logDir, { recursive: true });
    }
    fs.appendFileSync(CONFIG.logFile, `[${timestamp}] [${level}] ${message}\n`);
}

// Fonction pour analyser un driver Tuya/Zigbee
function analyzeDriver(driverPath) {
    log(`🔍 Analyse driver: ${driverPath}`, 'INFO');
    
    try {
        const content = fs.readFileSync(driverPath, 'utf8');
        const driver = JSON.parse(content);
        
        const analysis = {
            path: driverPath,
            id: driver.id || 'unknown',
            name: driver.name || 'unknown',
            class: driver.class || 'unknown',
            capabilities: driver.capabilities || [],
            hasTuyaPattern: false,
            hasZigbeePattern: false,
            isCritical: false,
            issues: [],
            suggestions: []
        };
        
        // Vérifier les patterns Tuya
        for (const pattern of CONFIG.tuyaPatterns) {
            if (content.includes(pattern)) {
                analysis.hasTuyaPattern = true;
                analysis.tuyaPattern = pattern;
                break;
            }
        }
        
        // Vérifier les patterns Zigbee
        for (const pattern of CONFIG.zigbeePatterns) {
            if (content.includes(pattern)) {
                analysis.hasZigbeePattern = true;
                analysis.zigbeePattern = pattern;
                break;
            }
        }
        
        // Vérifier si c'est un driver critique
        for (const critical of CONFIG.criticalDrivers) {
            if (driverPath.includes(critical)) {
                analysis.isCritical = true;
                break;
            }
        }
        
        // Analyser les problèmes potentiels
        if (!driver.capabilities || driver.capabilities.length === 0) {
            analysis.issues.push('Pas de capabilities définies');
            analysis.suggestions.push('Ajouter capabilities: ["onoff"]');
        }
        
        if (!driver.class) {
            analysis.issues.push('Pas de class définie');
            analysis.suggestions.push('Ajouter class: "device"');
        }
        
        if (!driver.pair || driver.pair.length === 0) {
            analysis.issues.push('Pas de configuration pair');
            analysis.suggestions.push('Ajouter configuration pair');
        }
        
        // Log du résultat
        if (analysis.hasTuyaPattern) {
            log(`✅ Driver Tuya détecté: ${analysis.id}`, 'TUYA');
        }
        
        if (analysis.hasZigbeePattern) {
            log(`✅ Driver Zigbee détecté: ${analysis.id}`, 'ZIGBEE');
        }
        
        if (analysis.isCritical) {
            log(`⚠️ Driver critique: ${analysis.id}`, 'WARN');
        }
        
        if (analysis.issues.length > 0) {
            log(`❌ Problèmes détectés: ${analysis.issues.length}`, 'ERROR');
            for (const issue of analysis.issues) {
                log(`   - ${issue}`, 'ERROR');
            }
        }
        
        return analysis;
        
    } catch (error) {
        log(`💥 Erreur analyse ${driverPath}: ${error.message}`, 'ERROR');
        return {
            path: driverPath,
            error: error.message,
            issues: ['Erreur de parsing JSON']
        };
    }
}

// Fonction pour scanner tous les drivers
function scanAllDrivers() {
    log('🔍 === SCAN COMPLET DES DRIVERS TUYA/ZIGBEE ===', 'INFO');
    
    const results = {
        total: 0,
        tuya: 0,
        zigbee: 0,
        critical: 0,
        withIssues: 0,
        analyzed: []
    };
    
    const driversDir = './drivers';
    
    if (!fs.existsSync(driversDir)) {
        log(`❌ Répertoire drivers inexistant: ${driversDir}`, 'ERROR');
        return results;
    }
    
    function scanDirectory(dir) {
        const items = fs.readdirSync(dir);
        
        for (const item of items) {
            const fullPath = path.join(dir, item);
            const stat = fs.statSync(fullPath);
            
            if (stat.isDirectory()) {
                scanDirectory(fullPath);
            } else if (item === 'driver.compose.json') {
                results.total++;
                const analysis = analyzeDriver(fullPath);
                results.analyzed.push(analysis);
                
                if (analysis.hasTuyaPattern) results.tuya++;
                if (analysis.hasZigbeePattern) results.zigbee++;
                if (analysis.isCritical) results.critical++;
                if (analysis.issues && analysis.issues.length > 0) results.withIssues++;
            }
        }
    }
    
    scanDirectory(driversDir);
    
    // Résumé final
    log('📊 === RÉSUMÉ ANALYSE DRIVERS ===', 'INFO');
    log(`📋 Total drivers: ${results.total}`, 'INFO');
    log(`🔵 Drivers Tuya: ${results.tuya}`, 'TUYA');
    log(`⚪ Drivers Zigbee: ${results.zigbee}`, 'ZIGBEE');
    log(`⚠️ Drivers critiques: ${results.critical}`, 'WARN');
    log(`❌ Drivers avec problèmes: ${results.withIssues}`, 'ERROR');
    
    return results;
}

// Fonction pour optimiser un driver
function optimizeDriver(driverPath, analysis) {
    log(`🔧 Optimisation driver: ${driverPath}`, 'INFO');
    
    try {
        const content = fs.readFileSync(driverPath, 'utf8');
        const driver = JSON.parse(content);
        let optimized = false;
        
        // Optimisations Tuya
        if (analysis.hasTuyaPattern) {
            // Ajouter capabilities par défaut pour Tuya
            if (!driver.capabilities || driver.capabilities.length === 0) {
                driver.capabilities = ['onoff'];
                optimized = true;
                log(`✅ Capabilities ajoutées pour Tuya`, 'TUYA');
            }
            
            // Ajouter class par défaut
            if (!driver.class) {
                driver.class = 'device';
                optimized = true;
                log(`✅ Class ajoutée pour Tuya`, 'TUYA');
            }
        }
        
        // Optimisations Zigbee
        if (analysis.hasZigbeePattern) {
            // Ajouter configuration pair par défaut
            if (!driver.pair || driver.pair.length === 0) {
                driver.pair = [
                    {
                        id: "list_devices",
                        template: "list_devices",
                        options: {
                            "add": true
                        }
                    }
                ];
                optimized = true;
                log(`✅ Configuration pair ajoutée pour Zigbee`, 'ZIGBEE');
            }
        }
        
        // Sauvegarder si optimisé
        if (optimized) {
            // Backup
            const backupPath = `${driverPath}.backup.${Date.now()}`;
            fs.writeFileSync(backupPath, content);
            log(`💾 Backup créé: ${backupPath}`, 'INFO');
            
            // Sauvegarder optimisé
            fs.writeFileSync(driverPath, JSON.stringify(driver, null, 2));
            log(`✨ Driver optimisé: ${driverPath}`, 'SUCCESS');
            
            return true;
        } else {
            log(`✅ Driver déjà optimal: ${driverPath}`, 'SUCCESS');
            return false;
        }
        
    } catch (error) {
        log(`💥 Erreur optimisation ${driverPath}: ${error.message}`, 'ERROR');
        return false;
    }
}

// Fonction pour optimiser tous les drivers
function optimizeAllDrivers(analysisResults) {
    log('🔧 === OPTIMISATION DES DRIVERS ===', 'INFO');
    
    const results = {
        optimized: 0,
        errors: 0,
        skipped: 0
    };
    
    for (const analysis of analysisResults.analyzed) {
        if (analysis.error) {
            results.errors++;
            continue;
        }
        
        if (analysis.issues && analysis.issues.length > 0) {
            if (optimizeDriver(analysis.path, analysis)) {
                results.optimized++;
            } else {
                results.skipped++;
            }
        } else {
            results.skipped++;
        }
    }
    
    log('📊 === RÉSUMÉ OPTIMISATION ===', 'INFO');
    log(`✨ Drivers optimisés: ${results.optimized}`, 'SUCCESS');
    log(`⏭️ Drivers ignorés: ${results.skipped}`, 'INFO');
    log(`❌ Erreurs: ${results.errors}`, 'ERROR');
    
    return results;
}

// Fonction principale
function main() {
    log('🚀 === DÉMARRAGE ANALYSE TUYA/ZIGBEE ===', 'INFO');
    log(`Version: ${CONFIG.version}`, 'INFO');
    log(`Mode verbose: ${CONFIG.verbose}`, 'DEBUG');
    
    try {
        // 1. Scanner tous les drivers
        const scanResults = scanAllDrivers();
        
        // 2. Optimiser les drivers avec problèmes
        const optimizationResults = optimizeAllDrivers(scanResults);
        
        // Rapport final
        log('📊 === RAPPORT FINAL TUYA/ZIGBEE ===', 'INFO');
        log(`🔍 Drivers analysés: ${scanResults.total}`, 'INFO');
        log(`🔵 Drivers Tuya: ${scanResults.tuya}`, 'TUYA');
        log(`⚪ Drivers Zigbee: ${scanResults.zigbee}`, 'ZIGBEE');
        log(`✨ Drivers optimisés: ${optimizationResults.optimized}`, 'SUCCESS');
        log(`❌ Erreurs: ${optimizationResults.errors}`, 'ERROR');
        
        if (optimizationResults.errors === 0) {
            log('🎉 Analyse Tuya/Zigbee terminée avec succès !', 'SUCCESS');
            process.exit(0);
        } else {
            log('⚠️ Certaines erreurs lors de l\'optimisation', 'WARN');
            process.exit(1);
        }
        
    } catch (error) {
        log(`💥 Erreur critique: ${error.message}`, 'ERROR');
        process.exit(1);
    }
}

// Exécution si appelé directement
if (require.main === module) {
    main();
}

module.exports = { scanAllDrivers, optimizeAllDrivers, analyzeDriver }; 