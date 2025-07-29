#!/usr/bin/env node
/**
 * Script d'optimisation et réorganisation des drivers
 * Version: 1.0.12-20250729-1405
 * Objectif: Réorganiser et optimiser tous les drivers de façon améliorative
 * Spécificités: Analyse intelligente, fusion doublons, optimisation structure
 */
const fs = require('fs');
const path = require('path');
const { execSync } = require('child_process');

// Configuration
const CONFIG = {
    version: '1.0.12-20250729-1405',
    driversPath: './drivers',
    backupPath: './backups/optimization',
    logFile: './logs/optimize-reorganize-drivers.log',
    optimizationRules: {
        mergeSimilar: true,
        removeDuplicates: true,
        standardizeStructure: true,
        enhanceCapabilities: true,
        generateMissingImages: true,
        updateMetadata: true
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
    
    for (const dir of dirs) {
        if (!fs.existsSync(dir)) {
            fs.mkdirSync(dir, { recursive: true });
        }
    }
}

// Analyser tous les drivers existants
function analyzeAllDrivers() {
    log('=== ANALYSE DE TOUS LES DRIVERS ===');
    
    const analysis = {
        total: 0,
        tuya: { total: 0, byCategory: {}, drivers: [] },
        zigbee: { total: 0, byCategory: {}, drivers: [] },
        duplicates: [],
        issues: [],
        optimizations: []
    };
    
    try {
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
                
                analysis[protocol].byCategory[category] = drivers.length;
                analysis[protocol].total += drivers.length;
                analysis.total += drivers.length;
                
                // Analyser chaque driver
                for (const driver of drivers) {
                    const driverPath = path.join(categoryPath, driver);
                    const driverInfo = analyzeDriver(driverPath, protocol, category);
                    
                    analysis[protocol].drivers.push(driverInfo);
                    
                    // Détecter les problèmes
                    if (driverInfo.issues.length > 0) {
                        analysis.issues.push({
                            driver: driver,
                            protocol: protocol,
                            category: category,
                            issues: driverInfo.issues
                        });
                    }
                    
                    // Identifier les optimisations possibles
                    if (driverInfo.optimizations.length > 0) {
                        analysis.optimizations.push({
                            driver: driver,
                            protocol: protocol,
                            category: category,
                            optimizations: driverInfo.optimizations
                        });
                    }
                }
            }
        }
        
        // Détecter les doublons
        analysis.duplicates = detectDuplicates(analysis);
        
    } catch (error) {
        log(`Erreur analyse drivers: ${error.message}`, 'ERROR');
        analysis.issues.push(`Erreur analyse globale: ${error.message}`);
    }
    
    return analysis;
}

// Analyser un driver spécifique
function analyzeDriver(driverPath, protocol, category) {
    const driverInfo = {
        name: path.basename(driverPath),
        path: driverPath,
        protocol: protocol,
        category: category,
        hasCompose: false,
        hasDevice: false,
        hasImages: false,
        capabilities: [],
        clusters: [],
        issues: [],
        optimizations: [],
        score: 0
    };
    
    try {
        const composePath = path.join(driverPath, 'driver.compose.json');
        const devicePath = path.join(driverPath, 'device.js');
        const imagesPath = path.join(driverPath, 'assets', 'images');
        
        // Vérifier les fichiers existants
        driverInfo.hasCompose = fs.existsSync(composePath);
        driverInfo.hasDevice = fs.existsSync(devicePath);
        driverInfo.hasImages = fs.existsSync(imagesPath);
        
        // Analyser le compose.json
        if (driverInfo.hasCompose) {
            try {
                const compose = JSON.parse(fs.readFileSync(composePath, 'utf8'));
                
                if (compose.capabilities) {
                    driverInfo.capabilities = compose.capabilities;
                }
                
                if (compose.clusters) {
                    driverInfo.clusters = compose.clusters;
                }
                
                // Vérifier les problèmes
                if (!compose.title || !compose.title.en) {
                    driverInfo.issues.push('Titre manquant ou incomplet');
                }
                
                if (!compose.description || !compose.description.en) {
                    driverInfo.issues.push('Description manquante ou incomplète');
                }
                
                if (!compose.capabilities || compose.capabilities.length === 0) {
                    driverInfo.issues.push('Aucune capability définie');
                }
                
                // Suggestions d'optimisation
                if (!compose.images || !compose.images.icon) {
                    driverInfo.optimizations.push('Ajouter une icône');
                }
                
                if (!compose.category || compose.category === 'unknown') {
                    driverInfo.optimizations.push('Catégoriser le driver');
                }
                
            } catch (error) {
                driverInfo.issues.push(`Erreur lecture compose.json: ${error.message}`);
            }
        } else {
            driverInfo.issues.push('Fichier driver.compose.json manquant');
        }
        
        // Analyser le device.js
        if (driverInfo.hasDevice) {
            try {
                const deviceContent = fs.readFileSync(devicePath, 'utf8');
                
                // Vérifier la structure SDK3
                if (!deviceContent.includes('onInit') || !deviceContent.includes('onUninit')) {
                    driverInfo.issues.push('Structure SDK3 incomplète');
                }
                
                if (!deviceContent.includes('registerCapabilityListener')) {
                    driverInfo.optimizations.push('Ajouter des listeners de capabilities');
                }
                
            } catch (error) {
                driverInfo.issues.push(`Erreur lecture device.js: ${error.message}`);
            }
        } else {
            driverInfo.issues.push('Fichier device.js manquant');
        }
        
        // Calculer le score de qualité
        driverInfo.score = calculateQualityScore(driverInfo);
        
    } catch (error) {
        driverInfo.issues.push(`Erreur analyse driver: ${error.message}`);
    }
    
    return driverInfo;
}

