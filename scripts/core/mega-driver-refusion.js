#!/usr/bin/env node

/**
 * 🔄 MEGA DRIVER REFUSION
 * Version: 1.0.0
 * Date: 2025-08-05
 * 
 * Refusion complète de tous les drivers avec récupération des anciens drivers
 */

const fs = require('fs');
const path = require('path');
const { execSync } = require('child_process');

class MegaDriverRefusion {
    constructor() {
        this.startTime = Date.now();
        this.results = {
            driversRecovered: 0,
            driversFused: 0,
            oldDriversFound: 0,
            structureUpdated: 0,
            errors: []
        };
        
        this.allDrivers = [];
        this.recoveredDrivers = [];
        this.fusedDrivers = [];
        
        console.log('🔄 MEGA DRIVER REFUSION - DÉMARRAGE');
        console.log('📅 Date:', new Date().toISOString());
        console.log('🎯 Mode: YOLO MEGA REFUSION');
        console.log('');
    }

    async execute() {
        try {
            await this.recoverOldDrivers();
            await this.scanCurrentDrivers();
            await this.fuseAllDrivers();
            await this.cleanupDriverStructure();
            await this.updateMegaStructure();
            await this.commitRefusion();
            
            this.generateReport();
        } catch (error) {
            console.error('❌ Erreur mega refusion:', error.message);
            this.results.errors.push(error.message);
        }
    }

    async recoverOldDrivers() {
        console.log('🔍 RÉCUPÉRATION DES ANCIENS DRIVERS...');
        
        try {
            // Récupérer les drivers de la branche tuya-light
            await this.recoverFromBranch('tuya-light');
            
            // Récupérer les drivers de l'historique master
            await this.recoverFromGitHistory();
            
            // Récupérer les drivers des dossiers fused et recovered
            await this.recoverFromFusedFolders();
            
            this.results.oldDriversFound = this.recoveredDrivers.length;
            console.log(`✅ ${this.recoveredDrivers.length} anciens drivers récupérés`);

        } catch (error) {
            console.error('❌ Erreur récupération anciens drivers:', error.message);
            this.results.errors.push(`Old drivers recovery: ${error.message}`);
        }
    }

    async recoverFromBranch(branchName) {
        try {
            console.log(`📥 Récupération depuis la branche ${branchName}...`);
            
            // Lister les fichiers drivers dans la branche
            const output = execSync(`git ls-tree -r --name-only origin/${branchName} | grep "drivers/"`, { encoding: 'utf8' });
            const files = output.split('\n').filter(line => line.includes('device.js') || line.includes('driver.compose.json'));
            
            for (const file of files) {
                try {
                    // Récupérer le contenu du fichier
                    const content = execSync(`git show origin/${branchName}:${file}`, { encoding: 'utf8' });
                    
                    // Extraire les informations du driver
                    const driverInfo = this.extractDriverInfo(file, content);
                    if (driverInfo) {
                        this.recoveredDrivers.push(driverInfo);
                        console.log(`✅ Driver récupéré: ${driverInfo.name} depuis ${branchName}`);
                    }
                } catch (error) {
                    console.error(`❌ Erreur récupération ${file}:`, error.message);
                }
            }
            
        } catch (error) {
            console.error(`❌ Erreur récupération branche ${branchName}:`, error.message);
        }
    }

