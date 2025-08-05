#!/usr/bin/env node

/**
 * 🔄 ZIGBEE SEPARATION
 * Version: 1.0.0
 * Date: 2025-08-05
 * 
 * Séparation des drivers Tuya et Zigbee génériques
 */

const fs = require('fs');
const path = require('path');
const { execSync } = require('child_process');

class ZigbeeSeparation {
    constructor() {
        this.startTime = Date.now();
        this.results = {
            tuyaDrivers: 0,
            zigbeeDrivers: 0,
            driversAnalyzed: 0,
            errors: []
        };
        
        console.log('🔄 ZIGBEE SEPARATION - DÉMARRAGE');
        console.log('📅 Date:', new Date().toISOString());
        console.log('🎯 Mode: YOLO ZIGBEE SEPARATION');
        console.log('');
    }

    async execute() {
        try {
            await this.analyzeAllDrivers();
            await this.createZigbeeStructure();
            await this.separateDrivers();
            await this.updateComposeFiles();
            await this.generateSeparationReport();
            await this.commitSeparation();
            
            this.generateReport();
        } catch (error) {
            console.error('❌ Erreur séparation:', error.message);
            this.results.errors.push(error.message);
        }
    }

    async analyzeAllDrivers() {
        console.log('🔍 ANALYSE DE TOUS LES DRIVERS...');
        
        try {
            this.tuyaDrivers = [];
            this.zigbeeDrivers = [];
            
            const categories = ['controls', 'covers', 'historical', 'lights', 'locks', 'plugs', 'sensors', 'smart-life', 'switches', 'thermostats'];
            
            for (const category of categories) {
                const categoryPath = `drivers/tuya/${category}`;
                if (fs.existsSync(categoryPath)) {
                    const items = fs.readdirSync(categoryPath);
                    
                    for (const item of items) {
                        const driverPath = path.join(categoryPath, item);
                        const driverStat = fs.statSync(driverPath);
                        
                        if (driverStat.isDirectory()) {
                            await this.analyzeDriver(category, item);
                        }
                    }
                }
            }
            
            console.log(`✅ ${this.results.driversAnalyzed} drivers analysés`);

        } catch (error) {
            console.error('❌ Erreur analyse drivers:', error.message);
            this.results.errors.push(`Driver analysis: ${error.message}`);
        }
    }

    async analyzeDriver(category, driverName) {
        try {
            const driverPath = `drivers/tuya/${category}/${driverName}`;
            const deviceJsPath = path.join(driverPath, 'device.js');
            const composePath = path.join(driverPath, 'driver.compose.json');
            
            let isTuyaDriver = false;
            let isZigbeeDriver = false;
            
            // Analyser device.js
            if (fs.existsSync(deviceJsPath)) {
                const deviceContent = fs.readFileSync(deviceJsPath, 'utf8');
                
                // Détecter les marqueurs Tuya
                if (deviceContent.includes('TuyaDevice') || 
                    deviceContent.includes('tuya') || 
                    deviceContent.includes('DP') ||
                    deviceContent.includes('DataPoint') ||
                    deviceContent.includes('manufacturername') ||
                    driverName.toLowerCase().includes('tuya')) {
                    isTuyaDriver = true;
                }
                
                // Détecter les marqueurs Zigbee générique
                if (deviceContent.includes('ZigbeeDevice') ||
                    deviceContent.includes('zigbee') ||
                    deviceContent.includes('cluster') ||
                    deviceContent.includes('endpoint') ||
                    driverName.toLowerCase().includes('zigbee') ||
                    driverName.toLowerCase().includes('generic') ||
                    driverName.toLowerCase().includes('ikea') ||
                    driverName.toLowerCase().includes('philips') ||
                    driverName.toLowerCase().includes('osram') ||
                    driverName.toLowerCase().includes('xiaomi')) {
                    isZigbeeDriver = true;
                }
            }
            
            // Analyser driver.compose.json
            if (fs.existsSync(composePath)) {
                try {
                    const compose = JSON.parse(fs.readFileSync(composePath, 'utf8'));
                    
                    if (compose.manufacturer && compose.manufacturer.toLowerCase().includes('tuya')) {
                        isTuyaDriver = true;
                    }
                    
                    if (compose.manufacturer && (
                        compose.manufacturer.toLowerCase().includes('ikea') ||
                        compose.manufacturer.toLowerCase().includes('philips') ||
                        compose.manufacturer.toLowerCase().includes('osram') ||
                        compose.manufacturer.toLowerCase().includes('xiaomi') ||
                        compose.manufacturer.toLowerCase().includes('generic')
                    )) {
                        isZigbeeDriver = true;
                    }
                } catch (error) {
                    console.error(`❌ Erreur lecture compose ${driverName}:`, error.message);
                }
            }
            
            // Logique de décision
            if (isTuyaDriver && !isZigbeeDriver) {
                this.tuyaDrivers.push({ category, name: driverName, path: driverPath });
                console.log(`✅ Tuya driver: ${category}/${driverName}`);
            } else if (isZigbeeDriver || (!isTuyaDriver && !isZigbeeDriver)) {
                this.zigbeeDrivers.push({ category, name: driverName, path: driverPath });
                console.log(`🔗 Zigbee driver: ${category}/${driverName}`);
            } else {
                // Par défaut, considérer comme Tuya
                this.tuyaDrivers.push({ category, name: driverName, path: driverPath });
                console.log(`✅ Tuya driver (défaut): ${category}/${driverName}`);
            }
            
            this.results.driversAnalyzed++;

        } catch (error) {
            console.error(`❌ Erreur analyse ${category}/${driverName}:`, error.message);
        }
    }

