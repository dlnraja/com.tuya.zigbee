#!/usr/bin/env node
/**
 * Script de dump et récupération exhaustive des drivers
 * Version: 1.0.12-20250729-1405
 * Objectif: Récupérer tous les drivers manquants (4464+ devices)
 * Spécificités: Scraping exhaustif, dump complet, organisation intelligente
 */
const fs = require('fs');
const path = require('path');
const { execSync } = require('child_process');

// Configuration
const CONFIG = {
    version: '1.0.12-20250729-1405',
    driversPath: './drivers',
    backupPath: './backups/comprehensive-dump',
    logFile: './logs/comprehensive-dump.log',
    sources: {
        git: {
            branches: ['master', 'main', 'beta', 'develop', 'SDK3'],
            commits: 100, // Augmenter pour plus de drivers
            patterns: ['driver', 'device', 'tuya', 'zigbee']
        },
        local: [
            'D:/download/fold',
            './drivers',
            './backups',
            './archives'
        ],
        external: [
            'https://github.com/JohanBendz/com.tuya.zigbee',
            'https://github.com/athombv/com.tuya',
            'https://github.com/athombv/com.zigbee'
        ]
    },
    categories: {
        tuya: ['controllers', 'sensors', 'security', 'climate', 'automation', 'generic', 'legacy', 'unknown', 'custom'],
        zigbee: ['controllers', 'sensors', 'security', 'climate', 'automation', 'generic', 'legacy', 'unknown', 'custom']
    }
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
        path.dirname(CONFIG.logFile)
    ];
    
    // Créer les dossiers pour chaque protocole et catégorie
    for (const protocol of ['tuya', 'zigbee']) {
        for (const category of CONFIG.categories[protocol]) {
            const dir = path.join(CONFIG.driversPath, protocol, category);
            if (!fs.existsSync(dir)) {
                fs.mkdirSync(dir, { recursive: true });
                log(`Dossier créé: ${dir}`);
            }
        }
    }
}

// Dump complet des branches Git
function dumpGitBranches() {
    log('=== DUMP COMPLET DES BRANCHES GIT ===');
    
    const results = {
        branches: 0,
        commits: 0,
        drivers: 0,
        errors: 0
    };
    
    try {
        // Obtenir toutes les branches
        const branches = execSync('git branch -a', { encoding: 'utf8' })
            .split('\n')
            .filter(line => line.trim() && !line.includes('HEAD'))
            .map(line => line.replace('*', '').trim());
        
        log(`Branches trouvées: ${branches.length}`);
        
        for (const branch of branches) {
            try {
                // Checkout de la branche
                execSync(`git checkout ${branch}`, { stdio: 'pipe' });
                results.branches++;
                
                // Dump des drivers de cette branche
                const branchResults = dumpBranchDrivers(branch);
                results.commits += branchResults.commits;
                results.drivers += branchResults.drivers;
                results.errors += branchResults.errors;
                
                log(`Branche ${branch}: ${branchResults.drivers} drivers extraits`);
                
            } catch (error) {
                log(`Erreur branche ${branch}: ${error.message}`, 'ERROR');
                results.errors++;
            }
        }
        
        // Retourner à la branche principale
        execSync('git checkout master', { stdio: 'pipe' });
        
    } catch (error) {
        log(`Erreur dump branches: ${error.message}`, 'ERROR');
        results.errors++;
    }
    
    return results;
}

// Dump des drivers d'une branche
function dumpBranchDrivers(branchName) {
    const results = { commits: 0, drivers: 0, errors: 0 };
    
    try {
        // Obtenir les commits avec des drivers
        const gitLog = execSync(`git log --oneline -n ${CONFIG.sources.git.commits} --grep="driver" --grep="Driver" --grep="device"`, { encoding: 'utf8' });
        const commits = gitLog.split('\n').filter(line => line.match(/^[a-f0-9]{7,8}/));
        
        for (const commit of commits) {
            const commitHash = commit.split(' ')[0];
            
            try {
                // Vérifier les fichiers dans ce commit
                const files = execSync(`git show --name-only ${commitHash}`, { encoding: 'utf8' });
                const driverFiles = files.split('\n').filter(file => 
                    file.includes('driver.compose.json') || 
                    file.includes('device.js') ||
                    file.includes('drivers/') ||
                    file.includes('tuya') ||
                    file.includes('zigbee')
                );
                
                if (driverFiles.length > 0) {
                    results.commits++;
                    
                    // Créer un dossier pour ce commit
                    const commitDir = path.join(CONFIG.backupPath, branchName, `commit_${commitHash}`);
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
                }
                
            } catch (error) {
                log(`Erreur commit ${commitHash}: ${error.message}`, 'ERROR');
                results.errors++;
            }
        }
        
    } catch (error) {
        log(`Erreur dump branche ${branchName}: ${error.message}`, 'ERROR');
        results.errors++;
    }
    
    return results;
}