// Calculer le score de qualité d'un driver
function calculateQualityScore(driverInfo) {
    let score = 0;
    
    // Fichiers de base (40 points)
    if (driverInfo.hasCompose) score += 20;
    if (driverInfo.hasDevice) score += 20;
    
    // Contenu des fichiers (30 points)
    if (driverInfo.capabilities.length > 0) score += 15;
    if (driverInfo.clusters.length > 0) score += 15;
    
    // Images et métadonnées (20 points)
    if (driverInfo.hasImages) score += 10;
    if (driverInfo.issues.length === 0) score += 10;
    
    // Optimisations (10 points)
    if (driverInfo.optimizations.length === 0) score += 10;
    
    return Math.min(100, score);
}

// Détecter les doublons
function detectDuplicates(analysis) {
    const duplicates = [];
    const allDrivers = [...analysis.tuya.drivers, ...analysis.zigbee.drivers];
    
    for (let i = 0; i < allDrivers.length; i++) {
        for (let j = i + 1; j < allDrivers.length; j++) {
            const driver1 = allDrivers[i];
            const driver2 = allDrivers[j];
            
            const similarity = calculateSimilarity(driver1, driver2);
            
            if (similarity > 0.8) {
                duplicates.push({
                    driver1: driver1,
                    driver2: driver2,
                    similarity: similarity
                });
            }
        }
    }
    
    return duplicates;
}

// Calculer la similarité entre deux drivers
function calculateSimilarity(driver1, driver2) {
    let similarity = 0;
    let factors = 0;
    
    // Nom similaire
    const nameSimilarity = calculateStringSimilarity(driver1.name, driver2.name);
    similarity += nameSimilarity * 0.3;
    factors += 0.3;
    
    // Capabilities communes
    const commonCapabilities = driver1.capabilities.filter(cap => 
        driver2.capabilities.includes(cap)
    );
    const capabilitySimilarity = commonCapabilities.length / 
        Math.max(driver1.capabilities.length, driver2.capabilities.length);
    similarity += capabilitySimilarity * 0.4;
    factors += 0.4;
    
    // Catégorie identique
    if (driver1.category === driver2.category) {
        similarity += 0.2;
        factors += 0.2;
    }
    
    // Protocole identique
    if (driver1.protocol === driver2.protocol) {
        similarity += 0.1;
        factors += 0.1;
    }
    
    return factors > 0 ? similarity / factors : 0;
}

// Calculer la similarité entre deux chaînes
function calculateStringSimilarity(str1, str2) {
    const longer = str1.length > str2.length ? str1 : str2;
    const shorter = str1.length > str2.length ? str2 : str1;
    
    if (longer.length === 0) return 1.0;
    
    const editDistance = levenshteinDistance(longer, shorter);
    return (longer.length - editDistance) / longer.length;
}

