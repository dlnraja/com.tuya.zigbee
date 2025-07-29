#!/usr/bin/env node
/**
 * Script de récupération rapide des drivers historiques
 * Version: 1.0.12-20250729-1405
 * Objectif: Récupération rapide des drivers les plus importants
 * Spécificités: Optimisé, moins de commits, focus sur les drivers manquants
 */
const fs = require('fs');
const path = require('path');
const { execSync } = require('child_process');

// Configuration
const CONFIG = {
    version: '1.0.12-20250729-1405',
    driversPath: './drivers',
    backupPath: './backups/quick-recovery',
    logFile: './logs/quick-recovery.log',
    maxCommits: 10, // Limiter à 10 commits pour la rapidité
    sources: [
        'D:/download/fold', // Source locale mentionnée
        './drivers/todo-devices', // Drivers en attente
        './drivers/tuya', // Drivers Tuya actuels
        './drivers/zigbee' // Drivers Zigbee actuels
    ]
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
        CONFIG.driversPath,
        CONFIG.backupPath,
        path.dirname(CONFIG.logFile),
        './drivers/tuya',
        './drivers/zigbee',
        './drivers/todo-devices'
    ];
    
    for (const dir of dirs) {
        if (!fs.existsSync(dir)) {
            fs.mkdirSync(dir, { recursive: true });
            log(`Dossier créé: ${dir}`);
        }
    }
}

// Récupérer les drivers des sources locales
function recoverFromLocalSources() {
    log('=== RÉCUPÉRATION DES SOURCES LOCALES ===');
    
    const results = { found: 0, copied: 0, errors: 0 };
    
    for (const source of CONFIG.sources) {
        if (!fs.existsSync(source)) {
            log(`Source non trouvée: ${source}`, 'WARN');
            continue;
        }
        
        try {
            const items = fs.readdirSync(source, { withFileTypes: true });
            
            for (const item of items) {
                if (item.isDirectory()) {
                    const driverPath = path.join(source, item.name);
                    const targetPath = path.join(CONFIG.driversPath, 'todo-devices', item.name);
                    
                    // Vérifier si c'est un driver valide
                    const composePath = path.join(driverPath, 'driver.compose.json');
                    const devicePath = path.join(driverPath, 'device.js');
                    
                    if (fs.existsSync(composePath) || fs.existsSync(devicePath)) {
                        results.found++;
                        
                        try {
                            // Copier le driver
                            if (!fs.existsSync(targetPath)) {
                                fs.mkdirSync(targetPath, { recursive: true });
                            }
                            
                            // Copier tous les fichiers
                            const files = fs.readdirSync(driverPath);
                            for (const file of files) {
                                const sourceFile = path.join(driverPath, file);
                                const targetFile = path.join(targetPath, file);
                                
                                if (fs.statSync(sourceFile).isFile()) {
                                    fs.copyFileSync(sourceFile, targetFile);
                                }
                            }
                            
                            results.copied++;
                            log(`Driver copié: ${item.name} depuis ${source}`);
                            
                        } catch (error) {
                            log(`Erreur copie ${item.name}: ${error.message}`, 'ERROR');
                            results.errors++;
                        }
                    }
                }
            }
            
        } catch (error) {
            log(`Erreur lecture ${source}: ${error.message}`, 'ERROR');
            results.errors++;
        }
    }
    
    return results;
}

