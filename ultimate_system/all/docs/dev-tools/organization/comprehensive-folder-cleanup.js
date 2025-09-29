#!/usr/bin/env node

/**
 * COMPREHENSIVE FOLDER CLEANUP
 * Supprime/fusionne dossiers inutiles et dupliqués
 * Réorganise la structure complète du projet
 */

const fs = require('fs-extra');
const path = require('path');

class ComprehensiveFolderCleanup {
    constructor() {
        this.projectRoot = process.cwd();
        this.driversPath = path.join(this.projectRoot, 'drivers');
        this.duplicates = [];
        this.unnecessary = [];
        this.merged = [];
        this.renamed = [];
    }

    async run() {
        console.log('🧹 Starting Comprehensive Folder Cleanup...');
        
        // Phase 1: Identifier les dossiers dupliqués/inutiles
        await this.identifyDuplicatesAndUnnecessary();
        
        // Phase 2: Fusionner les dossiers similaires
        await this.mergeSimilarFolders();
        
        // Phase 3: Renommer les dossiers avec des marques
        await this.renameBrandedFolders();
        
        // Phase 4: Supprimer les dossiers vides/inutiles
        await this.removeUnnecessaryFolders();
        
        // Phase 5: Vérifier la cohérence finale
        await this.verifyFinalStructure();
        
        // Phase 6: Générer le rapport
        await this.generateCleanupReport();
        
        console.log('✅ Comprehensive folder cleanup complete!');
    }

    async identifyDuplicatesAndUnnecessary() {
        console.log('\n🔍 Identifying duplicates and unnecessary folders...');
        
        if (!await fs.pathExists(this.driversPath)) {
            console.log('  ⚠️  Drivers directory not found');
            return;
        }
        
        const drivers = await fs.readdir(this.driversPath);
        const driverAnalysis = new Map();
        
        // Analyser chaque driver
        for (const driver of drivers) {
            const driverPath = path.join(this.driversPath, driver);
            const stat = await fs.stat(driverPath);
            
            if (!stat.isDirectory()) continue;
            
            const analysis = await this.analyzeDriver(driver, driverPath);
            
            // Regroupement par similarité
            const key = this.generateSimilarityKey(analysis);
            if (!driverAnalysis.has(key)) {
                driverAnalysis.set(key, []);
            }
            driverAnalysis.get(key).push({
                name: driver,
                path: driverPath,
                analysis
            });
        }
        
        // Identifier les doublons
        for (const [key, similarDrivers] of driverAnalysis) {
            if (similarDrivers.length > 1) {
                console.log(`  🔄 Found ${similarDrivers.length} similar drivers for key: ${key}`);
                
                // Garder le plus complet, marquer les autres comme dupliqués
                const bestDriver = this.selectBestDriver(similarDrivers);
                const duplicatesForKey = similarDrivers.filter(d => d.name !== bestDriver.name);
                
                this.duplicates.push({
                    key,
                    best: bestDriver,
                    duplicates: duplicatesForKey
                });
            }
        }
        
        console.log(`  📊 Found ${this.duplicates.length} duplicate groups`);
    }

    async analyzeDriver(driverName, driverPath) {
        const driverJsonPath = path.join(driverPath, 'driver.json');
        const deviceJsPath = path.join(driverPath, 'device.js');
        const assetsPath = path.join(driverPath, 'assets');
        
        let driverJson = {};
        let hasDeviceJs = false;
        let hasAssets = false;
        let fileCount = 0;
        
        // Lecture du driver.json
        if (await fs.pathExists(driverJsonPath)) {
            try {
                driverJson = await fs.readJson(driverJsonPath);
            } catch (error) {
                console.log(`    ⚠️  Error reading driver.json for ${driverName}: ${error.message}`);
            }
        }
        
        hasDeviceJs = await fs.pathExists(deviceJsPath);
        hasAssets = await fs.pathExists(assetsPath);
        
        // Compter les fichiers
        try {
            const files = await this.countFiles(driverPath);
            fileCount = files;
        } catch (error) {
            fileCount = 0;
        }
        
        return {
            name: driverName,
            hasDriverJson: await fs.pathExists(driverJsonPath),
            hasDeviceJs,
            hasAssets,
            fileCount,
            manufacturerIds: this.extractIds(driverJson, '_TZ'),
            productIds: this.extractIds(driverJson, 'TS'),
            capabilities: driverJson.capabilities || [],
            category: this.determineCategory(driverName),
            powerType: this.determinePowerType(driverName),
            buttonCount: this.extractButtonCount(driverName)
        };
    }