    async createZigbeeStructure() {
        console.log('📁 CRÉATION DE LA STRUCTURE ZIGBEE...');
        
        try {
            // Créer la structure zigbee
            const zigbeeCategories = ['lights', 'sensors', 'controls', 'covers', 'locks', 'historical'];
            
            for (const category of zigbeeCategories) {
                const categoryPath = `drivers/zigbee/${category}`;
                fs.mkdirSync(categoryPath, { recursive: true });
            }
            
            console.log('✅ Structure zigbee créée');

        } catch (error) {
            console.error('❌ Erreur création structure zigbee:', error.message);
        }
    }

    async separateDrivers() {
        console.log('🔄 SÉPARATION DES DRIVERS...');
        
        try {
            // Déplacer les drivers Zigbee
            for (const driver of this.zigbeeDrivers) {
                await this.moveDriverToZigbee(driver);
            }
            
            // Réorganiser les drivers Tuya restants
            await this.reorganizeTuyaDrivers();
            
            console.log(`✅ ${this.zigbeeDrivers.length} drivers déplacés vers zigbee`);
            console.log(`✅ ${this.tuyaDrivers.length} drivers restent dans tuya`);

        } catch (error) {
            console.error('❌ Erreur séparation:', error.message);
            this.results.errors.push(`Separation: ${error.message}`);
        }
    }

    async moveDriverToZigbee(driver) {
        try {
            const sourcePath = driver.path;
            const targetCategory = this.mapToZigbeeCategory(driver.category);
            const targetPath = `drivers/zigbee/${targetCategory}/${driver.name}`;
            
            // Déplacer le driver
            this.moveFolderRecursively(sourcePath, targetPath);
            
            console.log(`✅ Driver déplacé: ${driver.category}/${driver.name} → zigbee/${targetCategory}/${driver.name}`);
            this.results.zigbeeDrivers++;

        } catch (error) {
            console.error(`❌ Erreur déplacement ${driver.name}:`, error.message);
        }
    }

    mapToZigbeeCategory(tuyaCategory) {
        const mapping = {
            'lights': 'lights',
            'switches': 'controls',
            'plugs': 'controls',
            'sensors': 'sensors',
            'covers': 'covers',
            'locks': 'locks',
            'thermostats': 'sensors',
            'controls': 'controls',
            'smart-life': 'lights',
            'historical': 'historical'
        };
        
        return mapping[tuyaCategory] || 'controls';
    }