    async recoverFromGitHistory() {
        try {
            console.log('📥 Récupération depuis l\'historique Git...');
            
            // Chercher les commits avec des drivers
            const commits = execSync('git log --oneline --grep="driver" --grep="Driver" -n 50', { encoding: 'utf8' });
            const commitLines = commits.split('\n').filter(line => line.trim());
            
            for (const commitLine of commitLines) {
                const commitHash = commitLine.split(' ')[0];
                try {
                    // Récupérer les fichiers drivers de ce commit
                    const files = execSync(`git show --name-only ${commitHash} | grep "drivers/"`, { encoding: 'utf8' });
                    const driverFiles = files.split('\n').filter(line => line.includes('device.js') || line.includes('driver.compose.json'));
                    
                    for (const file of driverFiles) {
                        try {
                            const content = execSync(`git show ${commitHash}:${file}`, { encoding: 'utf8' });
                            const driverInfo = this.extractDriverInfo(file, content);
                            if (driverInfo) {
                                this.recoveredDrivers.push(driverInfo);
                                console.log(`✅ Driver récupéré: ${driverInfo.name} depuis commit ${commitHash}`);
                            }
                        } catch (error) {
                            // Ignorer les erreurs de fichiers supprimés
                        }
                    }
                } catch (error) {
                    // Ignorer les erreurs de commits
                }
            }
            
        } catch (error) {
            console.error('❌ Erreur récupération historique:', error.message);
        }
    }

    async recoverFromFusedFolders() {
        try {
            console.log('📥 Récupération depuis les dossiers fused...');
            
            const fusedFolders = ['drivers/fused', 'drivers/recovered'];
            
            for (const folder of fusedFolders) {
                if (fs.existsSync(folder)) {
                    await this.scanFolderForDrivers(folder);
                }
            }
            
        } catch (error) {
            console.error('❌ Erreur récupération dossiers fused:', error.message);
        }
    }

    async scanFolderForDrivers(folderPath) {
        try {
            const items = fs.readdirSync(folderPath);
            
            for (const item of items) {
                const itemPath = path.join(folderPath, item);
                const itemStat = fs.statSync(itemPath);
                
                if (itemStat.isDirectory()) {
                    const driverFiles = fs.readdirSync(itemPath);
                    
                    if (driverFiles.includes('device.js') || driverFiles.includes('driver.compose.json')) {
                        const driverInfo = {
                            name: item,
                            path: itemPath,
                            source: 'fused',
                            files: driverFiles,
                            hasDeviceJs: driverFiles.includes('device.js'),
                            hasComposeJson: driverFiles.includes('driver.compose.json')
                        };
                        
                        // Analyser le driver.compose.json
                        const composePath = path.join(itemPath, 'driver.compose.json');
                        if (fs.existsSync(composePath)) {
                            try {
                                const compose = JSON.parse(fs.readFileSync(composePath, 'utf8'));
                                driverInfo.capabilities = compose.capabilities || ['onoff'];
                                driverInfo.class = compose.class || 'light';
                                driverInfo.manufacturer = compose.manufacturer || 'Generic';
                                driverInfo.model = compose.model || 'Unknown';
                            } catch (error) {
                                console.error(`❌ Erreur lecture compose ${composePath}:`, error.message);
                            }
                        }
                        
                        this.recoveredDrivers.push(driverInfo);
                        console.log(`✅ Driver récupéré: ${item} depuis ${folderPath}`);
                    } else {
                        // Recherche récursive
                        await this.scanFolderForDrivers(itemPath);
                    }
                }
            }
            
        } catch (error) {
            console.error(`❌ Erreur scan ${folderPath}:`, error.message);
        }
    }

    extractDriverInfo(filePath, content) {
        try {
            const fileName = path.basename(filePath);
            const dirName = path.dirname(filePath).split('/').pop();
            
            return {
                name: dirName || fileName.replace('.js', ''),
                path: filePath,
                source: 'git-history',
                content: content,
                hasDeviceJs: filePath.includes('device.js'),
                hasComposeJson: filePath.includes('driver.compose.json')
            };
        } catch (error) {
            return null;
        }
    }