    async countFiles(dirPath) {
        let count = 0;
        const items = await fs.readdir(dirPath);
        
        for (const item of items) {
            const itemPath = path.join(dirPath, item);
            const stat = await fs.stat(itemPath);
            
            if (stat.isFile()) {
                count++;
            } else if (stat.isDirectory()) {
                count += await this.countFiles(itemPath);
            }
        }
        
        return count;
    }

    extractIds(driverJson, prefix) {
        const jsonStr = JSON.stringify(driverJson);
        const pattern = new RegExp(`${prefix}[A-Z0-9_]+`, 'g');
        const matches = jsonStr.match(pattern) || [];
        return [...new Set(matches)];
    }

    determineCategory(name) {
        const nameKey = name.toLowerCase();
        
        if (nameKey.includes('switch')) return 'switch';
        if (nameKey.includes('sensor')) return 'sensor';
        if (nameKey.includes('bulb') || nameKey.includes('light')) return 'light';
        if (nameKey.includes('plug') || nameKey.includes('socket')) return 'plug';
        if (nameKey.includes('lock')) return 'lock';
        if (nameKey.includes('thermostat') || nameKey.includes('climate')) return 'climate';
        if (nameKey.includes('cover') || nameKey.includes('blind') || nameKey.includes('curtain')) return 'cover';
        if (nameKey.includes('detector')) return 'detector';
        
        return 'unknown';
    }

    determinePowerType(name) {
        const nameKey = name.toLowerCase();
        
        if (nameKey.includes('battery') || nameKey.includes('cr2032')) return 'battery';
        if (nameKey.includes('ac') || nameKey.includes('220v') || nameKey.includes('mains')) return 'ac';
        if (nameKey.includes('dc') || nameKey.includes('12v') || nameKey.includes('24v')) return 'dc';
        if (nameKey.includes('hybrid')) return 'hybrid';
        
        return 'unknown';
    }

    extractButtonCount(name) {
        const nameKey = name.toLowerCase();
        const patterns = [
            /(\d+)gang/,
            /(\d+)_gang/,
            /(\d+)button/,
            /(\d+)_button/,
            /(\d+)ch/
        ];
        
        for (const pattern of patterns) {
            const match = nameKey.match(pattern);
            if (match) return parseInt(match[1]);
        }
        
        return 1;
    }

    generateSimilarityKey(analysis) {
        return `${analysis.category}_${analysis.powerType}_${analysis.buttonCount}btn`;
    }

    selectBestDriver(similarDrivers) {
        // Critères de sélection du meilleur driver:
        // 1. A tous les fichiers requis
        // 2. Plus de manufacturer/product IDs
        // 3. Plus de capabilities
        // 4. Plus de fichiers au total
        
        return similarDrivers.sort((a, b) => {
            const scoreA = this.calculateDriverScore(a.analysis);
            const scoreB = this.calculateDriverScore(b.analysis);
            return scoreB - scoreA;
        })[0];
    }

    calculateDriverScore(analysis) {
        let score = 0;
        
        if (analysis.hasDriverJson) score += 10;
        if (analysis.hasDeviceJs) score += 10;
        if (analysis.hasAssets) score += 5;
        
        score += analysis.manufacturerIds.length * 2;
        score += analysis.productIds.length * 2;
        score += analysis.capabilities.length;
        score += Math.min(analysis.fileCount, 10);
        
        return score;
    }

    async mergeSimilarFolders() {
        console.log('\n🔄 Merging similar folders...');
        
        for (const duplicate of this.duplicates) {
            console.log(`  📁 Processing duplicate group: ${duplicate.key}`);
            
            const bestDriver = duplicate.best;
            console.log(`    ✅ Keeping: ${bestDriver.name}`);
            
            for (const duplicateDriver of duplicate.duplicates) {
                console.log(`    🔄 Merging: ${duplicateDriver.name} → ${bestDriver.name}`);
                
                await this.mergeFolderContents(duplicateDriver.path, bestDriver.path);
                await this.mergeManufacturerIds(duplicateDriver.path, bestDriver.path);
                
                this.merged.push({
                    from: duplicateDriver.name,
                    to: bestDriver.name,
                    reason: 'duplicate_merge'
                });
            }
        }
        
        console.log(`  📊 Merged ${this.merged.length} folders`);
    }

