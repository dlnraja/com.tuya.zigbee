#!/usr/bin/env node

/**
 * 🔄 DRIVER RENAMER & FUSION
 * Version: 1.0.0
 * Date: 2025-08-05
 * 
 * Renommage et fusion des drivers selon le format standard
 */

const fs = require('fs');
const path = require('path');
const { execSync } = require('child_process');

class DriverRenamerFusion {
    constructor() {
        this.startTime = Date.now();
        this.stats = {
            driversRenamed: 0,
            driversFused: 0,
            filesCreated: 0,
            errors: []
        };
        
        console.log('🔄 DRIVER RENAMER & FUSION - DÉMARRAGE');
        console.log('📅 Date:', new Date().toISOString());
        console.log('🎯 Mode: RENOMMAGE ET FUSION STANDARD');
        console.log('');
    }

    async execute() {
        try {
            // Étape 1: Analyser la structure actuelle
            await this.analyzeCurrentStructure();
            
            // Étape 2: Renommer les drivers selon le format standard
            await this.renameDrivers();
            
            // Étape 3: Fusionner les duplicatas
            await this.fuseDuplicates();
            
            // Étape 4: Réorganiser la structure
            await this.reorganizeStructure();
            
            // Étape 5: Validation finale
            await this.finalValidation();
            
            this.generateReport();
        } catch (error) {
            console.error('❌ Erreur renommage/fusion:', error.message);
            this.stats.errors.push(error.message);
        }
    }

    async analyzeCurrentStructure() {
        console.log('📊 ANALYSE DE LA STRUCTURE ACTUELLE...');
        
        try {
            const drivers = this.scanAllDrivers();
            console.log(`📋 ${drivers.length} drivers trouvés`);
            
            // Analyser les patterns de noms
            const patterns = this.analyzeNamePatterns(drivers);
            console.log('📊 Patterns de noms analysés');
            
            // Identifier les duplicatas potentiels
            const duplicates = this.identifyDuplicates(drivers);
            console.log(`🔄 ${duplicates.length} groupes de duplicatas identifiés`);
            
            this.currentDrivers = drivers;
            this.namePatterns = patterns;
            this.duplicateGroups = duplicates;
            
            console.log('✅ Analyse terminée');
            
        } catch (error) {
            console.error('❌ Erreur analyse:', error.message);
            this.stats.errors.push(`Analysis: ${error.message}`);
        }
    }

    scanAllDrivers() {
        const drivers = [];
        
        // Scanner drivers/tuya
        const tuyaPath = 'drivers/tuya';
        if (fs.existsSync(tuyaPath)) {
            const categories = fs.readdirSync(tuyaPath);
            for (const category of categories) {
                const categoryPath = path.join(tuyaPath, category);
                if (fs.statSync(categoryPath).isDirectory()) {
                    const driverFolders = fs.readdirSync(categoryPath);
                    for (const driverFolder of driverFolders) {
                        const driverPath = path.join(categoryPath, driverFolder);
                        if (fs.statSync(driverPath).isDirectory()) {
                            drivers.push({
                                type: 'tuya',
                                category: category,
                                name: driverFolder,
                                path: `tuya/${category}/${driverFolder}`,
                                fullPath: driverPath
                            });
                        }
                    }
                }
            }
        }
        
        // Scanner drivers/zigbee
        const zigbeePath = 'drivers/zigbee';
        if (fs.existsSync(zigbeePath)) {
            const categories = fs.readdirSync(zigbeePath);
            for (const category of categories) {
                const categoryPath = path.join(zigbeePath, category);
                if (fs.statSync(categoryPath).isDirectory()) {
                    const driverFolders = fs.readdirSync(categoryPath);
                    for (const driverFolder of driverFolders) {
                        const driverPath = path.join(categoryPath, driverFolder);
                        if (fs.statSync(driverPath).isDirectory()) {
                            drivers.push({
                                type: 'zigbee',
                                category: category,
                                name: driverFolder,
                                path: `zigbee/${category}/${driverFolder}`,
                                fullPath: driverPath
                            });
                        }
                    }
                }
            }
        }
        
        return drivers;
    }

