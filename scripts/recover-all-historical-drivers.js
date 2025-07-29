#!/usr/bin/env node
/**
 * Script de récupération de tous les drivers historiques
 * Version: 1.0.12-20250729-1405
 * Objectif: Récupérer tous les drivers des anciennes versions et branches
 * Spécificités: Fusion exhaustive, mode enrichissement, pas de suppression
 */
const fs = require('fs');
const path = require('path');
const { execSync } = require('child_process');

// Configuration
const CONFIG = {
    version: '1.0.12-20250729-1405',
    driversPath: './drivers',
    backupPath: './backups/historical',
    logFile: './logs/recovery.log',
    sources: [
        'D:/download/fold', // Source locale mentionnée
        './drivers', // Répertoire actuel
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

// Récupérer les drivers d'une source
function recoverDriversFromSource(sourcePath, targetPath) {
    if (!fs.existsSync(sourcePath)) {
        log(`Source non trouvée: ${sourcePath}`, 'WARN');
        return { found: 0, copied: 0, errors: 0 };
    }
    
    const results = { found: 0, copied: 0, errors: 0 };
    
    try {
        const items = fs.readdirSync(sourcePath, { withFileTypes: true });
        
        for (const item of items) {
            if (item.isDirectory()) {
                const driverPath = path.join(sourcePath, item.name);
                const targetDriverPath = path.join(targetPath, item.name);
                
                // Vérifier si c'est un driver valide
                const composePath = path.join(driverPath, 'driver.compose.json');
                const devicePath = path.join(driverPath, 'device.js');
                
                if (fs.existsSync(composePath) || fs.existsSync(devicePath)) {
                    results.found++;
                    
                    try {
                        // Copier le driver
                        if (!fs.existsSync(targetDriverPath)) {
                            fs.mkdirSync(targetDriverPath, { recursive: true });
                        }
                        
                        // Copier tous les fichiers du driver
                        const files = fs.readdirSync(driverPath);
                        for (const file of files) {
                            const sourceFile = path.join(driverPath, file);
                            const targetFile = path.join(targetDriverPath, file);
                            
                            if (fs.statSync(sourceFile).isFile()) {
                                fs.copyFileSync(sourceFile, targetFile);
                            }
                        }
                        
                        results.copied++;
                        log(`Driver récupéré: ${item.name} depuis ${sourcePath}`);
                        
                    } catch (error) {
                        log(`Erreur copie ${item.name}: ${error.message}`, 'ERROR');
                        results.errors++;
                    }
                }
            }
        }
        
    } catch (error) {
        log(`Erreur lecture ${sourcePath}: ${error.message}`, 'ERROR');
        results.errors++;
    }
    
    return results;
}

// Récupérer les drivers des commits Git
function recoverDriversFromGit() {
    log('=== RÉCUPÉRATION DES DRIVERS GIT ===');
    
    const results = {
        commits: 0,
        drivers: 0,
        errors: 0
    };
    
    try {
        // Obtenir la liste des commits avec des drivers
        const gitLog = execSync('git log --oneline --name-only --grep="driver" --grep="Driver" --grep="device"', { encoding: 'utf8' });
        const commits = gitLog.split('\n').filter(line => line.match(/^[a-f0-9]{7,8}/));
        
        log(`Commits avec drivers trouvés: ${commits.length}`);
        
        for (const commit of commits.slice(0, 50)) { // Limiter à 50 commits pour éviter la surcharge
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
                    
                    // Créer un dossier temporaire pour ce commit
                    const tempDir = path.join(CONFIG.backupPath, `commit_${commitHash}`);
                    fs.mkdirSync(tempDir, { recursive: true });
                    
                    // Extraire les fichiers du commit
                    for (const file of driverFiles) {
                        if (file && fs.existsSync(file)) {
                            try {
                                const content = execSync(`git show ${commitHash}:${file}`, { encoding: 'utf8' });
                                const targetFile = path.join(tempDir, file);
                                const targetDir = path.dirname(targetFile);
                                
                                if (!fs.existsSync(targetDir)) {
                                    fs.mkdirSync(targetDir, { recursive: true });
                                }
                                
                                fs.writeFileSync(targetFile, content);
                                results.drivers++;
                                
                            } catch (error) {
                                log(`Erreur extraction ${file}: ${error.message}`, 'ERROR');
                                results.errors++;
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

// Fusionner les drivers similaires
function mergeSimilarDrivers() {
    log('=== FUSION DES DRIVERS SIMILAIRES ===');
    
    const results = {
        analyzed: 0,
        merged: 0,
        errors: 0
    };
    
    const tuyaPath = path.join(CONFIG.driversPath, 'tuya');
    const zigbeePath = path.join(CONFIG.driversPath, 'zigbee');
    
    for (const protocolPath of [tuyaPath, zigbeePath]) {
        if (!fs.existsSync(protocolPath)) continue;
        
        const categories = fs.readdirSync(protocolPath, { withFileTypes: true })
            .filter(dirent => dirent.isDirectory())
            .map(dirent => dirent.name);
        
        for (const category of categories) {
            const categoryPath = path.join(protocolPath, category);
            const drivers = fs.readdirSync(categoryPath, { withFileTypes: true })
                .filter(dirent => dirent.isDirectory())
                .map(dirent => dirent.name);
            
            // Grouper les drivers similaires
            const groups = {};
            
            for (const driver of drivers) {
                const driverName = driver.toLowerCase();
                const key = driverName.replace(/[_-]/g, '').replace(/tuya|zigbee/g, '');
                
                if (!groups[key]) {
                    groups[key] = [];
                }
                groups[key].push(driver);
            }
            
            // Fusionner les groupes avec plus d'un driver
            for (const [key, driverGroup] of Object.entries(groups)) {
                if (driverGroup.length > 1) {
                    results.analyzed++;
                    
                    try {
                        // Sélectionner le driver principal (le plus complet)
                        const mainDriver = selectMainDriver(driverGroup, categoryPath);
                        const otherDrivers = driverGroup.filter(d => d !== mainDriver);
                        
                        // Fusionner les capabilities et clusters
                        const mergedDriver = mergeDriverCapabilities(mainDriver, otherDrivers, categoryPath);
                        
                        // Sauvegarder le driver fusionné
                        const mainDriverPath = path.join(categoryPath, mainDriver);
                        saveMergedDriver(mergedDriver, mainDriverPath);
                        
                        // Archiver les autres drivers
                        for (const otherDriver of otherDrivers) {
                            const otherDriverPath = path.join(categoryPath, otherDriver);
                            const archivePath = path.join(CONFIG.backupPath, 'merged', otherDriver);
                            
                            if (!fs.existsSync(path.dirname(archivePath))) {
                                fs.mkdirSync(path.dirname(archivePath), { recursive: true });
                            }
                            
                            fs.renameSync(otherDriverPath, archivePath);
                        }
                        
                        results.merged++;
                        log(`Drivers fusionnés: ${driverGroup.join(', ')} -> ${mainDriver}`);
                        
                    } catch (error) {
                        log(`Erreur fusion ${driverGroup.join(', ')}: ${error.message}`, 'ERROR');
                        results.errors++;
                    }
                }
            }
        }
    }
    
    return results;
}

// Sélectionner le driver principal
function selectMainDriver(drivers, categoryPath) {
    let bestDriver = drivers[0];
    let bestScore = 0;
    
    for (const driver of drivers) {
        const driverPath = path.join(categoryPath, driver);
        const composePath = path.join(driverPath, 'driver.compose.json');
        const devicePath = path.join(driverPath, 'device.js');
        
        let score = 0;
        
        // Score basé sur les fichiers présents
        if (fs.existsSync(composePath)) score += 10;
        if (fs.existsSync(devicePath)) score += 10;
        
        // Score basé sur le contenu
        if (fs.existsSync(composePath)) {
            try {
                const compose = JSON.parse(fs.readFileSync(composePath, 'utf8'));
                score += (compose.capabilities || []).length * 2;
                score += (compose.clusters || []).length * 2;
                if (compose.images) score += 5;
                if (compose.flowCards) score += 5;
            } catch (error) {
                // Ignorer les erreurs JSON
            }
        }
        
        if (score > bestScore) {
            bestScore = score;
            bestDriver = driver;
        }
    }
    
    return bestDriver;
}

// Fusionner les capabilities des drivers
function mergeDriverCapabilities(mainDriver, otherDrivers, categoryPath) {
    const mainDriverPath = path.join(categoryPath, mainDriver);
    const composePath = path.join(mainDriverPath, 'driver.compose.json');
    
    if (!fs.existsSync(composePath)) {
        return null;
    }
    
    try {
        const mainCompose = JSON.parse(fs.readFileSync(composePath, 'utf8'));
        const mergedCapabilities = new Set(mainCompose.capabilities || []);
        const mergedClusters = new Set(mainCompose.clusters || []);
        
        // Fusionner avec les autres drivers
        for (const otherDriver of otherDrivers) {
            const otherDriverPath = path.join(categoryPath, otherDriver);
            const otherComposePath = path.join(otherDriverPath, 'driver.compose.json');
            
            if (fs.existsSync(otherComposePath)) {
                try {
                    const otherCompose = JSON.parse(fs.readFileSync(otherComposePath, 'utf8'));
                    
                    // Ajouter les capabilities
                    if (otherCompose.capabilities) {
                        otherCompose.capabilities.forEach(cap => mergedCapabilities.add(cap));
                    }
                    
                    // Ajouter les clusters
                    if (otherCompose.clusters) {
                        otherCompose.clusters.forEach(cluster => mergedClusters.add(cluster));
                    }
                    
                } catch (error) {
                    log(`Erreur lecture ${otherDriver}: ${error.message}`, 'ERROR');
                }
            }
        }
        
        // Mettre à jour le driver principal
        mainCompose.capabilities = Array.from(mergedCapabilities);
        mainCompose.clusters = Array.from(mergedClusters);
        mainCompose.mergedFrom = otherDrivers;
        mainCompose.mergeDate = new Date().toISOString();
        
        return mainCompose;
        
    } catch (error) {
        log(`Erreur fusion capabilities: ${error.message}`, 'ERROR');
        return null;
    }
}

// Sauvegarder le driver fusionné
function saveMergedDriver(mergedCompose, driverPath) {
    if (!mergedCompose) return;
    
    const composePath = path.join(driverPath, 'driver.compose.json');
    
    try {
        fs.writeFileSync(composePath, JSON.stringify(mergedCompose, null, 2));
        log(`Driver fusionné sauvegardé: ${driverPath}`);
    } catch (error) {
        log(`Erreur sauvegarde driver fusionné: ${error.message}`, 'ERROR');
    }
}

// Enrichir les drivers avec des caractéristiques manquantes
function enrichDrivers() {
    log('=== ENRICHISSEMENT DES DRIVERS ===');
    
    const results = {
        enriched: 0,
        errors: 0
    };
    
    const tuyaPath = path.join(CONFIG.driversPath, 'tuya');
    const zigbeePath = path.join(CONFIG.driversPath, 'zigbee');
    
    for (const protocolPath of [tuyaPath, zigbeePath]) {
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
                        
                        // Ajouter des capabilities manquantes basées sur le type
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
async function recoverAllHistoricalDrivers() {
    log('🚀 === RÉCUPÉRATION COMPLÈTE DES DRIVERS HISTORIQUES ===');
    
    ensureDirectories();
    
    const results = {
        sources: { found: 0, copied: 0, errors: 0 },
        git: { commits: 0, drivers: 0, errors: 0 },
        merge: { analyzed: 0, merged: 0, errors: 0 },
        enrich: { enriched: 0, errors: 0 }
    };
    
    // Étape 1: Récupération depuis les sources locales
    log('📁 ÉTAPE 1: Récupération depuis les sources locales');
    for (const source of CONFIG.sources) {
        if (fs.existsSync(source)) {
            const sourceResults = recoverDriversFromSource(source, CONFIG.driversPath);
            results.sources.found += sourceResults.found;
            results.sources.copied += sourceResults.copied;
            results.sources.errors += sourceResults.errors;
        }
    }
    
    // Étape 2: Récupération depuis Git
    log('📚 ÉTAPE 2: Récupération depuis Git');
    const gitResults = recoverDriversFromGit();
    results.git = gitResults;
    
    // Étape 3: Fusion des drivers similaires
    log('🔗 ÉTAPE 3: Fusion des drivers similaires');
    const mergeResults = mergeSimilarDrivers();
    results.merge = mergeResults;
    
    // Étape 4: Enrichissement des drivers
    log('✨ ÉTAPE 4: Enrichissement des drivers');
    const enrichResults = enrichDrivers();
    results.enrich = enrichResults;
    
    // Rapport final
    log('=== RAPPORT FINAL ===');
    log(`Sources: ${results.sources.found} trouvés, ${results.sources.copied} copiés, ${results.sources.errors} erreurs`);
    log(`Git: ${results.git.commits} commits, ${results.git.drivers} drivers, ${results.git.errors} erreurs`);
    log(`Fusion: ${results.merge.analyzed} analysés, ${results.merge.merged} fusionnés, ${results.merge.errors} erreurs`);
    log(`Enrichissement: ${results.enrich.enriched} enrichis, ${results.enrich.errors} erreurs`);
    
    // Sauvegarder le rapport
    const reportPath = './logs/historical-recovery-report.json';
    fs.writeFileSync(reportPath, JSON.stringify(results, null, 2));
    log(`Rapport sauvegardé: ${reportPath}`);
    
    return results;
}

// Point d'entrée
if (require.main === module) {
    recoverAllHistoricalDrivers().catch(error => {
        log(`Erreur fatale: ${error.message}`, 'ERROR');
        process.exit(1);
    });
}

module.exports = {
    recoverAllHistoricalDrivers,
    recoverDriversFromSource,
    recoverDriversFromGit,
    mergeSimilarDrivers,
    enrichDrivers
};