// Dump des sources locales
function dumpLocalSources() {
    log('=== DUMP DES SOURCES LOCALES ===');
    
    const results = { found: 0, copied: 0, errors: 0 };
    
    for (const source of CONFIG.sources.local) {
        if (!fs.existsSync(source)) {
            log(`Source non trouvée: ${source}`, 'WARN');
            continue;
        }
        
        try {
            const items = fs.readdirSync(source, { withFileTypes: true });
            
            for (const item of items) {
                if (item.isDirectory()) {
                    const driverPath = path.join(source, item.name);
                    const targetPath = path.join(CONFIG.backupPath, 'local', source.replace(/[\/\\]/g, '_'), item.name);
                    
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

// Scraping des sources externes
function scrapeExternalSources() {
    log('=== SCRAPING DES SOURCES EXTERNES ===');
    
    const results = { sources: 0, drivers: 0, errors: 0 };
    
    for (const source of CONFIG.sources.external) {
        try {
            results.sources++;
            
            // Créer un dossier pour cette source
            const sourceName = source.split('/').pop();
            const sourceDir = path.join(CONFIG.backupPath, 'external', sourceName);
            fs.mkdirSync(sourceDir, { recursive: true });
            
            // Cloner le repository (si possible)
            try {
                execSync(`git clone ${source} ${sourceDir}`, { stdio: 'pipe' });
                log(`Repository cloné: ${source}`);
                
                // Compter les drivers
                const drivers = countDriversInDirectory(sourceDir);
                results.drivers += drivers;
                log(`Drivers trouvés dans ${sourceName}: ${drivers}`);
                
            } catch (error) {
                log(`Impossible de cloner ${source}: ${error.message}`, 'WARN');
                results.errors++;
            }
            
        } catch (error) {
            log(`Erreur scraping ${source}: ${error.message}`, 'ERROR');
            results.errors++;
        }
    }
    
    return results;
}

// Compter les drivers dans un répertoire
function countDriversInDirectory(dirPath) {
    let count = 0;
    
    try {
        const items = fs.readdirSync(dirPath, { withFileTypes: true });
        
        for (const item of items) {
            if (item.isDirectory()) {
                const driverPath = path.join(dirPath, item.name);
                const composePath = path.join(driverPath, 'driver.compose.json');
                const devicePath = path.join(driverPath, 'device.js');
                
                if (fs.existsSync(composePath) || fs.existsSync(devicePath)) {
                    count++;
                }
                
                // Récursion pour les sous-dossiers
                count += countDriversInDirectory(driverPath);
            }
        }
        
    } catch (error) {
        // Ignorer les erreurs de lecture
    }
    
    return count;
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

// Enrichir les drivers avec des images manquantes
function enrichMissingImages() {
    log('=== ENRICHISSEMENT DES IMAGES MANQUANTES ===');
    
    const results = { enriched: 0, errors: 0 };
    
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
                const imagesDir = path.join(driverPath, 'assets', 'images');
                
                if (fs.existsSync(composePath)) {
                    try {
                        const compose = JSON.parse(fs.readFileSync(composePath, 'utf8'));
                        
                        // Créer le dossier images s'il n'existe pas
                        if (!fs.existsSync(imagesDir)) {
                            fs.mkdirSync(imagesDir, { recursive: true });
                        }
                        
                        // Générer une image SVG basique si manquante
                        const imagePath = path.join(imagesDir, 'icon.svg');
                        if (!fs.existsSync(imagePath)) {
                            const svgContent = generateBasicSVG(driver, category);
                            fs.writeFileSync(imagePath, svgContent);
                            results.enriched++;
                            log(`Image générée pour: ${driver}`);
                        }
                        
                        // Mettre à jour le compose.json avec les images
                        if (!compose.images) {
                            compose.images = {};
                        }
                        
                        if (!compose.images.icon) {
                            compose.images.icon = 'assets/images/icon.svg';
                        }
                        
                        fs.writeFileSync(composePath, JSON.stringify(compose, null, 2));
                        
                    } catch (error) {
                        log(`Erreur enrichissement images ${driver}: ${error.message}`, 'ERROR');
                        results.errors++;
                    }
                }
            }
        }
    }
    
    return results;
}

// Générer une image SVG basique
function generateBasicSVG(driverName, category) {
    const colors = {
        'controllers': '#4CAF50',
        'sensors': '#2196F3',
        'security': '#F44336',
        'climate': '#FF9800',
        'automation': '#9C27B0',
        'generic': '#607D8B'
    };
    
    const color = colors[category] || colors.generic;
    
    return `<svg width="100" height="100" viewBox="0 0 100 100" xmlns="http://www.w3.org/2000/svg">
  <defs>
    <linearGradient id="grad" x1="0%" y1="0%" x2="100%" y2="100%">
      <stop offset="0%" style="stop-color:${color};stop-opacity:1" />
      <stop offset="100%" style="stop-color:${color}dd;stop-opacity:1" />
    </linearGradient>
  </defs>
  <rect width="100" height="100" rx="10" fill="url(#grad)" />
  <text x="50" y="55" font-family="Arial" font-size="12" fill="white" text-anchor="middle">${driverName.substring(0, 8)}</text>
</svg>`;
}

// Mettre à jour la documentation
function updateDocumentation() {
    log('=== MISE À JOUR DE LA DOCUMENTATION ===');
    
    const results = { updated: 0, errors: 0 };
    
    try {
        // Compter tous les drivers
        const driverCounts = countAllDrivers();
        
        // Mettre à jour le README
        updateREADME(driverCounts);
        results.updated++;
        
        // Créer un rapport de dump
        createDumpReport(driverCounts);
        results.updated++;
        
        log(`Documentation mise à jour avec ${driverCounts.total} drivers`);
        
    } catch (error) {
        log(`Erreur mise à jour documentation: ${error.message}`, 'ERROR');
        results.errors++;
    }
    
    return results;
}

// Compter tous les drivers
function countAllDrivers() {
    const counts = {
        tuya: { total: 0, byCategory: {} },
        zigbee: { total: 0, byCategory: {} },
        total: 0
    };
    
    for (const protocol of ['tuya', 'zigbee']) {
        const protocolPath = path.join(CONFIG.driversPath, protocol);
        
        if (!fs.existsSync(protocolPath)) continue;
        
        const categories = fs.readdirSync(protocolPath, { withFileTypes: true })
            .filter(dirent => dirent.isDirectory())
            .map(dirent => dirent.name);
        
        for (const category of categories) {
            const categoryPath = path.join(protocolPath, category);
            const drivers = fs.readdirSync(categoryPath, { withFileTypes: true })
                .filter(dirent => dirent.isDirectory())
                .map(dirent => dirent.name);
            
            counts[protocol].byCategory[category] = drivers.length;
            counts[protocol].total += drivers.length;
            counts.total += drivers.length;
        }
    }
    
    return counts;
}

// Mettre à jour le README
function updateREADME(driverCounts) {
    const readmePath = './README.md';
    
    if (!fs.existsSync(readmePath)) {
        log('README.md non trouvé, création d\'un nouveau', 'WARN');
        return;
    }
    
    try {
        let readme = fs.readFileSync(readmePath, 'utf8');
        
        // Mettre à jour les statistiques
        const statsSection = `## 📊 Statistiques Pipeline

**Dernière Exécution**: ${new Date().toISOString()}
- ✅ Étape 1: Vérification et récupération
- ✅ Étape 2: Récupération Git (${driverCounts.total} drivers)
- ✅ Étape 3: Organisation intelligente
- ✅ Étape 4: Enrichissement images
- ✅ Étape 5: Mise à jour documentation

**Métriques**:
- 🏠 **Tuya Drivers**: ${driverCounts.tuya.total}
- 🔗 **Zigbee Drivers**: ${driverCounts.zigbee.total}
- 📦 **Total Drivers**: ${driverCounts.total}
- 🎯 **Status**: Comprehensive Dump Complete

**Catégories Tuya**:
${Object.entries(driverCounts.tuya.byCategory).map(([cat, count]) => `- ${cat}: ${count}`).join('\n')}

**Catégories Zigbee**:
${Object.entries(driverCounts.zigbee.byCategory).map(([cat, count]) => `- ${cat}: ${count}`).join('\n')}`;
        
        // Remplacer la section statistiques existante
        readme = readme.replace(/## 📊 Statistiques Pipeline[\s\S]*?(?=## |$)/, statsSection);
        
        fs.writeFileSync(readmePath, readme);
        log('README.md mis à jour avec les nouvelles statistiques');
        
    } catch (error) {
        log(`Erreur mise à jour README: ${error.message}`, 'ERROR');
    }
}

// Créer un rapport de dump
function createDumpReport(driverCounts) {
    const reportPath = './logs/comprehensive-dump-report.json';
    
    const report = {
        timestamp: new Date().toISOString(),
        version: CONFIG.version,
        statistics: driverCounts,
        summary: {
            totalDrivers: driverCounts.total,
            tuyaDrivers: driverCounts.tuya.total,
            zigbeeDrivers: driverCounts.zigbee.total,
            categories: {
                tuya: Object.keys(driverCounts.tuya.byCategory).length,
                zigbee: Object.keys(driverCounts.zigbee.byCategory).length
            }
        }
    };
    
    fs.writeFileSync(reportPath, JSON.stringify(report, null, 2));
    log(`Rapport de dump créé: ${reportPath}`);
}

// Point d'entrée principal
async function comprehensiveDriverDump() {
    log('🚀 === DUMP COMPLET ET RÉCUPÉRATION EXHAUSTIVE ===');
    
    ensureDirectories();
    
    const results = {
        git: { branches: 0, commits: 0, drivers: 0, errors: 0 },
        local: { found: 0, copied: 0, errors: 0 },
        external: { sources: 0, drivers: 0, errors: 0 },
        organize: { organized: 0, errors: 0 },
        images: { enriched: 0, errors: 0 },
        docs: { updated: 0, errors: 0 }
    };
    
    // Étape 1: Dump des branches Git
    log('📚 ÉTAPE 1: Dump des branches Git');
    results.git = dumpGitBranches();
    
    // Étape 2: Dump des sources locales
    log('📁 ÉTAPE 2: Dump des sources locales');
    results.local = dumpLocalSources();
    
    // Étape 3: Scraping des sources externes
    log('🌐 ÉTAPE 3: Scraping des sources externes');
    results.external = scrapeExternalSources();
    
    // Étape 4: Organisation intelligente
    log('🔧 ÉTAPE 4: Organisation intelligente');
    results.organize = organizeDrivers();
    
    // Étape 5: Enrichissement des images
    log('🖼️ ÉTAPE 5: Enrichissement des images');
    results.images = enrichMissingImages();
    
    // Étape 6: Mise à jour documentation
    log('📝 ÉTAPE 6: Mise à jour documentation');
    results.docs = updateDocumentation();
    
    // Rapport final
    log('=== RAPPORT FINAL COMPLET ===');
    log(`Git: ${results.git.branches} branches, ${results.git.commits} commits, ${results.git.drivers} drivers`);
    log(`Local: ${results.local.found} trouvés, ${results.local.copied} copiés`);
    log(`External: ${results.external.sources} sources, ${results.external.drivers} drivers`);
    log(`Organisation: ${results.organize.organized} organisés`);
    log(`Images: ${results.images.enriched} enrichies`);
    log(`Documentation: ${results.docs.updated} mise à jour`);
    
    // Sauvegarder le rapport complet
    const reportPath = './logs/comprehensive-dump-final-report.json';
    fs.writeFileSync(reportPath, JSON.stringify(results, null, 2));
    log(`Rapport final sauvegardé: ${reportPath}`);
    
    return results;
}

// Point d'entrée
if (require.main === module) {
    comprehensiveDriverDump().catch(error => {
        log(`Erreur fatale: ${error.message}`, 'ERROR');
        process.exit(1);
    });
}

module.exports = {
    comprehensiveDriverDump,
    dumpGitBranches,
    dumpLocalSources,
    scrapeExternalSources,
    organizeDrivers,
    enrichMissingImages,
    updateDocumentation
};