    async mergeFolderContents(fromPath, toPath) {
        try {
            // Merger le contenu des dossiers
            const items = await fs.readdir(fromPath);
            
            for (const item of items) {
                const sourcePath = path.join(fromPath, item);
                const targetPath = path.join(toPath, item);
                
                if (await fs.pathExists(targetPath)) {
                    // Si le fichier existe déjà, comparer et garder le meilleur
                    const sourceStats = await fs.stat(sourcePath);
                    const targetStats = await fs.stat(targetPath);
                    
                    if (sourceStats.size > targetStats.size) {
                        await fs.copy(sourcePath, targetPath, { overwrite: true });
                    }
                } else {
                    await fs.copy(sourcePath, targetPath);
                }
            }
        } catch (error) {
            console.log(`    ⚠️  Error merging ${fromPath}: ${error.message}`);
        }
    }

    async mergeManufacturerIds(fromPath, toPath) {
        const fromDriverJson = path.join(fromPath, 'driver.json');
        const toDriverJson = path.join(toPath, 'driver.json');
        
        try {
            if (await fs.pathExists(fromDriverJson) && await fs.pathExists(toDriverJson)) {
                const fromData = await fs.readJson(fromDriverJson);
                const toData = await fs.readJson(toDriverJson);
                
                // Fusionner les manufacturer/product IDs
                if (fromData.zigbee?.manufacturerName && toData.zigbee?.manufacturerName) {
                    const combinedManufacturers = [
                        ...new Set([
                            ...fromData.zigbee.manufacturerName,
                            ...toData.zigbee.manufacturerName
                        ])
                    ];
                    toData.zigbee.manufacturerName = combinedManufacturers;
                }
                
                if (fromData.zigbee?.productId && toData.zigbee?.productId) {
                    const combinedProducts = [
                        ...new Set([
                            ...fromData.zigbee.productId,
                            ...toData.zigbee.productId
                        ])
                    ];
                    toData.zigbee.productId = combinedProducts;
                }
                
                await fs.writeJson(toDriverJson, toData, { spaces: 2 });
            }
        } catch (error) {
            console.log(`    ⚠️  Error merging IDs: ${error.message}`);
        }
    }

    async renameBrandedFolders() {
        console.log('\n📝 Renaming branded folders...');
        
        const drivers = await fs.readdir(this.driversPath);
        const brandedFolders = [];
        
        // Identifier les dossiers avec des marques
        for (const driver of drivers) {
            if (this.containsBrand(driver)) {
                brandedFolders.push(driver);
            }
        }
        
        console.log(`  🏷️  Found ${brandedFolders.length} branded folders to rename`);
        
        for (const brandedFolder of brandedFolders) {
            const newName = this.generateUnbrandedName(brandedFolder);
            
            if (newName !== brandedFolder) {
                const oldPath = path.join(this.driversPath, brandedFolder);
                const newPath = path.join(this.driversPath, newName);
                
                // Vérifier si le nouveau nom existe déjà
                if (await fs.pathExists(newPath)) {
                    console.log(`    🔄 Merging: ${brandedFolder} → ${newName} (exists)`);
                    await this.mergeFolderContents(oldPath, newPath);
                    await this.mergeManufacturerIds(oldPath, newPath);
                    await fs.remove(oldPath);
                } else {
                    console.log(`    📝 Renaming: ${brandedFolder} → ${newName}`);
                    await fs.move(oldPath, newPath);
                }
                
                this.renamed.push({
                    from: brandedFolder,
                    to: newName,
                    reason: 'unbrand'
                });
            }
        }
    }

    containsBrand(folderName) {
        const brands = [
            'tuya', 'aqara', 'xiaomi', 'sonoff', 'ikea', 'philips', 'hue',
            'osram', 'ledvance', 'innr', 'livolo', 'neo', 'moes', 'zemismart',
            'blitzwolf', 'ewelink', 'shelly', 'tasmota'
        ];
        
        const nameKey = folderName.toLowerCase();
        return brands.some(brand => nameKey.includes(brand));
    }