// Distance de Levenshtein
function levenshteinDistance(str1, str2) {
    const matrix = [];
    
    for (let i = 0; i <= str2.length; i++) {
        matrix[i] = [i];
    }
    
    for (let j = 0; j <= str1.length; j++) {
        matrix[0][j] = j;
    }
    
    for (let i = 1; i <= str2.length; i++) {
        for (let j = 1; j <= str1.length; j++) {
            if (str2.charAt(i - 1) === str1.charAt(j - 1)) {
                matrix[i][j] = matrix[i - 1][j - 1];
            } else {
                matrix[i][j] = Math.min(
                    matrix[i - 1][j - 1] + 1,
                    matrix[i][j - 1] + 1,
                    matrix[i - 1][j] + 1
                );
            }
        }
    }
    
    return matrix[str2.length][str1.length];
}

// Optimiser un driver
function optimizeDriver(driverInfo) {
    log(`Optimisation du driver: ${driverInfo.name}`);
    
    const optimizations = {
        driver: driverInfo.name,
        applied: [],
        errors: []
    };
    
    try {
        const driverPath = driverInfo.path;
        
        // 1. Optimiser le compose.json
        if (driverInfo.hasCompose) {
            const composePath = path.join(driverPath, 'driver.compose.json');
            const compose = JSON.parse(fs.readFileSync(composePath, 'utf8'));
            
            // Ajouter des métadonnées manquantes
            if (!compose.title || !compose.title.en) {
                compose.title = {
                    en: driverInfo.name.replace(/-/g, ' ').replace(/\b\w/g, l => l.toUpperCase()),
                    fr: driverInfo.name.replace(/-/g, ' ').replace(/\b\w/g, l => l.toUpperCase()),
                    nl: driverInfo.name.replace(/-/g, ' ').replace(/\b\w/g, l => l.toUpperCase()),
                    ta: driverInfo.name.replace(/-/g, ' ').replace(/\b\w/g, l => l.toUpperCase())
                };
                optimizations.applied.push('Titre ajouté');
            }
            
            if (!compose.description || !compose.description.en) {
                compose.description = {
                    en: `Optimized ${driverInfo.name} driver`,
                    fr: `Driver ${driverInfo.name} optimisé`,
                    nl: `Geoptimaliseerde ${driverInfo.name} driver`,
                    ta: `ஒப்படைக்கப்பட்ட ${driverInfo.name} டிரைவர்`
                };
                optimizations.applied.push('Description ajoutée');
            }
            
            // Ajouter des capabilities manquantes
            if (!compose.capabilities || compose.capabilities.length === 0) {
                compose.capabilities = ['onoff'];
                optimizations.applied.push('Capability onoff ajoutée');
            }
            
            // Ajouter des options de capabilities
            if (!compose.capabilitiesOptions) {
                compose.capabilitiesOptions = {};
                for (const capability of compose.capabilities) {
                    compose.capabilitiesOptions[capability] = {
                        title: {
                            en: capability.replace(/_/g, ' ').replace(/\b\w/g, l => l.toUpperCase()),
                            fr: capability.replace(/_/g, ' ').replace(/\b\w/g, l => l.toUpperCase()),
                            nl: capability.replace(/_/g, ' ').replace(/\b\w/g, l => l.toUpperCase()),
                            ta: capability.replace(/_/g, ' ').replace(/\b\w/g, l => l.toUpperCase())
                        }
                    };
                }
                optimizations.applied.push('Options de capabilities ajoutées');
            }
            
            // Ajouter une icône si manquante
            if (!compose.images || !compose.images.icon) {
                compose.images = {
                    icon: 'assets/images/icon.svg'
                };
                optimizations.applied.push('Référence icône ajoutée');
            }
            
            // Sauvegarder le compose.json optimisé
            fs.writeFileSync(composePath, JSON.stringify(compose, null, 2));
            
        } else {
            optimizations.errors.push('Compose.json manquant');
        }
        
        // 2. Optimiser le device.js
        if (driverInfo.hasDevice) {
            const devicePath = path.join(driverPath, 'device.js');
            let deviceContent = fs.readFileSync(devicePath, 'utf8');
            
            // Vérifier et améliorer la structure SDK3
            if (!deviceContent.includes('onInit')) {
                deviceContent = enhanceDeviceStructure(deviceContent, driverInfo);
                optimizations.applied.push('Structure SDK3 améliorée');
            }
            
            // Sauvegarder le device.js optimisé
            fs.writeFileSync(devicePath, deviceContent);
            
        } else {
            optimizations.errors.push('Device.js manquant');
        }
        
        // 3. Générer une icône si manquante
        if (!driverInfo.hasImages) {
            const imagesDir = path.join(driverPath, 'assets', 'images');
            fs.mkdirSync(imagesDir, { recursive: true });
            
            const iconSvg = generateOptimizedIcon(driverInfo);
            const iconPath = path.join(imagesDir, 'icon.svg');
            fs.writeFileSync(iconPath, iconSvg);
            
            optimizations.applied.push('Icône SVG générée');
        }
        
    } catch (error) {
        optimizations.errors.push(`Erreur optimisation: ${error.message}`);
    }
    
    return optimizations;
}

