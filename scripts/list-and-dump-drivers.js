#!/usr/bin/env node
/**
 * Script de listing et dump ciblé des drivers
 * Version: 1.0.12-20250729-1405
 * Objectif: Lister tous les drivers et faire un dump ciblé
 * Spécificités: Rapide, efficace, focus sur les drivers manquants
 */
const fs = require('fs');
const path = require('path');
const { execSync } = require('child_process');

// Configuration
const CONFIG = {
    version: '1.0.12-20250729-1405',
    driversPath: './drivers',
    backupPath: './backups/targeted-dump',
    logFile: './logs/list-and-dump.log'
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

// Lister tous les drivers actuels
function listCurrentDrivers() {
    log('=== LISTING DES DRIVERS ACTUELS ===');
    
    const drivers = {
        tuya: { total: 0, byCategory: {} },
        zigbee: { total: 0, byCategory: {} },
        todo: { total: 0, items: [] },
        total: 0
    };
    
    // Lister les drivers Tuya
    const tuyaPath = path.join(CONFIG.driversPath, 'tuya');
    if (fs.existsSync(tuyaPath)) {
        const categories = fs.readdirSync(tuyaPath, { withFileTypes: true })
            .filter(dirent => dirent.isDirectory())
            .map(dirent => dirent.name);
        
        for (const category of categories) {
            const categoryPath = path.join(tuyaPath, category);
            const driverList = fs.readdirSync(categoryPath, { withFileTypes: true })
                .filter(dirent => dirent.isDirectory())
                .map(dirent => dirent.name);
            
            drivers.tuya.byCategory[category] = driverList;
            drivers.tuya.total += driverList.length;
            drivers.total += driverList.length;
            
            log(`Tuya ${category}: ${driverList.length} drivers`);
        }
    }
    
    // Lister les drivers Zigbee
    const zigbeePath = path.join(CONFIG.driversPath, 'zigbee');
    if (fs.existsSync(zigbeePath)) {
        const categories = fs.readdirSync(zigbeePath, { withFileTypes: true })
            .filter(dirent => dirent.isDirectory())
            .map(dirent => dirent.name);
        
        for (const category of categories) {
            const categoryPath = path.join(zigbeePath, category);
            const driverList = fs.readdirSync(categoryPath, { withFileTypes: true })
                .filter(dirent => dirent.isDirectory())
                .map(dirent => dirent.name);
            
            drivers.zigbee.byCategory[category] = driverList;
            drivers.zigbee.total += driverList.length;
            drivers.total += driverList.length;
            
            log(`Zigbee ${category}: ${driverList.length} drivers`);
        }
    }
    
    // Lister les drivers en attente
    const todoPath = path.join(CONFIG.driversPath, 'todo-devices');
    if (fs.existsSync(todoPath)) {
        const todoList = fs.readdirSync(todoPath, { withFileTypes: true })
            .filter(dirent => dirent.isDirectory())
            .map(dirent => dirent.name);
        
        drivers.todo.items = todoList;
        drivers.todo.total = todoList.length;
        drivers.total += todoList.length;
        
        log(`Todo devices: ${todoList.length} drivers`);
    }
    
    return drivers;
}

// Dump ciblé des anciennes versions
function targetedDump() {
    log('=== DUMP CIBLÉ DES ANCIENNES VERSIONS ===');
    
    const results = {
        commits: 0,
        drivers: 0,
        errors: 0
    };
    
    try {
        // Obtenir les commits récents avec des drivers
        const gitLog = execSync('git log --oneline -n 20 --grep="driver" --grep="Driver" --grep="device"', { encoding: 'utf8' });
        const commits = gitLog.split('\n').filter(line => line.match(/^[a-f0-9]{7,8}/));
        
        log(`Commits ciblés trouvés: ${commits.length}`);
        
        for (const commit of commits.slice(0, 5)) { // Limiter à 5 commits pour rapidité
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
        log(`Erreur dump ciblé: ${error.message}`, 'ERROR');
        results.errors++;
    }
    
    return results;
}

// Organiser les drivers par catégorie
function organizeDrivers() {
    log('=== ORGANISATION DES DRIVERS ===');
    
    const results = { organized: 0, errors: 0 };
    
    const dumpDir = CONFIG.backupPath;
    
    try {
        const items = fs.readdirSync(dumpDir, { withFileTypes: true });
        
        for (const item of items) {
            if (item.isDirectory()) {
                const sourceDir = path.join(dumpDir, item.name);
                organizeDriversFromSource(sourceDir, results);
            }
        }
        
    } catch (error) {
        log(`Erreur organisation: ${error.message}`, 'ERROR');
        results.errors++;
    }
    
    return results;
}

// Organiser les drivers d'une source
function organizeDriversFromSource(sourceDir, results) {
    try {
        const items = fs.readdirSync(sourceDir, { withFileTypes: true });
        
        for (const item of items) {
            if (item.isDirectory()) {
                const driverPath = path.join(sourceDir, item.name);
                const composePath = path.join(driverPath, 'driver.compose.json');
                const devicePath = path.join(driverPath, 'device.js');
                
                if (fs.existsSync(composePath) || fs.existsSync(devicePath)) {
                    try {
                        // Déterminer le protocole et la catégorie
                        const { protocol, category } = determineDriverCategory(item.name, driverPath);
                        
                        // Créer le dossier de destination
                        const targetDir = path.join(CONFIG.driversPath, protocol, category, item.name);
                        
                        if (!fs.existsSync(targetDir)) {
                            fs.mkdirSync(targetDir, { recursive: true });
                        }
                        
                        // Copier le driver
                        const files = fs.readdirSync(driverPath);
                        for (const file of files) {
                            const sourceFile = path.join(driverPath, file);
                            const targetFile = path.join(targetDir, file);
                            
                            if (fs.statSync(sourceFile).isFile()) {
                                fs.copyFileSync(sourceFile, targetFile);
                            }
                        }
                        
                        results.organized++;
                        log(`Driver organisé: ${item.name} -> ${protocol}/${category}`);
                        
                    } catch (error) {
                        log(`Erreur organisation ${item.name}: ${error.message}`, 'ERROR');
                        results.errors++;
                    }
                }
            }
        }
        
    } catch (error) {
        log(`Erreur lecture source ${sourceDir}: ${error.message}`, 'ERROR');
        results.errors++;
    }
}

// Déterminer la catégorie d'un driver
function determineDriverCategory(driverName, driverPath) {
    const name = driverName.toLowerCase();
    
    // Déterminer le protocole
    let protocol = 'zigbee';
    if (name.includes('tuya') || driverPath.includes('tuya')) {
        protocol = 'tuya';
    }
    
    // Déterminer la catégorie
    let category = 'unknown';
    
    if (name.includes('light') || name.includes('bulb') || name.includes('lamp')) {
        category = 'controllers';
    } else if (name.includes('switch') || name.includes('plug') || name.includes('outlet')) {
        category = 'controllers';
    } else if (name.includes('sensor') || name.includes('detector')) {
        category = 'sensors';
    } else if (name.includes('motion') || name.includes('presence')) {
        category = 'sensors';
    } else if (name.includes('contact') || name.includes('door') || name.includes('window')) {
        category = 'security';
    } else if (name.includes('lock') || name.includes('alarm')) {
        category = 'security';
    } else if (name.includes('thermostat') || name.includes('hvac') || name.includes('climate')) {
        category = 'climate';
    } else if (name.includes('curtain') || name.includes('blind') || name.includes('shade')) {
        category = 'automation';
    } else if (name.includes('fan') || name.includes('ventilation')) {
        category = 'automation';
    } else if (name.includes('gateway') || name.includes('bridge')) {
        category = 'controllers';
    } else if (name.includes('remote') || name.includes('button')) {
        category = 'controllers';
    } else if (name.includes('temperature') || name.includes('humidity')) {
        category = 'sensors';
    } else if (name.includes('power') || name.includes('meter')) {
        category = 'sensors';
    } else {
        category = 'generic';
    }
    
    return { protocol, category };
}

// Créer un rapport détaillé
function createDetailedReport(currentDrivers, dumpResults, organizeResults) {
    log('=== CRÉATION DU RAPPORT DÉTAILLÉ ===');
    
    const report = {
        timestamp: new Date().toISOString(),
        version: CONFIG.version,
        currentDrivers: currentDrivers,
        dumpResults: dumpResults,
        organizeResults: organizeResults,
        summary: {
            totalCurrentDrivers: currentDrivers.total,
            totalDumpedDrivers: dumpResults.drivers,
            totalOrganizedDrivers: organizeResults.organized,
            target: 4464, // Objectif mentionné
            gap: 4464 - currentDrivers.total
        }
    };
    
    const reportPath = './logs/detailed-drivers-report.json';
    fs.writeFileSync(reportPath, JSON.stringify(report, null, 2));
    log(`Rapport détaillé créé: ${reportPath}`);
    
    // Afficher le résumé
    log('=== RÉSUMÉ DÉTAILLÉ ===');
    log(`Drivers actuels: ${currentDrivers.total}`);
    log(`Drivers Tuya: ${currentDrivers.tuya.total}`);
    log(`Drivers Zigbee: ${currentDrivers.zigbee.total}`);
    log(`Todo devices: ${currentDrivers.todo.total}`);
    log(`Drivers dumpés: ${dumpResults.drivers}`);
    log(`Drivers organisés: ${organizeResults.organized}`);
    log(`Objectif: 4464 drivers`);
    log(`Gap: ${4464 - currentDrivers.total} drivers manquants`);
    
    return report;
}

// Point d'entrée principal
async function listAndDumpDrivers() {
    log('🚀 === LISTING ET DUMP CIBLÉ DES DRIVERS ===');
    
    // Créer les dossiers nécessaires
    const logDir = path.dirname(CONFIG.logFile);
    if (!fs.existsSync(logDir)) {
        fs.mkdirSync(logDir, { recursive: true });
    }
    
    // Étape 1: Lister les drivers actuels
    log('📋 ÉTAPE 1: Listing des drivers actuels');
    const currentDrivers = listCurrentDrivers();
    
    // Étape 2: Dump ciblé
    log('📚 ÉTAPE 2: Dump ciblé des anciennes versions');
    const dumpResults = targetedDump();
    
    // Étape 3: Organisation
    log('🔧 ÉTAPE 3: Organisation des drivers');
    const organizeResults = organizeDrivers();
    
    // Étape 4: Rapport détaillé
    log('📊 ÉTAPE 4: Création du rapport détaillé');
    const report = createDetailedReport(currentDrivers, dumpResults, organizeResults);
    
    // Rapport final
    log('=== RAPPORT FINAL ===');
    log(`Drivers actuels: ${currentDrivers.total}`);
    log(`Drivers dumpés: ${dumpResults.drivers}`);
    log(`Drivers organisés: ${organizeResults.organized}`);
    log(`Gap vers 4464: ${4464 - currentDrivers.total} drivers manquants`);
    
    return report;
}

// Point d'entrée
if (require.main === module) {
    listAndDumpDrivers().catch(error => {
        log(`Erreur fatale: ${error.message}`, 'ERROR');
        process.exit(1);
    });
}

module.exports = {
    listAndDumpDrivers,
    listCurrentDrivers,
    targetedDump,
    organizeDrivers,
    createDetailedReport
};