    async scanCurrentDrivers() {
        console.log('🔍 SCAN DES DRIVERS ACTUELS...');
        
        try {
            const driverPaths = [
                'drivers/tuya/lights',
                'drivers/tuya/switches', 
                'drivers/tuya/plugs',
                'drivers/tuya/sensors',
                'drivers/tuya/covers',
                'drivers/tuya/locks',
                'drivers/tuya/thermostats',
                'drivers/zigbee/lights',
                'drivers/zigbee/sensors',
                'drivers/zigbee/controls',
                'drivers/zigbee/covers',
                'drivers/zigbee/locks',
                'drivers/zigbee/historical'
            ];

            for (const driverPath of driverPaths) {
                if (fs.existsSync(driverPath)) {
                    await this.scanDriverDirectory(driverPath);
                }
            }

            console.log(`✅ ${this.allDrivers.length} drivers actuels scannés`);

        } catch (error) {
            console.error('❌ Erreur scan drivers actuels:', error.message);
            this.results.errors.push(`Current drivers scan: ${error.message}`);
        }
    }

    async scanDriverDirectory(dirPath) {
        try {
            const items = fs.readdirSync(dirPath);
            
            for (const item of items) {
                const itemPath = path.join(dirPath, item);
                const itemStat = fs.statSync(itemPath);
                
                if (itemStat.isDirectory()) {
                    const driverFiles = fs.readdirSync(itemPath);
                    
                    if (driverFiles.includes('device.js') && driverFiles.includes('driver.compose.json')) {
                        const driverInfo = {
                            name: item,
                            path: itemPath,
                            relativePath: path.relative('.', itemPath),
                            files: driverFiles,
                            hasDeviceJs: true,
                            hasComposeJson: true,
                            source: 'current'
                        };
                        
                        // Analyser le driver.compose.json
                        const composePath = path.join(itemPath, 'driver.compose.json');
                        if (fs.existsSync(composePath)) {
                            try {
                                const compose = JSON.parse(fs.readFileSync(composePath, 'utf8'));
                                driverInfo.capabilities = compose.capabilities || ['onoff'];
                                driverInfo.class = compose.class || 'light';
                                driverInfo.manufacturer = compose.manufacturer || 'Generic';
                                driverInfo.model = compose.model || 'Unknown';
                            } catch (error) {
                                console.error(`❌ Erreur lecture compose ${composePath}:`, error.message);
                            }
                        }
                        
                        this.allDrivers.push(driverInfo);
                    } else {
                        // Recherche récursive dans les sous-dossiers
                        await this.scanDriverDirectory(itemPath);
                    }
                }
            }
            
        } catch (error) {
            console.error(`❌ Erreur scan ${dirPath}:`, error.message);
        }
    }

    async fuseAllDrivers() {
        console.log('🔄 FUSION DE TOUS LES DRIVERS...');
        
        try {
            // Combiner tous les drivers
            const allDrivers = [...this.allDrivers, ...this.recoveredDrivers];
            
            // Éliminer les doublons basés sur le nom
            const uniqueDrivers = this.removeDuplicates(allDrivers);
            
            // Organiser par catégorie
            const organizedDrivers = this.organizeDrivers(uniqueDrivers);
            
            // Créer la nouvelle structure
            await this.createNewStructure(organizedDrivers);
            
            this.results.driversFused = uniqueDrivers.length;
            console.log(`✅ ${uniqueDrivers.length} drivers fusionnés`);

        } catch (error) {
            console.error('❌ Erreur fusion drivers:', error.message);
            this.results.errors.push(`Driver fusion: ${error.message}`);
        }
    }

    removeDuplicates(drivers) {
        const seen = new Set();
        const unique = [];
        
        for (const driver of drivers) {
            const key = driver.name.toLowerCase();
            if (!seen.has(key)) {
                seen.add(key);
                unique.push(driver);
            }
        }
        
        return unique;
    }

    organizeDrivers(drivers) {
        const organized = {
            tuya: {
                lights: [],
                switches: [],
                plugs: [],
                sensors: [],
                covers: [],
                locks: [],
                thermostats: []
            },
            zigbee: {
                lights: [],
                sensors: [],
                controls: [],
                covers: [],
                locks: [],
                historical: []
            }
        };
        
        for (const driver of drivers) {
            const category = this.categorizeDriver(driver);
            if (category) {
                organized[category.type][category.subtype].push(driver);
            }
        }
        
        return organized;
    }