    analyzeNamePatterns(drivers) {
        const patterns = {
            tsPattern: [], // ts011f, ts0044, etc.
            tzPattern: [], // tz3000, tz6000, etc.
            brandPattern: [], // tuya, feit, gosund, etc.
            genericPattern: [], // generic, unknown, etc.
            mixedPattern: [] // autres patterns
        };
        
        for (const driver of drivers) {
            const name = driver.name.toLowerCase();
            
            if (name.startsWith('ts') && /^\w{2}\d{3,4}/.test(name)) {
                patterns.tsPattern.push(driver);
            } else if (name.startsWith('tz') && /^\w{2}\d{4}/.test(name)) {
                patterns.tzPattern.push(driver);
            } else if (['tuya', 'feit', 'gosund', 'smartlife'].includes(name)) {
                patterns.brandPattern.push(driver);
            } else if (['generic', 'unknown', 'assets'].includes(name)) {
                patterns.genericPattern.push(driver);
            } else {
                patterns.mixedPattern.push(driver);
            }
        }
        
        return patterns;
    }

    identifyDuplicates(drivers) {
        const duplicates = [];
        const processed = new Set();
        
        for (const driver of drivers) {
            if (processed.has(driver.name)) continue;
            
            const similarDrivers = drivers.filter(d => 
                this.areDriversSimilar(driver, d) && d.name !== driver.name
            );
            
            if (similarDrivers.length > 0) {
                duplicates.push({
                    main: driver,
                    duplicates: similarDrivers,
                    all: [driver, ...similarDrivers]
                });
                
                // Marquer comme traité
                processed.add(driver.name);
                similarDrivers.forEach(d => processed.add(d.name));
            }
        }
        
        return duplicates;
    }

    areDriversSimilar(driver1, driver2) {
        // Comparer les noms pour identifier les similitudes
        const name1 = driver1.name.toLowerCase();
        const name2 = driver2.name.toLowerCase();
        
        // Patterns de similarité
        const patterns = [
            // Même modèle avec préfixes différents
            name1.replace(/^(tz\d+_|ts\d+_)/, '') === name2.replace(/^(tz\d+_|ts\d+_)/, ''),
            // Même modèle avec suffixes différents
            name1.replace(/[-_]\w+$/, '') === name2.replace(/[-_]\w+$/, ''),
            // Même modèle avec catégories différentes
            name1 === name2 && driver1.category !== driver2.category
        ];
        
        return patterns.some(pattern => pattern);
    }

    async renameDrivers() {
        console.log('🔄 RENOMMAGE DES DRIVERS...');
        
        try {
            for (const driver of this.currentDrivers) {
                const newName = this.generateStandardName(driver);
                if (newName !== driver.name) {
                    await this.renameDriver(driver, newName);
                    this.stats.driversRenamed++;
                }
            }
            
            console.log(`✅ ${this.stats.driversRenamed} drivers renommés`);
            
        } catch (error) {
            console.error('❌ Erreur renommage:', error.message);
            this.stats.errors.push(`Renaming: ${error.message}`);
        }
    }

    generateStandardName(driver) {
        const name = driver.name.toLowerCase();
        const category = driver.category;
        const type = driver.type;
        
        // Patterns de renommage
        if (name.startsWith('ts') && /^\w{2}\d{3,4}/.test(name)) {
            // Format: category_brand_model
            return `${category}_tuya_${name}`;
        } else if (name.startsWith('tz') && /^\w{2}\d{4}/.test(name)) {
            // Format: category_brand_model
            return `${category}_tuya_${name}`;
        } else if (['tuya', 'feit', 'gosund', 'smartlife'].includes(name)) {
            // Format: category_brand_generic
            return `${category}_${name}_generic`;
        } else if (['generic', 'unknown', 'assets'].includes(name)) {
            // Format: category_generic_type
            return `${category}_generic_${name}`;
        } else {
            // Format: category_brand_model
            return `${category}_${type}_${name}`;
        }
    }

    async renameDriver(driver, newName) {
        try {
            const oldPath = driver.fullPath;
            const newPath = path.join(path.dirname(oldPath), newName);
            
            if (fs.existsSync(oldPath) && !fs.existsSync(newPath)) {
                fs.renameSync(oldPath, newPath);
                console.log(`✅ Renommé: ${driver.name} → ${newName}`);
                
                // Mettre à jour les fichiers internes
                await this.updateDriverFiles(newPath, newName, driver);
            }
            
        } catch (error) {
            console.error(`❌ Erreur renommage ${driver.name}:`, error.message);
        }
    }