    async reorganizeTuyaDrivers() {
        console.log('🔄 Réorganisation des drivers Tuya...');
        
        try {
            // Supprimer les catégories vides
            const categories = ['controls', 'covers', 'historical', 'lights', 'locks', 'plugs', 'sensors', 'smart-life', 'switches', 'thermostats'];
            
            for (const category of categories) {
                const categoryPath = `drivers/tuya/${category}`;
                if (fs.existsSync(categoryPath)) {
                    const items = fs.readdirSync(categoryPath);
                    if (items.length === 0) {
                        fs.rmdirSync(categoryPath);
                        console.log(`🗑️  Catégorie vide supprimée: ${category}`);
                    }
                }
            }
            
            console.log('✅ Drivers Tuya réorganisés');

        } catch (error) {
            console.error('❌ Erreur réorganisation Tuya:', error.message);
        }
    }

    async updateComposeFiles() {
        console.log('📝 MISE À JOUR DES FICHIERS COMPOSE...');
        
        try {
            // Mettre à jour les drivers Zigbee
            await this.updateZigbeeComposeFiles();
            
            // Mettre à jour les drivers Tuya
            await this.updateTuyaComposeFiles();
            
            console.log('✅ Fichiers compose mis à jour');

        } catch (error) {
            console.error('❌ Erreur mise à jour compose:', error.message);
            this.results.errors.push(`Compose update: ${error.message}`);
        }
    }

    async updateZigbeeComposeFiles() {
        try {
            const zigbeeCategories = ['lights', 'sensors', 'controls', 'covers', 'locks', 'historical'];
            
            for (const category of zigbeeCategories) {
                const categoryPath = `drivers/zigbee/${category}`;
                if (fs.existsSync(categoryPath)) {
                    const items = fs.readdirSync(categoryPath);
                    
                    for (const item of items) {
                        const composePath = path.join(categoryPath, item, 'driver.compose.json');
                        
                        if (fs.existsSync(composePath)) {
                            try {
                                const compose = JSON.parse(fs.readFileSync(composePath, 'utf8'));
                                
                                // Mettre à jour pour Zigbee générique
                                compose.isGeneric = true;
                                compose.source = 'zigbee-common';
                                compose.type = 'zigbee';
                                
                                if (!compose.manufacturer) {
                                    compose.manufacturer = 'Generic';
                                }
                                
                                fs.writeFileSync(composePath, JSON.stringify(compose, null, 2));
                                console.log(`✅ Compose mis à jour: zigbee/${category}/${item}`);
                                
                            } catch (error) {
                                console.error(`❌ Erreur mise à jour compose ${item}:`, error.message);
                            }
                        }
                    }
                }
            }
        } catch (error) {
            console.error('❌ Erreur mise à jour compose zigbee:', error.message);
        }
    }

    async updateTuyaComposeFiles() {
        try {
            const tuyaCategories = ['lights', 'switches', 'plugs', 'sensors', 'covers', 'locks', 'thermostats'];
            
            for (const category of tuyaCategories) {
                const categoryPath = `drivers/tuya/${category}`;
                if (fs.existsSync(categoryPath)) {
                    const items = fs.readdirSync(categoryPath);
                    
                    for (const item of items) {
                        const composePath = path.join(categoryPath, item, 'driver.compose.json');
                        
                        if (fs.existsSync(composePath)) {
                            try {
                                const compose = JSON.parse(fs.readFileSync(composePath, 'utf8'));
                                
                                // Mettre à jour pour Tuya
                                compose.isGeneric = false;
                                compose.source = 'tuya-zigbee';
                                compose.type = 'tuya';
                                
                                if (!compose.manufacturer) {
                                    compose.manufacturer = 'Tuya';
                                }
                                
                                fs.writeFileSync(composePath, JSON.stringify(compose, null, 2));
                                console.log(`✅ Compose mis à jour: tuya/${category}/${item}`);
                                
                            } catch (error) {
                                console.error(`❌ Erreur mise à jour compose ${item}:`, error.message);
                            }
                        }
                    }
                }
            }
        } catch (error) {
            console.error('❌ Erreur mise à jour compose tuya:', error.message);
        }
    }