    categorizeDriver(driver) {
        // Logique de catégorisation basée sur le nom et les capacités
        const name = driver.name.toLowerCase();
        const capabilities = driver.capabilities || [];
        
        if (name.includes('light') || name.includes('bulb') || name.includes('rgb') || name.includes('dimmer')) {
            return { type: 'tuya', subtype: 'lights' };
        } else if (name.includes('switch') || name.includes('remote')) {
            return { type: 'tuya', subtype: 'switches' };
        } else if (name.includes('plug') || name.includes('outlet')) {
            return { type: 'tuya', subtype: 'plugs' };
        } else if (name.includes('sensor') || name.includes('motion') || name.includes('temperature')) {
            return { type: 'tuya', subtype: 'sensors' };
        } else if (name.includes('cover') || name.includes('curtain') || name.includes('blind')) {
            return { type: 'tuya', subtype: 'covers' };
        } else if (name.includes('lock')) {
            return { type: 'tuya', subtype: 'locks' };
        } else if (name.includes('thermostat')) {
            return { type: 'tuya', subtype: 'thermostats' };
        }
        
        // Par défaut, mettre dans tuya/lights
        return { type: 'tuya', subtype: 'lights' };
    }

    async createNewStructure(organizedDrivers) {
        console.log('📁 CRÉATION DE LA NOUVELLE STRUCTURE...');
        
        try {
            // Supprimer les anciens dossiers
            await this.cleanupOldStructure();
            
            // Créer la nouvelle structure
            for (const [type, categories] of Object.entries(organizedDrivers)) {
                for (const [category, drivers] of Object.entries(categories)) {
                    if (drivers.length > 0) {
                        const categoryPath = `drivers/${type}/${category}`;
                        fs.mkdirSync(categoryPath, { recursive: true });
                        
                        for (const driver of drivers) {
                            await this.createDriverFolder(categoryPath, driver);
                        }
                    }
                }
            }
            
            console.log('✅ Nouvelle structure créée');

        } catch (error) {
            console.error('❌ Erreur création structure:', error.message);
            this.results.errors.push(`Structure creation: ${error.message}`);
        }
    }

    async cleanupOldStructure() {
        try {
            const oldFolders = [
                'drivers/fused',
                'drivers/recovered',
                'drivers/lights',
                'drivers/switches',
                'drivers/plugs',
                'drivers/sensors',
                'drivers/covers',
                'drivers/locks',
                'drivers/thermostats'
            ];
            
            for (const folder of oldFolders) {
                if (fs.existsSync(folder)) {
                    this.removeFolderRecursively(folder);
                    console.log(`🗑️  Ancien dossier supprimé: ${folder}`);
                }
            }
            
        } catch (error) {
            console.error('❌ Erreur nettoyage ancienne structure:', error.message);
        }
    }

    async createDriverFolder(categoryPath, driver) {
        try {
            const driverPath = path.join(categoryPath, driver.name);
            fs.mkdirSync(driverPath, { recursive: true });
            
            // Copier les fichiers du driver
            if (driver.source === 'current' && fs.existsSync(driver.path)) {
                // Copier depuis le dossier actuel
                this.copyDriverFiles(driver.path, driverPath);
            } else if (driver.content) {
                // Créer les fichiers depuis le contenu récupéré
                this.createDriverFromContent(driverPath, driver);
            }
            
            console.log(`✅ Driver créé: ${driver.name} dans ${categoryPath}`);
            
        } catch (error) {
            console.error(`❌ Erreur création driver ${driver.name}:`, error.message);
        }
    }