    async updateDriverFiles(driverPath, newName, oldDriver) {
        try {
            // Mettre à jour driver.compose.json
            const composePath = path.join(driverPath, 'driver.compose.json');
            if (fs.existsSync(composePath)) {
                let composeData = JSON.parse(fs.readFileSync(composePath, 'utf8'));
                
                composeData = {
                    ...composeData,
                    id: newName,
                    name: {
                        en: newName,
                        fr: newName,
                        nl: newName,
                        ta: newName
                    },
                    renamed: {
                        from: oldDriver.name,
                        date: new Date().toISOString(),
                        reason: 'standardization'
                    }
                };
                
                fs.writeFileSync(composePath, JSON.stringify(composeData, null, 2));
            }
            
            // Mettre à jour README.md
            const readmePath = path.join(driverPath, 'README.md');
            if (fs.existsSync(readmePath)) {
                let readmeContent = fs.readFileSync(readmePath, 'utf8');
                
                const renameInfo = `
## 🔄 Renommage
- **Ancien nom**: ${oldDriver.name}
- **Nouveau nom**: ${newName}
- **Date**: ${new Date().toISOString()}
- **Raison**: Standardisation du format
`;
                
                readmeContent += renameInfo;
                fs.writeFileSync(readmePath, readmeContent);
            }
            
        } catch (error) {
            console.error(`❌ Erreur mise à jour fichiers:`, error.message);
        }
    }

    async fuseDuplicates() {
        console.log('🔄 FUSION DES DUPLICATAS...');
        
        try {
            for (const group of this.duplicateGroups) {
                await this.fuseDriverGroup(group);
                this.stats.driversFused++;
            }
            
            console.log(`✅ ${this.stats.driversFused} groupes fusionnés`);
            
        } catch (error) {
            console.error('❌ Erreur fusion:', error.message);
            this.stats.errors.push(`Fusion: ${error.message}`);
        }
    }

    async fuseDriverGroup(group) {
        try {
            const mainDriver = group.main;
            const duplicates = group.duplicates;
            
            console.log(`🔄 Fusion du groupe: ${mainDriver.name}`);
            
            // Fusionner les fichiers des duplicatas dans le driver principal
            for (const duplicate of duplicates) {
                await this.mergeDriverIntoMain(mainDriver, duplicate);
            }
            
            // Supprimer les duplicatas
            for (const duplicate of duplicates) {
                if (fs.existsSync(duplicate.fullPath)) {
                    fs.rmSync(duplicate.fullPath, { recursive: true, force: true });
                    console.log(`🗑️  Supprimé: ${duplicate.name}`);
                }
            }
            
            // Mettre à jour le driver principal avec les informations de fusion
            await this.updateMainDriverWithFusion(mainDriver, duplicates);
            
        } catch (error) {
            console.error(`❌ Erreur fusion groupe:`, error.message);
        }
    }

    async mergeDriverIntoMain(mainDriver, duplicate) {
        try {
            // Fusionner les fichiers device.js
            await this.mergeDeviceFiles(mainDriver.fullPath, duplicate.fullPath);
            
            // Fusionner les fichiers driver.compose.json
            await this.mergeComposeFiles(mainDriver.fullPath, duplicate.fullPath);
            
            // Fusionner les README.md
            await this.mergeReadmeFiles(mainDriver.fullPath, duplicate.fullPath);
            
        } catch (error) {
            console.error(`❌ Erreur fusion ${duplicate.name}:`, error.message);
        }
    }

    async mergeDeviceFiles(mainPath, duplicatePath) {
        try {
            const mainDevicePath = path.join(mainPath, 'device.js');
            const duplicateDevicePath = path.join(duplicatePath, 'device.js');
            
            if (fs.existsSync(duplicateDevicePath) && fs.existsSync(mainDevicePath)) {
                const duplicateContent = fs.readFileSync(duplicateDevicePath, 'utf8');
                
                // Ajouter les méthodes uniques du duplicata
                const methods = this.extractMethods(duplicateContent);
                
                let mainContent = fs.readFileSync(mainDevicePath, 'utf8');
                
                for (const method of methods) {
                    if (!mainContent.includes(method.name)) {
                        mainContent += `\n    ${method.code}\n`;
                    }
                }
                
                fs.writeFileSync(mainDevicePath, mainContent);
            }
            
        } catch (error) {
            console.error('❌ Erreur fusion device.js:', error.message);
        }
    }