// Récupérer les drivers des commits récents
function recoverFromRecentCommits() {
    log('=== RÉCUPÉRATION DES COMMITS RÉCENTS ===');
    
    const results = { commits: 0, drivers: 0, errors: 0 };
    
    try {
        // Obtenir les commits récents avec des drivers
        const gitLog = execSync('git log --oneline -n 50 --grep="driver" --grep="Driver" --grep="device"', { encoding: 'utf8' });
        const commits = gitLog.split('\n').filter(line => line.match(/^[a-f0-9]{7,8}/));
        
        log(`Commits récents trouvés: ${commits.length}`);
        
        for (const commit of commits.slice(0, CONFIG.maxCommits)) {
            const commitHash = commit.split(' ')[0];
            
            try {
                // Vérifier les fichiers dans ce commit
                const files = execSync(`git show --name-only ${commitHash}`, { encoding: 'utf8' });
                const driverFiles = files.split('\n').filter(file => 
                    file.includes('driver.compose.json') || 
                    file.includes('device.js') ||
                    file.includes('drivers/')
                );
                
                if (driverFiles.length > 0) {
                    results.commits++;
                    
                    // Créer un dossier pour ce commit
                    const commitDir = path.join(CONFIG.backupPath, `commit_${commitHash}`);
                    fs.mkdirSync(commitDir, { recursive: true });
                    
                    // Extraire les fichiers du commit
                    for (const file of driverFiles) {
                        if (file && file.trim()) {
                            try {
                                const content = execSync(`git show ${commitHash}:${file}`, { encoding: 'utf8' });
                                const targetFile = path.join(commitDir, file);
                                const targetDir = path.dirname(targetFile);
                                
                                if (!fs.existsSync(targetDir)) {
                                    fs.mkdirSync(targetDir, { recursive: true });
                                }
                                
                                fs.writeFileSync(targetFile, content);
                                results.drivers++;
                                
                            } catch (error) {
                                // Ignorer les erreurs de fichiers non trouvés
                                log(`Fichier non trouvé dans ${commitHash}: ${file}`, 'WARN');
                            }
                        }
                    }
                    
                    log(`Commit ${commitHash}: ${driverFiles.length} fichiers extraits`);
                }
                
            } catch (error) {
                log(`Erreur commit ${commitHash}: ${error.message}`, 'ERROR');
                results.errors++;
            }
        }
        
    } catch (error) {
        log(`Erreur récupération Git: ${error.message}`, 'ERROR');
        results.errors++;
    }
    
    return results;
}

// Enrichir les drivers avec des caractéristiques manquantes
function enrichDriversQuick() {
    log('=== ENRICHISSEMENT RAPIDE DES DRIVERS ===');
    
    const results = { enriched: 0, errors: 0 };
    
    const tuyaPath = path.join(CONFIG.driversPath, 'tuya');
    const zigbeePath = path.join(CONFIG.driversPath, 'zigbee');
    const todoPath = path.join(CONFIG.driversPath, 'todo-devices');
    
    for (const protocolPath of [tuyaPath, zigbeePath, todoPath]) {
        if (!fs.existsSync(protocolPath)) continue;
        
        const categories = fs.readdirSync(protocolPath, { withFileTypes: true })
            .filter(dirent => dirent.isDirectory())
            .map(dirent => dirent.name);
        
        for (const category of categories) {
            const categoryPath = path.join(protocolPath, category);
            const drivers = fs.readdirSync(categoryPath, { withFileTypes: true })
                .filter(dirent => dirent.isDirectory())
                .map(dirent => dirent.name);
            
            for (const driver of drivers) {
                const driverPath = path.join(categoryPath, driver);
                const composePath = path.join(driverPath, 'driver.compose.json');
                
                if (fs.existsSync(composePath)) {
                    try {
                        const compose = JSON.parse(fs.readFileSync(composePath, 'utf8'));
                        let enriched = false;
                        
                        // Ajouter des capabilities manquantes
                        const driverType = inferDriverType(driver, compose);
                        const suggestedCapabilities = getSuggestedCapabilities(driverType);
                        
                        if (!compose.capabilities) {
                            compose.capabilities = [];
                        }
                        
                        for (const capability of suggestedCapabilities) {
                            if (!compose.capabilities.includes(capability)) {
                                compose.capabilities.push(capability);
                                enriched = true;
                            }
                        }
                        
                        // Ajouter des clusters manquants
                        if (!compose.clusters) {
                            compose.clusters = getSuggestedClusters(driverType);
                            enriched = true;
                        }
                        
                        // Ajouter des métadonnées
                        if (!compose.metadata) {
                            compose.metadata = {
                                enriched: true,
                                enrichmentDate: new Date().toISOString(),
                                originalType: driverType,
                                suggestedCapabilities: suggestedCapabilities
                            };
                            enriched = true;
                        }
                        
                        if (enriched) {
                            fs.writeFileSync(composePath, JSON.stringify(compose, null, 2));
                            results.enriched++;
                            log(`Driver enrichi: ${driver}`);
                        }
                        
                    } catch (error) {
                        log(`Erreur enrichissement ${driver}: ${error.message}`, 'ERROR');
                        results.errors++;
                    }
                }
            }
        }
    }
    
    return results;
}