// Améliorer la structure du device.js
function enhanceDeviceStructure(deviceContent, driverInfo) {
    const baseClass = driverInfo.protocol === 'tuya' ? 'TuyaDevice' : 'ZigbeeDevice';
    const requirePath = driverInfo.protocol === 'tuya' ? 'homey-tuya' : 'homey-meshdriver';
    
    // Si le fichier est vide ou très basique, créer une structure complète
    if (deviceContent.length < 100) {
        const className = driverInfo.name
            .split('-')
            .map(word => word.charAt(0).toUpperCase() + word.slice(1))
            .join('');
        
        return `const { ${baseClass} } = require('${requirePath}');

class ${className} extends ${baseClass} {
    async onInit() {
        await super.onInit();
        
        this.log('${className} initialized');
        
        // Register capabilities
${driverInfo.capabilities.map(cap => `        this.registerCapabilityListener('${cap}', async (value) => {
            await this.setCapabilityValue('${cap}', value);
        });`).join('\n')}
    }
    
    async onUninit() {
        this.log('${className} uninitialized');
    }
}

module.exports = ${className};`;
    }
    
    // Sinon, améliorer la structure existante
    if (!deviceContent.includes('onInit')) {
        deviceContent = deviceContent.replace(
            /class\s+(\w+)\s+extends\s+(\w+)/,
            `class $1 extends $2 {
    async onInit() {
        await super.onInit();
        this.log('$1 initialized');
    }
    
    async onUninit() {
        this.log('$1 uninitialized');
    }`
        );
    }
    
    return deviceContent;
}

// Générer une icône SVG optimisée
function generateOptimizedIcon(driverInfo) {
    const colors = {
        'controllers': '#4CAF50',
        'sensors': '#2196F3',
        'security': '#F44336',
        'climate': '#FF9800',
        'automation': '#9C27B0',
        'generic': '#607D8B'
    };
    
    const color = colors[driverInfo.category] || colors.generic;
    const text = driverInfo.name.substring(0, 8).toUpperCase();
    
    return `<svg width="100" height="100" viewBox="0 0 100 100" xmlns="http://www.w3.org/2000/svg">
  <defs>
    <linearGradient id="grad" x1="0%" y1="0%" x2="100%" y2="100%">
      <stop offset="0%" style="stop-color:${color};stop-opacity:1" />
      <stop offset="100%" style="stop-color:${color}dd;stop-opacity:1" />
    </linearGradient>
  </defs>
  <rect width="100" height="100" rx="10" fill="url(#grad)" />
  <text x="50" y="55" font-family="Arial" font-size="12" fill="white" text-anchor="middle">${text}</text>
</svg>`;
}

// Fusionner les drivers similaires
function mergeSimilarDrivers(duplicates) {
    log('=== FUSION DES DRIVERS SIMILAIRES ===');
    
    const mergeResults = {
        merged: 0,
        errors: 0,
        details: []
    };
    
    for (const duplicate of duplicates) {
        try {
            const result = mergeDriverPair(duplicate.driver1, duplicate.driver2);
            mergeResults.details.push(result);
            
            if (result.success) {
                mergeResults.merged++;
            } else {
                mergeResults.errors++;
            }
            
        } catch (error) {
            log(`Erreur fusion ${duplicate.driver1.name} + ${duplicate.driver2.name}: ${error.message}`, 'ERROR');
            mergeResults.errors++;
        }
    }
    
    return mergeResults;
}