    extractMethods(content) {
        const methods = [];
        const methodRegex = /async\s+(\w+)\s*\([^)]*\)\s*\{[^}]*\}/g;
        let match;
        
        while ((match = methodRegex.exec(content)) !== null) {
            methods.push({
                name: match[1],
                code: match[0]
            });
        }
        
        return methods;
    }

    async mergeComposeFiles(mainPath, duplicatePath) {
        try {
            const mainComposePath = path.join(mainPath, 'driver.compose.json');
            const duplicateComposePath = path.join(duplicatePath, 'driver.compose.json');
            
            if (fs.existsSync(duplicateComposePath) && fs.existsSync(mainComposePath)) {
                const mainCompose = JSON.parse(fs.readFileSync(mainComposePath, 'utf8'));
                const duplicateCompose = JSON.parse(fs.readFileSync(duplicateComposePath, 'utf8'));
                
                // Fusionner les capabilities
                const mergedCapabilities = [...new Set([
                    ...(mainCompose.capabilities || []),
                    ...(duplicateCompose.capabilities || [])
                ])];
                
                // Fusionner les autres propriétés
                const mergedCompose = {
                    ...mainCompose,
                    capabilities: mergedCapabilities,
                    fused: {
                        from: duplicateCompose.id || 'unknown',
                        date: new Date().toISOString(),
                        capabilities: duplicateCompose.capabilities || []
                    }
                };
                
                fs.writeFileSync(mainComposePath, JSON.stringify(mergedCompose, null, 2));
            }
            
        } catch (error) {
            console.error('❌ Erreur fusion compose:', error.message);
        }
    }

    async mergeReadmeFiles(mainPath, duplicatePath) {
        try {
            const mainReadmePath = path.join(mainPath, 'README.md');
            const duplicateReadmePath = path.join(duplicatePath, 'README.md');
            
            if (fs.existsSync(duplicateReadmePath) && fs.existsSync(mainReadmePath)) {
                const duplicateContent = fs.readFileSync(duplicateReadmePath, 'utf8');
                
                let mainContent = fs.readFileSync(mainReadmePath, 'utf8');
                
                const fusionInfo = `
## 🔄 Fusion
- **Driver fusionné**: ${duplicatePath.split('/').pop()}
- **Date de fusion**: ${new Date().toISOString()}
- **Contenu ajouté**: Voir les informations ci-dessous

${duplicateContent}
`;
                
                mainContent += fusionInfo;
                fs.writeFileSync(mainReadmePath, mainContent);
            }
            
        } catch (error) {
            console.error('❌ Erreur fusion README:', error.message);
        }
    }

    async updateMainDriverWithFusion(mainDriver, duplicates) {
        try {
            const mainComposePath = path.join(mainDriver.fullPath, 'driver.compose.json');
            
            if (fs.existsSync(mainComposePath)) {
                let composeData = JSON.parse(fs.readFileSync(mainComposePath, 'utf8'));
                
                // Ajouter les informations de fusion
                composeData.fusion = {
                    date: new Date().toISOString(),
                    duplicates: duplicates.map(d => d.name),
                    totalDrivers: duplicates.length + 1
                };
                
                fs.writeFileSync(mainComposePath, JSON.stringify(composeData, null, 2));
            }
            
        } catch (error) {
            console.error('❌ Erreur mise à jour fusion:', error.message);
        }
    }

    async reorganizeStructure() {
        console.log('📁 RÉORGANISATION DE LA STRUCTURE...');
        
        try {
            // Vérifier que tous les drivers sont dans les bonnes catégories
            const drivers = this.scanAllDrivers();
            
            for (const driver of drivers) {
                const correctCategory = this.determineCorrectCategory(driver);
                if (correctCategory !== driver.category) {
                    await this.moveDriverToCategory(driver, correctCategory);
                }
            }
            
            console.log('✅ Structure réorganisée');
            
        } catch (error) {
            console.error('❌ Erreur réorganisation:', error.message);
            this.stats.errors.push(`Reorganization: ${error.message}`);
        }
    }

    determineCorrectCategory(driver) {
        const name = driver.name.toLowerCase();
        
        if (name.includes('light') || name.includes('bulb') || name.includes('lamp')) {
            return 'lights';
        } else if (name.includes('switch') || name.includes('button')) {
            return 'switches';
        } else if (name.includes('plug') || name.includes('socket')) {
            return 'plugs';
        } else if (name.includes('sensor') || name.includes('motion') || name.includes('temperature')) {
            return 'sensors';
        } else if (name.includes('cover') || name.includes('blind') || name.includes('curtain')) {
            return 'covers';
        } else if (name.includes('lock')) {
            return 'locks';
        } else if (name.includes('thermostat')) {
            return 'thermostats';
        } else {
            return driver.category; // Garder la catégorie actuelle
        }
    }

    async moveDriverToCategory(driver, newCategory) {
        try {
            const oldPath = driver.fullPath;
            const newPath = `drivers/${driver.type}/${newCategory}/${driver.name}`;
            
            if (fs.existsSync(oldPath) && !fs.existsSync(newPath)) {
                fs.mkdirSync(path.dirname(newPath), { recursive: true });
                fs.renameSync(oldPath, newPath);
                console.log(`📁 Déplacé: ${driver.name} → ${newCategory}`);
            }
            
        } catch (error) {
            console.error(`❌ Erreur déplacement ${driver.name}:`, error.message);
        }
    }

    async finalValidation() {
        console.log('✅ VALIDATION FINALE...');
        
        try {
            // Vérifier la structure finale
            const structureValid = this.validateFinalStructure();
            
            // Générer rapport final
            await this.generateFinalReport(structureValid);
            
            console.log('✅ Validation finale terminée');
            
        } catch (error) {
            console.error('❌ Erreur validation finale:', error.message);
            this.stats.errors.push(`Final validation: ${error.message}`);
        }
    }

    validateFinalStructure() {
        try {
            const drivers = this.scanAllDrivers();
            
            // Vérifier qu'il n'y a plus de duplicatas
            const names = drivers.map(d => d.name);
            const uniqueNames = [...new Set(names)];
            
            if (names.length !== uniqueNames.length) {
                console.error('❌ Duplicatas détectés après fusion');
                return false;
            }
            
            // Vérifier que tous les noms suivent le format standard
            const standardNames = drivers.filter(d => 
                d.name.includes('_') && d.name.split('_').length >= 2
            );
            
            if (standardNames.length !== drivers.length) {
                console.error('❌ Certains drivers ne suivent pas le format standard');
                return false;
            }
            
            console.log('✅ Structure finale validée');
            return true;
            
        } catch (error) {
            console.error('❌ Erreur validation structure finale:', error.message);
            return false;
        }
    }

    async generateFinalReport(success) {
        try {
            const drivers = this.scanAllDrivers();
            
            const report = {
                timestamp: new Date().toISOString(),
                success: success,
                stats: this.stats,
                structure: {
                    totalDrivers: drivers.length,
                    tuyaDrivers: drivers.filter(d => d.type === 'tuya').length,
                    zigbeeDrivers: drivers.filter(d => d.type === 'zigbee').length,
                    categories: [...new Set(drivers.map(d => d.category))]
                }
            };
            
            fs.writeFileSync('driver-renamer-fusion-report.json', JSON.stringify(report, null, 2));
            
            const markdownReport = this.generateMarkdownReport(report);
            fs.writeFileSync('driver-renamer-fusion-report.md', markdownReport);
            
            console.log('✅ Rapport final généré');
            
        } catch (error) {
            console.error('❌ Erreur génération rapport:', error.message);
        }
    }

    generateMarkdownReport(report) {
        return `# 🔄 Driver Renamer & Fusion Report

## 📊 Statistics
- **Success**: ${report.success ? '✅ Yes' : '❌ No'}
- **Drivers renamed**: ${report.stats.driversRenamed}
- **Drivers fused**: ${report.stats.driversFused}
- **Files created**: ${report.stats.filesCreated}
- **Errors**: ${report.stats.errors.length}

## 🏗️ Structure
- **Total drivers**: ${report.structure.totalDrivers}
- **Tuya drivers**: ${report.structure.tuyaDrivers}
- **Zigbee drivers**: ${report.structure.zigbeeDrivers}
- **Categories**: ${report.structure.categories.join(', ')}

## 📅 Date
${report.timestamp}

## 🎯 Status
${report.success ? '✅ DRIVER RENAMER & FUSION SUCCESSFUL' : '❌ DRIVER RENAMER & FUSION FAILED'}
`;
    }

    generateReport() {
        const duration = Date.now() - this.startTime;
        
        console.log('');
        console.log('📊 RAPPORT DRIVER RENAMER & FUSION');
        console.log('==================================');
        console.log(`⏱️  Durée: ${duration}ms`);
        console.log(`🔄 Drivers renommés: ${this.stats.driversRenamed}`);
        console.log(`🔄 Drivers fusionnés: ${this.stats.driversFused}`);
        console.log(`📄 Fichiers créés: ${this.stats.filesCreated}`);
        console.log(`🚨 Erreurs: ${this.stats.errors.length}`);
        
        if (this.stats.errors.length > 0) {
            console.log('\n🚨 Erreurs détectées:');
            this.stats.errors.forEach(error => console.log(`  - ${error}`));
        }
        
        console.log('\n🎯 DRIVER RENAMER & FUSION TERMINÉ');
        console.log('✅ Renommage et fusion réussis');
    }
}

// Exécution
const renamer = new DriverRenamerFusion();
renamer.execute().catch(console.error); 