// Inférer le type de driver
function inferDriverType(driverName, compose) {
    const name = driverName.toLowerCase();
    
    if (name.includes('light') || name.includes('bulb')) return 'light';
    if (name.includes('switch') || name.includes('plug')) return 'switch';
    if (name.includes('sensor') || name.includes('detector')) return 'sensor';
    if (name.includes('curtain') || name.includes('blind')) return 'curtain';
    if (name.includes('fan')) return 'fan';
    if (name.includes('thermostat')) return 'thermostat';
    if (name.includes('motion')) return 'motion';
    if (name.includes('contact')) return 'contact';
    if (name.includes('temperature')) return 'temperature';
    if (name.includes('humidity')) return 'humidity';
    if (name.includes('power') || name.includes('meter')) return 'power';
    
    return 'generic';
}

// Obtenir les capabilities suggérées
function getSuggestedCapabilities(driverType) {
    const capabilities = {
        'light': ['onoff', 'dim', 'light_temperature'],
        'switch': ['onoff', 'measure_power'],
        'sensor': ['measure_temperature', 'measure_humidity'],
        'curtain': ['windowcoverings_state'],
        'fan': ['onoff', 'dim'],
        'thermostat': ['measure_temperature', 'target_temperature'],
        'motion': ['alarm_motion'],
        'contact': ['alarm_contact'],
        'temperature': ['measure_temperature'],
        'humidity': ['measure_humidity'],
        'power': ['measure_power', 'measure_current', 'measure_voltage'],
        'generic': ['onoff']
    };
    
    return capabilities[driverType] || ['onoff'];
}

// Obtenir les clusters suggérés
function getSuggestedClusters(driverType) {
    const clusters = {
        'light': ['genOnOff', 'genLevelCtrl', 'lightingColorCtrl'],
        'switch': ['genOnOff', 'genPowerCfg'],
        'sensor': ['msTemperatureMeasurement', 'msRelativeHumidity'],
        'curtain': ['genWindowCovering'],
        'fan': ['genOnOff', 'genLevelCtrl'],
        'thermostat': ['msTemperatureMeasurement', 'hvacThermostat'],
        'motion': ['ssIasZone'],
        'contact': ['ssIasZone'],
        'temperature': ['msTemperatureMeasurement'],
        'humidity': ['msRelativeHumidity'],
        'power': ['genPowerCfg'],
        'generic': ['genOnOff']
    };
    
    return clusters[driverType] || ['genOnOff'];
}

// Point d'entrée principal
async function recoverQuickHistorical() {
    log('🚀 === RÉCUPÉRATION RAPIDE DES DRIVERS HISTORIQUES ===');
    
    ensureDirectories();
    
    const results = {
        sources: { found: 0, copied: 0, errors: 0 },
        git: { commits: 0, drivers: 0, errors: 0 },
        enrich: { enriched: 0, errors: 0 }
    };
    
    // Étape 1: Récupération depuis les sources locales
    log('📁 ÉTAPE 1: Récupération depuis les sources locales');
    results.sources = recoverFromLocalSources();
    
    // Étape 2: Récupération depuis Git (commits récents)
    log('📚 ÉTAPE 2: Récupération depuis Git (commits récents)');
    results.git = recoverFromRecentCommits();
    
    // Étape 3: Enrichissement rapide
    log('✨ ÉTAPE 3: Enrichissement rapide des drivers');
    results.enrich = enrichDriversQuick();
    
    // Rapport final
    log('=== RAPPORT FINAL ===');
    log(`Sources: ${results.sources.found} trouvés, ${results.sources.copied} copiés, ${results.sources.errors} erreurs`);
    log(`Git: ${results.git.commits} commits, ${results.git.drivers} drivers, ${results.git.errors} erreurs`);
    log(`Enrichissement: ${results.enrich.enriched} enrichis, ${results.enrich.errors} erreurs`);
    
    // Sauvegarder le rapport
    const reportPath = './logs/quick-recovery-report.json';
    fs.writeFileSync(reportPath, JSON.stringify(results, null, 2));
    log(`Rapport sauvegardé: ${reportPath}`);
    
    return results;
}

// Point d'entrée
if (require.main === module) {
    recoverQuickHistorical().catch(error => {
        log(`Erreur fatale: ${error.message}`, 'ERROR');
        process.exit(1);
    });
}

module.exports = {
    recoverQuickHistorical,
    recoverFromLocalSources,
    recoverFromRecentCommits,
    enrichDriversQuick
};