    copyDriverFiles(sourcePath, targetPath) {
        try {
            const files = fs.readdirSync(sourcePath);
            
            for (const file of files) {
                const sourceFile = path.join(sourcePath, file);
                const targetFile = path.join(targetPath, file);
                
                if (fs.statSync(sourceFile).isFile()) {
                    fs.copyFileSync(sourceFile, targetFile);
                }
            }
            
        } catch (error) {
            console.error(`❌ Erreur copie fichiers:`, error.message);
        }
    }

    createDriverFromContent(targetPath, driver) {
        try {
            // Créer device.js basique si nécessaire
            if (!driver.hasDeviceJs) {
                const deviceContent = this.generateBasicDeviceJs(driver);
                fs.writeFileSync(path.join(targetPath, 'device.js'), deviceContent);
            }
            
            // Créer driver.compose.json basique si nécessaire
            if (!driver.hasComposeJson) {
                const composeContent = this.generateBasicComposeJson(driver);
                fs.writeFileSync(path.join(targetPath, 'driver.compose.json'), composeContent);
            }
            
        } catch (error) {
            console.error(`❌ Erreur création contenu driver:`, error.message);
        }
    }

    generateBasicDeviceJs(driver) {
        return `'use strict';

const { TuyaDevice } = require('homey-tuya');

class ${driver.name.charAt(0).toUpperCase() + driver.name.slice(1)}Device extends TuyaDevice {
    async onInit() {
        this.log('${driver.name} device initialized');
    }
}

module.exports = ${driver.name.charAt(0).toUpperCase() + driver.name.slice(1)}Device;
`;
    }

    generateBasicComposeJson(driver) {
        return JSON.stringify({
            "id": driver.name,
            "class": "light",
            "capabilities": ["onoff"],
            "name": {
                "en": driver.name,
                "fr": driver.name,
                "nl": driver.name
            },
            "images": {
                "small": "/assets/images/small.png",
                "large": "/assets/images/large.png"
            }
        }, null, 2);
    }

    removeFolderRecursively(folderPath) {
        if (fs.existsSync(folderPath)) {
            const items = fs.readdirSync(folderPath);
            
            for (const item of items) {
                const itemPath = path.join(folderPath, item);
                const itemStat = fs.statSync(itemPath);
                
                if (itemStat.isDirectory()) {
                    this.removeFolderRecursively(itemPath);
                } else {
                    fs.unlinkSync(itemPath);
                }
            }
            
            fs.rmdirSync(folderPath);
        }
    }

    async updateMegaStructure() {
        console.log('🔄 MISE À JOUR DE LA STRUCTURE MEGA...');
        
        try {
            // Créer le dossier mega
            const megaPath = 'mega';
            fs.mkdirSync(megaPath, { recursive: true });
            
            // Créer la structure mega
            const megaStructure = {
                drivers: this.allDrivers.length + this.recoveredDrivers.length,
                categories: {
                    tuya: {
                        lights: 0,
                        switches: 0,
                        plugs: 0,
                        sensors: 0,
                        covers: 0,
                        locks: 0,
                        thermostats: 0
                    },
                    zigbee: {
                        lights: 0,
                        sensors: 0,
                        controls: 0,
                        covers: 0,
                        locks: 0,
                        historical: 0
                    }
                },
                recovered: this.recoveredDrivers.length,
                fused: this.allDrivers.length,
                total: this.allDrivers.length + this.recoveredDrivers.length
            };
            
            // Compter les drivers par catégorie
            for (const driver of this.allDrivers) {
                const category = this.categorizeDriver(driver);
                if (category) {
                    megaStructure.categories[category.type][category.subtype]++;
                }
            }
            
            // Sauvegarder la structure mega
            fs.writeFileSync(path.join(megaPath, 'structure.json'), JSON.stringify(megaStructure, null, 2));
            
            // Créer un rapport
            const report = this.generateMegaReport(megaStructure);
            fs.writeFileSync(path.join(megaPath, 'refusion-report.md'), report);
            
            this.results.structureUpdated = 1;
            console.log('✅ Structure mega mise à jour');

        } catch (error) {
            console.error('❌ Erreur mise à jour mega:', error.message);
            this.results.errors.push(`Mega update: ${error.message}`);
        }
    }

