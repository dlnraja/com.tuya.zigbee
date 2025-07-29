#!/usr/bin/env node
/**
 * Script de fusion intelligente des drivers similaires
 * Version: 1.0.12-20250729-1405
 * Objectif: Fusionner les drivers similaires pour optimiser la compatibilité
 * Spécificités: Détection automatique, fusion intelligente, optimisation maximale
 */
const fs = require('fs');
const path = require('path');
const { execSync } = require('child_process');

// Configuration
const CONFIG = {
    version: '1.0.12-20250729-1405',
    driversPath: './drivers',
    fusionPath: './drivers/fusion',
    backupPath: './backups/fusion',
    logFile: './logs/fusion.log',
    similarityThreshold: 0.8,
    maxFusionGroups: 10
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

// Créer backup
function createBackup(driverPath) {
    const backupDir = path.join(CONFIG.backupPath, path.basename(driverPath));
    if (!fs.existsSync(CONFIG.backupPath)) {
        fs.mkdirSync(CONFIG.backupPath, { recursive: true });
    }
    
    if (fs.existsSync(driverPath)) {
        execSync(`cp -r "${driverPath}" "${backupDir}"`, { stdio: 'inherit' });
        log(`Backup créé: ${backupDir}`);
    }
}

// Analyser la structure d'un driver
function analyzeDriver(driverPath) {
    const analysis = {
        path: driverPath,
        name: path.basename(driverPath),
        protocol: driverPath.includes('tuya') ? 'tuya' : 'zigbee',
        category: path.basename(path.dirname(driverPath)),
        files: [],
        capabilities: [],
        clusters: [],
        deviceClass: '',
        hasSettings: false,
        hasImages: false,
        complexity: 0
    };
    
    if (!fs.existsSync(driverPath)) {
        return analysis;
    }
    
    // Analyser les fichiers
    const files = fs.readdirSync(driverPath);
    analysis.files = files;
    
    // Analyser device.js
    const devicePath = path.join(driverPath, 'device.js');
    if (fs.existsSync(devicePath)) {
        const deviceContent = fs.readFileSync(devicePath, 'utf8');
        analysis.deviceClass = extractDeviceClass(deviceContent);
        analysis.clusters = extractClusters(deviceContent);
        analysis.complexity += deviceContent.split('\n').length;
    }
    
    // Analyser driver.compose.json
    const composePath = path.join(driverPath, 'driver.compose.json');
    if (fs.existsSync(composePath)) {
        try {
            const compose = JSON.parse(fs.readFileSync(composePath, 'utf8'));
            analysis.capabilities = compose.capabilities || [];
            analysis.complexity += Object.keys(compose).length;
        } catch (error) {
            log(`Erreur parsing compose.json: ${error.message}`, 'ERROR');
        }
    }
    
    // Vérifier les settings
    const settingsPath = path.join(driverPath, 'driver.settings.compose.json');
    analysis.hasSettings = fs.existsSync(settingsPath);
    
    // Vérifier les images
    const imagesPath = path.join(driverPath, 'assets/images');
    analysis.hasImages = fs.existsSync(imagesPath);
    
    return analysis;
}

// Extraire la classe device
function extractDeviceClass(content) {
    const classMatch = content.match(/class\s+(\w+)\s+extends/);
    return classMatch ? classMatch[1] : '';
}

// Extraire les clusters
function extractClusters(content) {
    const clusters = [];
    const clusterMatches = content.match(/clusters?:\s*\[([^\]]+)\]/g);
    if (clusterMatches) {
        clusterMatches.forEach(match => {
            const clusterList = match.match(/\[([^\]]+)\]/);
            if (clusterList) {
                clusters.push(...clusterList[1].split(',').map(c => c.trim().replace(/['"]/g, '')));
            }
        });
    }
    return clusters;
}

// Calculer la similarité entre deux drivers
function calculateSimilarity(driver1, driver2) {
    let similarity = 0;
    let factors = 0;
    
    // Similarité des capabilities
    if (driver1.capabilities.length > 0 || driver2.capabilities.length > 0) {
        const commonCapabilities = driver1.capabilities.filter(cap => 
            driver2.capabilities.includes(cap));
        const totalCapabilities = new Set([...driver1.capabilities, ...driver2.capabilities]).size;
        similarity += (commonCapabilities.length / totalCapabilities) * 0.4;
        factors += 0.4;
    }
    
    // Similarité des clusters
    if (driver1.clusters.length > 0 || driver2.clusters.length > 0) {
        const commonClusters = driver1.clusters.filter(cluster => 
            driver2.clusters.includes(cluster));
        const totalClusters = new Set([...driver1.clusters, ...driver2.clusters]).size;
        similarity += (commonClusters.length / totalClusters) * 0.3;
        factors += 0.3;
    }
    
    // Similarité de la catégorie
    if (driver1.category === driver2.category) {
        similarity += 0.2;
        factors += 0.2;
    }
    
    // Similarité du protocole
    if (driver1.protocol === driver2.protocol) {
        similarity += 0.1;
        factors += 0.1;
    }
    
    return factors > 0 ? similarity / factors : 0;
}

// Trouver les groupes de drivers similaires
function findSimilarGroups(drivers) {
    const groups = [];
    const processed = new Set();
    
    for (let i = 0; i < drivers.length; i++) {
        if (processed.has(i)) continue;
        
        const group = [drivers[i]];
        processed.add(i);
        
        for (let j = i + 1; j < drivers.length; j++) {
            if (processed.has(j)) continue;
            
            const similarity = calculateSimilarity(drivers[i], drivers[j]);
            if (similarity >= CONFIG.similarityThreshold) {
                group.push(drivers[j]);
                processed.add(j);
            }
        }
        
        if (group.length > 1) {
            groups.push(group);
        }
    }
    
    return groups.sort((a, b) => b.length - a.length);
}

// Fusionner un groupe de drivers
async function fuseDriverGroup(group) {
    if (group.length < 2) {
        return null;
    }
    
    log(`Fusion du groupe: ${group.map(d => d.name).join(', ')}`);
    
    // Créer le dossier de fusion
    const fusionDir = path.join(CONFIG.fusionPath, `fused-${Date.now()}`);
    if (!fs.existsSync(CONFIG.fusionPath)) {
        fs.mkdirSync(CONFIG.fusionPath, { recursive: true });
    }
    fs.mkdirSync(fusionDir, { recursive: true });
    
    // Analyser le meilleur driver comme base
    const baseDriver = selectBestBaseDriver(group);
    log(`Driver de base sélectionné: ${baseDriver.name}`);
    
    // Créer backup des drivers originaux
    group.forEach(driver => createBackup(driver.path));
    
    // Fusionner les capabilities
    const fusedCapabilities = mergeCapabilities(group);
    
    // Fusionner les clusters
    const fusedClusters = mergeClusters(group);
    
    // Créer le driver fusionné
    const fusedDriver = await createFusedDriver(fusionDir, baseDriver, fusedCapabilities, fusedClusters, group);
    
    // Déplacer les drivers originaux vers un dossier archive
    const archiveDir = path.join(CONFIG.backupPath, 'archived', Date.now().toString());
    fs.mkdirSync(archiveDir, { recursive: true });
    
    group.forEach(driver => {
        const archivePath = path.join(archiveDir, driver.name);
        if (fs.existsSync(driver.path)) {
            execSync(`mv "${driver.path}" "${archivePath}"`, { stdio: 'inherit' });
        }
    });
    
    // Déplacer le driver fusionné vers l'emplacement approprié
    const targetPath = path.join(path.dirname(baseDriver.path), baseDriver.name);
    if (fs.existsSync(targetPath)) {
        execSync(`rm -rf "${targetPath}"`, { stdio: 'inherit' });
    }
    execSync(`mv "${fusionDir}" "${targetPath}"`, { stdio: 'inherit' });
    
    log(`Driver fusionné créé: ${targetPath}`);
    return {
        path: targetPath,
        originalDrivers: group.map(d => d.name),
        capabilities: fusedCapabilities,
        clusters: fusedClusters
    };
}

// Sélectionner le meilleur driver de base
function selectBestBaseDriver(group) {
    return group.reduce((best, current) => {
        const bestScore = calculateDriverScore(best);
        const currentScore = calculateDriverScore(current);
        return currentScore > bestScore ? current : best;
    });
}

// Calculer le score d'un driver
function calculateDriverScore(driver) {
    let score = 0;
    
    // Plus de capabilities = meilleur
    score += driver.capabilities.length * 10;
    
    // Plus de clusters = meilleur
    score += driver.clusters.length * 5;
    
    // Avoir des settings = bonus
    if (driver.hasSettings) score += 20;
    
    // Avoir des images = bonus
    if (driver.hasImages) score += 15;
    
    // Plus de complexité = meilleur
    score += driver.complexity * 0.1;
    
    return score;
}

// Fusionner les capabilities
function mergeCapabilities(group) {
    const allCapabilities = new Set();
    
    group.forEach(driver => {
        driver.capabilities.forEach(cap => allCapabilities.add(cap));
    });
    
    return Array.from(allCapabilities);
}

// Fusionner les clusters
function mergeClusters(group) {
    const allClusters = new Set();
    
    group.forEach(driver => {
        driver.clusters.forEach(cluster => allClusters.add(cluster));
    });
    
    return Array.from(allClusters);
}

// Créer le driver fusionné
async function createFusedDriver(fusionDir, baseDriver, capabilities, clusters, group) {
    // Copier la structure de base
    if (fs.existsSync(baseDriver.path)) {
        execSync(`cp -r "${baseDriver.path}"/* "${fusionDir}/"`, { stdio: 'inherit' });
    }
    
    // Mettre à jour driver.compose.json
    const composePath = path.join(fusionDir, 'driver.compose.json');
    if (fs.existsSync(composePath)) {
        const compose = JSON.parse(fs.readFileSync(composePath, 'utf8'));
        compose.capabilities = capabilities;
        compose.title = {
            en: `Fused ${baseDriver.name} (${group.length} variants)`,
            fr: `${baseDriver.name} Fusionné (${group.length} variantes)`,
            nl: `Gefuseerde ${baseDriver.name} (${group.length} varianten)`,
            ta: `ஒன்றிணைக்கப்பட்ட ${baseDriver.name} (${group.length} மாற்றங்கள்)`
        };
        compose.description = {
            en: `Intelligently fused driver supporting ${group.length} device variants with enhanced compatibility`,
            fr: `Driver fusionné intelligemment supportant ${group.length} variantes d'appareils avec compatibilité améliorée`,
            nl: `Intelligent gefuseerde driver die ${group.length} apparaatvarianten ondersteunt met verbeterde compatibiliteit`,
            ta: `ஸ்மார்ட் ஒன்றிணைக்கப்பட்ட டிரைவர் ${group.length} சாதன மாற்றங்களை மேம்பட்ட பொருந்தக்கூடிய தன்மையுடன் ஆதரிக்கிறது`
        };
        fs.writeFileSync(composePath, JSON.stringify(compose, null, 2));
    }
    
    // Mettre à jour device.js
    const devicePath = path.join(fusionDir, 'device.js');
    if (fs.existsSync(devicePath)) {
        let deviceContent = fs.readFileSync(devicePath, 'utf8');
        
        // Ajouter les clusters fusionnés
        const clustersCode = `    get clusters() {
        return ${JSON.stringify(clusters, null, 8)};
    }`;
        
        deviceContent = deviceContent.replace(/class\s+\w+\s+extends\s+\w+\s*\{/, 
            `class ${baseDriver.deviceClass || 'FusedDevice'} extends Homey.Device {
    ${clustersCode}`);
        
        // Ajouter des méthodes de fusion
        const fusionMethods = `
    // Méthodes de fusion intelligente
    async onInit() {
        await super.onInit();
        this.log('Fused driver initialized with enhanced compatibility');
    }
    
    async onSettings({ oldSettings, newSettings, changedKeys }) {
        await super.onSettings({ oldSettings, newSettings, changedKeys });
        this.log('Fused driver settings updated');
    }
    
    // Support pour ${group.length} variantes d'appareils
    getSupportedVariants() {
        return ${JSON.stringify(group.map(d => d.name), null, 8)};
    }`;
        
        deviceContent = deviceContent.replace(/module\.exports.*/, `${fusionMethods}

module.exports = ${baseDriver.deviceClass || 'FusedDevice'};`);
        
        fs.writeFileSync(devicePath, deviceContent);
    }
    
    // Créer un fichier de métadonnées de fusion
    const fusionMeta = {
        timestamp: new Date().toISOString(),
        version: CONFIG.version,
        originalDrivers: group.map(d => ({
            name: d.name,
            path: d.path,
            capabilities: d.capabilities,
            clusters: d.clusters
        })),
        fusedCapabilities: capabilities,
        fusedClusters: clusters,
        fusionScore: calculateFusionScore(group, capabilities, clusters)
    };
    
    fs.writeFileSync(path.join(fusionDir, 'fusion-metadata.json'), 
        JSON.stringify(fusionMeta, null, 2));
    
    return fusionDir;
}

// Calculer le score de fusion
function calculateFusionScore(group, capabilities, clusters) {
    const originalCapabilities = group.reduce((total, driver) => 
        total + driver.capabilities.length, 0);
    const originalClusters = group.reduce((total, driver) => 
        total + driver.clusters.length, 0);
    
    const capabilityEfficiency = capabilities.length / originalCapabilities;
    const clusterEfficiency = clusters.length / originalClusters;
    const driverReduction = (group.length - 1) / group.length;
    
    return {
        capabilityEfficiency,
        clusterEfficiency,
        driverReduction,
        overallScore: (capabilityEfficiency + clusterEfficiency + driverReduction) / 3
    };
}

// Fonction principale de fusion
async function performIntelligentFusion() {
    log('=== DÉBUT FUSION INTELLIGENTE DES DRIVERS ===');
    
    if (!fs.existsSync(CONFIG.driversPath)) {
        log(`Dossier drivers non trouvé: ${CONFIG.driversPath}`, 'ERROR');
        return;
    }
    
    // Analyser tous les drivers
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
                
                for (const driverPath of categoryDrivers) {
                    const analysis = analyzeDriver(driverPath);
                    drivers.push(analysis);
                }
            }
        }
    }
    
    log(`Drivers analysés: ${drivers.length}`);
    
    // Trouver les groupes similaires
    const similarGroups = findSimilarGroups(drivers);
    log(`Groupes similaires trouvés: ${similarGroups.length}`);
    
    // Limiter le nombre de fusions
    const groupsToFuse = similarGroups.slice(0, CONFIG.maxFusionGroups);
    
    let fusedCount = 0;
    let errorCount = 0;
    
    for (const group of groupsToFuse) {
        try {
            const fusedDriver = await fuseDriverGroup(group);
            if (fusedDriver) {
                fusedCount++;
                log(`Groupe fusionné: ${group.length} drivers → 1 driver optimisé`);
            }
        } catch (error) {
            log(`Erreur fusion groupe: ${error.message}`, 'ERROR');
            errorCount++;
        }
    }
    
    log(`=== RÉSULTATS FUSION ===`);
    log(`Groupes fusionnés: ${fusedCount}/${groupsToFuse.length}`);
    log(`Erreurs: ${errorCount}`);
    log(`Drivers optimisés: ${fusedCount}`);
    
    // Mettre à jour les statistiques
    updateFusionStatistics(fusedCount, groupsToFuse.length, errorCount, drivers.length);
}

// Mettre à jour les statistiques
function updateFusionStatistics(fusedCount, totalGroups, errorCount, totalDrivers) {
    const stats = {
        timestamp: new Date().toISOString(),
        fusedGroups: fusedCount,
        totalGroups: totalGroups,
        errors: errorCount,
        totalDrivers: totalDrivers,
        successRate: ((fusedCount / totalGroups) * 100).toFixed(1),
        optimizationRate: ((fusedCount / totalDrivers) * 100).toFixed(1)
    };
    
    const statsPath = './logs/fusion-stats.json';
    fs.writeFileSync(statsPath, JSON.stringify(stats, null, 2));
    log(`Statistiques de fusion sauvegardées: ${statsPath}`);
}

// Point d'entrée
if (require.main === module) {
    performIntelligentFusion().catch(error => {
        log(`Erreur fatale: ${error.message}`, 'ERROR');
        process.exit(1);
    });
}

module.exports = {
    analyzeDriver,
    calculateSimilarity,
    findSimilarGroups,
    fuseDriverGroup,
    performIntelligentFusion,
    calculateDriverScore,
    mergeCapabilities,
    mergeClusters
};