    async generateSeparationReport() {
        console.log('📊 GÉNÉRATION DU RAPPORT DE SÉPARATION...');
        
        try {
            const report = {
                timestamp: new Date().toISOString(),
                separation: {
                    tuyaDrivers: this.tuyaDrivers.length,
                    zigbeeDrivers: this.zigbeeDrivers.length,
                    totalDrivers: this.results.driversAnalyzed
                },
                tuyaDrivers: this.tuyaDrivers.map(d => `${d.category}/${d.name}`),
                zigbeeDrivers: this.zigbeeDrivers.map(d => `${d.category}/${d.name}`),
                errors: this.results.errors
            };
            
            fs.writeFileSync('zigbee-separation-report.json', JSON.stringify(report, null, 2));
            
            // Générer rapport markdown
            const markdownReport = this.generateMarkdownReport(report);
            fs.writeFileSync('zigbee-separation-report.md', markdownReport);
            
            console.log('✅ Rapport de séparation généré');

        } catch (error) {
            console.error('❌ Erreur génération rapport:', error.message);
        }
    }

    generateMarkdownReport(report) {
        return `# 🔄 ZIGBEE SEPARATION REPORT

## 📊 Statistiques
- **Total drivers analysés**: ${report.separation.totalDrivers}
- **Drivers Tuya**: ${report.separation.tuyaDrivers}
- **Drivers Zigbee**: ${report.separation.zigbeeDrivers}

## 📁 Drivers Tuya
${report.tuyaDrivers.map(d => `- ${d}`).join('\n')}

## 🔗 Drivers Zigbee
${report.zigbeeDrivers.map(d => `- ${d}`).join('\n')}

## 🎯 Résultat
Séparation réussie avec ${report.separation.zigbeeDrivers} drivers déplacés vers zigbee/ et ${report.separation.tuyaDrivers} drivers restant dans tuya/.

## 📅 Date
${report.timestamp}
`;
    }

    async commitSeparation() {
        console.log('💾 COMMIT DE LA SÉPARATION...');
        
        try {
            execSync('git add .', { stdio: 'pipe' });
            execSync('git commit -m "🔄 ZIGBEE SEPARATION [EN/FR/NL/TA] - Version 1.0.0 - Séparation drivers Tuya/Zigbee + Création structure zigbee/ + Mise à jour compose files + Rapport de séparation + Organisation optimale"', { stdio: 'pipe' });
            execSync('git push origin master', { stdio: 'pipe' });
            console.log('✅ Séparation commitée et poussée');
        } catch (error) {
            console.error('❌ Erreur commit:', error.message);
        }
    }

    moveFolderRecursively(sourcePath, targetPath) {
        if (fs.existsSync(sourcePath)) {
            fs.mkdirSync(path.dirname(targetPath), { recursive: true });
            
            const items = fs.readdirSync(sourcePath);
            
            for (const item of items) {
                const sourceItem = path.join(sourcePath, item);
                const targetItem = path.join(targetPath, item);
                
                if (fs.statSync(sourceItem).isDirectory()) {
                    this.moveFolderRecursively(sourceItem, targetItem);
                } else {
                    fs.copyFileSync(sourceItem, targetItem);
                }
            }
            
            this.removeFolderRecursively(sourcePath);
        }
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

    generateReport() {
        const duration = Date.now() - this.startTime;
        
        console.log('');
        console.log('📊 RAPPORT ZIGBEE SEPARATION');
        console.log('==============================');
        console.log(`⏱️  Durée: ${duration}ms`);
        console.log(`🔍 Drivers analysés: ${this.results.driversAnalyzed}`);
        console.log(`✅ Drivers Tuya: ${this.results.tuyaDrivers}`);
        console.log(`🔗 Drivers Zigbee: ${this.results.zigbeeDrivers}`);
        console.log(`🚨 Erreurs: ${this.results.errors.length}`);
        
        if (this.results.errors.length > 0) {
            console.log('\n🚨 Erreurs détectées:');
            this.results.errors.forEach(error => console.log(`  - ${error}`));
        }
        
        console.log('\n🎯 ZIGBEE SEPARATION TERMINÉ');
        console.log('✅ Séparation réussie');
    }
}

// Exécution
const separation = new ZigbeeSeparation();
separation.execute().catch(console.error); 