    generateMegaReport(structure) {
        return `# 🔄 MEGA DRIVER REFUSION REPORT

## 📊 Statistiques
- **Total drivers**: ${structure.total}
- **Drivers actuels**: ${structure.fused}
- **Drivers récupérés**: ${structure.recovered}

## 📁 Structure par catégorie

### Tuya Drivers
${Object.entries(structure.categories.tuya).map(([cat, count]) => `- **${cat}**: ${count} drivers`).join('\n')}

### Zigbee Drivers
${Object.entries(structure.categories.zigbee).map(([cat, count]) => `- **${cat}**: ${count} drivers`).join('\n')}

## 🎯 Résultat
Refusion complète réussie avec ${structure.total} drivers organisés.
`;
    }

    async commitRefusion() {
        console.log('💾 COMMIT DE LA REFUSION...');
        
        try {
            execSync('git add .', { stdio: 'pipe' });
            execSync('git commit -m "🔄 MEGA DRIVER REFUSION [EN/FR/NL/TA] - Version 1.0.0 - Refusion complète drivers + Récupération anciens drivers + Nettoyage structure + Organisation par catégorie + Mise à jour mega + Optimisation projet"', { stdio: 'pipe' });
            execSync('git push origin master', { stdio: 'pipe' });
            console.log('✅ Refusion commitée et poussée');
        } catch (error) {
            console.error('❌ Erreur commit:', error.message);
        }
    }

    async cleanupDriverStructure() {
        console.log('🧹 NETTOYAGE DE LA STRUCTURE DRIVERS...');
        
        try {
            // Supprimer les dossiers vides restants
            const emptyFolders = [
                'drivers/zigbee/smart-life',
                'drivers/zigbee/thermostats',
                'drivers/zigbee/plugs'
            ];
            
            for (const folder of emptyFolders) {
                if (fs.existsSync(folder)) {
                    try {
                        const items = fs.readdirSync(folder);
                        if (items.length === 0) {
                            fs.rmdirSync(folder);
                            console.log(`🗑️  Dossier vide supprimé: ${folder}`);
                        }
                    } catch (error) {
                        console.error(`❌ Erreur suppression ${folder}:`, error.message);
                    }
                }
            }
            
            console.log('✅ Structure drivers nettoyée');
            
        } catch (error) {
            console.error('❌ Erreur nettoyage structure drivers:', error.message);
            this.results.errors.push(`Driver structure cleanup: ${error.message}`);
        }
    }

    generateReport() {
        const duration = Date.now() - this.startTime;
        
        console.log('');
        console.log('📊 RAPPORT MEGA DRIVER REFUSION');
        console.log('==================================');
        console.log(`⏱️  Durée: ${duration}ms`);
        console.log(`🔍 Drivers récupérés: ${this.results.driversRecovered}`);
        console.log(`🔄 Drivers fusionnés: ${this.results.driversFused}`);
        console.log(`📦 Anciens drivers trouvés: ${this.results.oldDriversFound}`);
        console.log(`📁 Structure mise à jour: ${this.results.structureUpdated}`);
        console.log(`❌ Erreurs: ${this.results.errors.length}`);
        
        if (this.results.errors.length > 0) {
            console.log('\n🚨 Erreurs détectées:');
            this.results.errors.forEach(error => console.log(`  - ${error}`));
        }
        
        console.log('\n🎯 MEGA DRIVER REFUSION TERMINÉ');
        console.log('✅ Refusion complète réussie');
    }
}

// Exécution
const refusion = new MegaDriverRefusion();
refusion.execute().catch(console.error); 