    generateUnbrandedName(brandedName) {
        const nameKey = brandedName.toLowerCase();
        
        // Mappages spécifiques
        const mappings = {
            'tuya_switch': 'wall_switch_1gang',
            'tuya_dimmer': 'touch_dimmer',
            'aqara_motion_sensor': 'motion_sensor_pir_battery',
            'sonoff_basic': 'relay_switch_1gang',
            'ikea_tradfri_bulb': 'smart_bulb_tunable',
            'hue_bulb': 'smart_bulb_rgb',
            'philips_hue': 'smart_bulb_rgb'
        };
        
        // Vérifier les mappages directs
        for (const [branded, unbranded] of Object.entries(mappings)) {
            if (nameKey.includes(branded)) {
                return unbranded;
            }
        }
        
        // Génération automatique basée sur le contenu
        let newName = brandedName;
        
        // Supprimer les marques
        const brands = ['tuya_', 'aqara_', 'xiaomi_', 'sonoff_', 'ikea_', 'philips_', 'hue_'];
        for (const brand of brands) {
            newName = newName.replace(new RegExp(brand, 'gi'), '');
        }
        
        // Normaliser le nom
        newName = newName.replace(/_+/g, '_').replace(/^_|_$/g, '');
        
        return newName || brandedName;
    }

    async removeUnnecessaryFolders() {
        console.log('\n🗑️  Removing unnecessary folders...');
        
        // Supprimer les dossiers dupliqués après merge
        for (const merged of this.merged) {
            const folderPath = path.join(this.driversPath, merged.from);
            
            if (await fs.pathExists(folderPath)) {
                console.log(`    🗑️  Removing merged folder: ${merged.from}`);
                await fs.remove(folderPath);
                this.unnecessary.push({
                    name: merged.from,
                    reason: 'merged_duplicate'
                });
            }
        }
        
        // Identifier les dossiers vides
        const drivers = await fs.readdir(this.driversPath);
        for (const driver of drivers) {
            const driverPath = path.join(this.driversPath, driver);
            const stat = await fs.stat(driverPath);
            
            if (stat.isDirectory()) {
                const items = await fs.readdir(driverPath);
                if (items.length === 0) {
                    console.log(`    🗑️  Removing empty folder: ${driver}`);
                    await fs.remove(driverPath);
                    this.unnecessary.push({
                        name: driver,
                        reason: 'empty_folder'
                    });
                }
            }
        }
        
        console.log(`  📊 Removed ${this.unnecessary.length} unnecessary folders`);
    }

    async verifyFinalStructure() {
        console.log('\n✅ Verifying final structure...');
        
        const finalDrivers = await fs.readdir(this.driversPath);
        const categories = {};
        
        for (const driver of finalDrivers) {
            const driverPath = path.join(this.driversPath, driver);
            const stat = await fs.stat(driverPath);
            
            if (stat.isDirectory()) {
                const category = this.determineCategory(driver);
                if (!categories[category]) {
                    categories[category] = [];
                }
                categories[category].push(driver);
            }
        }
        
        console.log(`  📊 Final structure:`);
        for (const [category, drivers] of Object.entries(categories)) {
            console.log(`     ${category}: ${drivers.length} drivers`);
        }
        
        console.log(`  📈 Total drivers: ${finalDrivers.length}`);
    }

    async generateCleanupReport() {
        console.log('\n📊 Generating cleanup report...');
        
        const report = {
            timestamp: new Date().toISOString(),
            summary: {
                duplicatesFound: this.duplicates.length,
                foldersMerged: this.merged.length,
                foldersRenamed: this.renamed.length,
                foldersRemoved: this.unnecessary.length
            },
            duplicates: this.duplicates,
            merged: this.merged,
            renamed: this.renamed,
            removed: this.unnecessary,
            actions: [
                `Identified ${this.duplicates.length} duplicate groups`,
                `Merged ${this.merged.length} similar folders`,
                `Renamed ${this.renamed.length} branded folders`, 
                `Removed ${this.unnecessary.length} unnecessary folders`
            ]
        };
        
        const reportsPath = path.join(this.projectRoot, 'project-data', 'analysis-results');
        await fs.ensureDir(reportsPath);
        
        await fs.writeJson(
            path.join(reportsPath, 'comprehensive-folder-cleanup-report.json'),
            report,
            { spaces: 2 }
        );
        
        console.log(`  📄 Cleanup report saved`);
        console.log(`  📊 Cleanup Summary:`);
        console.log(`     Duplicates processed: ${report.summary.duplicatesFound}`);
        console.log(`     Folders merged: ${report.summary.foldersMerged}`);
        console.log(`     Folders renamed: ${report.summary.foldersRenamed}`);
        console.log(`     Folders removed: ${report.summary.foldersRemoved}`);
    }
}

// Exécution
if (require.main === module) {
    new ComprehensiveFolderCleanup().run().catch(console.error);
}

module.exports = ComprehensiveFolderCleanup;