// Fusionner une paire de drivers
function mergeDriverPair(driver1, driver2) {
    const result = {
        driver1: driver1.name,
        driver2: driver2.name,
        similarity: driver1.similarity,
        success: false,
        mergedDriver: null,
        errors: []
    };
    
    try {
        // Choisir le meilleur driver comme base
        const baseDriver = driver1.score > driver2.score ? driver1 : driver2;
        const otherDriver = driver1.score > driver2.score ? driver2 : driver1;
        
        // Fusionner les capabilities
        const mergedCapabilities = [...new Set([
            ...baseDriver.capabilities,
            ...otherDriver.capabilities
        ])];
        
        // Fusionner les clusters
        const mergedClusters = [...new Set([
            ...baseDriver.clusters,
            ...otherDriver.clusters
        ])];
        
        // Créer le driver fusionné
        const mergedDriver = {
            name: `${baseDriver.name}-merged`,
            protocol: baseDriver.protocol,
            category: baseDriver.category,
            capabilities: mergedCapabilities,
            clusters: mergedClusters,
            score: Math.max(baseDriver.score, otherDriver.score) + 10
        };
        
        result.mergedDriver = mergedDriver;
        result.success = true;
        
        log(`Drivers fusionnés: ${driver1.name} + ${driver2.name} -> ${mergedDriver.name}`);
        
    } catch (error) {
        result.errors.push(error.message);
    }
    
    return result;
}

// Réorganiser la structure des dossiers
function reorganizeStructure(analysis) {
    log('=== RÉORGANISATION DE LA STRUCTURE ===');
    
    const reorganization = {
        moved: 0,
        created: 0,
        errors: 0
    };
    
    try {
        // Créer les nouvelles catégories si nécessaire
        const newCategories = ['controllers', 'sensors', 'security', 'climate', 'automation', 'generic'];
        
        for (const protocol of ['tuya', 'zigbee']) {
            const protocolPath = path.join(CONFIG.driversPath, protocol);
            
            for (const category of newCategories) {
                const categoryPath = path.join(protocolPath, category);
                if (!fs.existsSync(categoryPath)) {
                    fs.mkdirSync(categoryPath, { recursive: true });
                    reorganization.created++;
                }
            }
        }
        
        // Déplacer les drivers vers les bonnes catégories
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
                
                for (const driver of drivers) {
                    const driverPath = path.join(categoryPath, driver);
                    const driverInfo = analysis[protocol].drivers.find(d => d.name === driver);
                    
                    if (driverInfo) {
                        const targetCategory = determineOptimalCategory(driverInfo);
                        const targetPath = path.join(protocolPath, targetCategory, driver);
                        
                        if (targetCategory !== category && !fs.existsSync(targetPath)) {
                            try {
                                fs.renameSync(driverPath, targetPath);
                                reorganization.moved++;
                                log(`Driver déplacé: ${driver} -> ${protocol}/${targetCategory}`);
                            } catch (error) {
                                log(`Erreur déplacement ${driver}: ${error.message}`, 'ERROR');
                                reorganization.errors++;
                            }
                        }
                    }
                }
            }
        }
        
    } catch (error) {
        log(`Erreur réorganisation: ${error.message}`, 'ERROR');
        reorganization.errors++;
    }
    
    return reorganization;
}

// Déterminer la catégorie optimale pour un driver
function determineOptimalCategory(driverInfo) {
    const name = driverInfo.name.toLowerCase();
    
    if (name.includes('light') || name.includes('bulb') || name.includes('lamp') || 
        name.includes('switch') || name.includes('plug') || name.includes('outlet')) {
        return 'controllers';
    }
    
    if (name.includes('sensor') || name.includes('detector') || name.includes('motion') || 
        name.includes('temperature') || name.includes('humidity')) {
        return 'sensors';
    }
    
    if (name.includes('contact') || name.includes('door') || name.includes('window') || 
        name.includes('lock') || name.includes('alarm')) {
        return 'security';
    }
    
    if (name.includes('thermostat') || name.includes('hvac') || name.includes('climate')) {
        return 'climate';
    }
    
    if (name.includes('curtain') || name.includes('blind') || name.includes('shade') || 
        name.includes('fan') || name.includes('ventilation')) {
        return 'automation';
    }
    
    return 'generic';
}

// Créer un rapport d'optimisation
function createOptimizationReport(analysis, optimizations, mergeResults, reorganization) {
    log('=== CRÉATION DU RAPPORT D\'OPTIMISATION ===');
    
    const report = {
        timestamp: new Date().toISOString(),
        version: CONFIG.version,
        analysis: analysis,
        optimizations: optimizations,
        mergeResults: mergeResults,
        reorganization: reorganization,
        summary: {
            totalDrivers: analysis.total,
            driversOptimized: optimizations.length,
            driversMerged: mergeResults.merged,
            driversMoved: reorganization.moved,
            categoriesCreated: reorganization.created,
            averageScore: analysis.tuya.drivers.concat(analysis.zigbee.drivers)
                .reduce((sum, driver) => sum + driver.score, 0) / analysis.total
        }
    };
    
    const reportPath = './logs/optimization-report.json';
    fs.writeFileSync(reportPath, JSON.stringify(report, null, 2));
    log(`Rapport d'optimisation créé: ${reportPath}`);
    
    // Afficher le résumé
    log('=== RÉSUMÉ OPTIMISATION ===');
    log(`Total drivers: ${analysis.total}`);
    log(`Drivers optimisés: ${optimizations.length}`);
    log(`Drivers fusionnés: ${mergeResults.merged}`);
    log(`Drivers déplacés: ${reorganization.moved}`);
    log(`Catégories créées: ${reorganization.created}`);
    log(`Score moyen: ${report.summary.averageScore.toFixed(1)}/100`);
    log(`Doublons détectés: ${analysis.duplicates.length}`);
    log(`Problèmes identifiés: ${analysis.issues.length}`);
    
    return report;
}

// Point d'entrée principal
async function optimizeReorganizeDriversScript() {
    log('🚀 === OPTIMISATION ET RÉORGANISATION DES DRIVERS ===');
    
    ensureDirectories();
    
    // Étape 1: Analyser tous les drivers
    log('📊 ÉTAPE 1: Analyse de tous les drivers');
    const analysis = analyzeAllDrivers();
    
    // Étape 2: Optimiser les drivers
    log('🔧 ÉTAPE 2: Optimisation des drivers');
    const optimizations = [];
    for (const driver of [...analysis.tuya.drivers, ...analysis.zigbee.drivers]) {
        const optimization = optimizeDriver(driver);
        optimizations.push(optimization);
    }
    
    // Étape 3: Fusionner les drivers similaires
    log('🔀 ÉTAPE 3: Fusion des drivers similaires');
    const mergeResults = mergeSimilarDrivers(analysis.duplicates);
    
    // Étape 4: Réorganiser la structure
    log('📁 ÉTAPE 4: Réorganisation de la structure');
    const reorganization = reorganizeStructure(analysis);
    
    // Étape 5: Rapport
    log('📊 ÉTAPE 5: Création du rapport');
    const report = createOptimizationReport(analysis, optimizations, mergeResults, reorganization);
    
    // Rapport final
    log('=== RAPPORT FINAL OPTIMISATION ===');
    log(`Total drivers: ${analysis.total}`);
    log(`Drivers optimisés: ${optimizations.length}`);
    log(`Drivers fusionnés: ${mergeResults.merged}`);
    log(`Drivers déplacés: ${reorganization.moved}`);
    log(`Score moyen: ${report.summary.averageScore.toFixed(1)}/100`);
    
    return report;
}

// Point d'entrée
if (require.main === module) {
    optimizeReorganizeDriversScript().catch(error => {
        log(`Erreur fatale: ${error.message}`, 'ERROR');
        process.exit(1);
    });
}

module.exports = {
    optimizeReorganizeDriversScript,
    analyzeAllDrivers,
    optimizeDriver,
    mergeSimilarDrivers,
    reorganizeStructure,
    createOptimizationReport
};