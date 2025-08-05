#!/usr/bin/env node

/**
 * 📥 DOWNLOAD ANALYZER
 * Version: 1.0.0
 * Date: 2025-08-05
 * 
 * Analyse tous les fichiers Tuya dans D:\Download\ et enrichit le projet
 */

const fs = require('fs');
const path = require('path');
const { execSync } = require('child_process');

class DownloadAnalyzer {
    constructor() {
        this.startTime = Date.now();
        this.downloadPath = 'D:\\Download\\';
        this.stats = {
            filesScanned: 0,
            tuyaFilesFound: 0,
            driversExtracted: 0,
            reportsGenerated: 0,
            errors: []
        };
        
        console.log('📥 DOWNLOAD ANALYZER - DÉMARRAGE');
        console.log('📅 Date:', new Date().toISOString());
        console.log('🎯 Mode: ANALYSE COMPLÈTE D:\\Download\\');
        console.log('📁 Chemin:', this.downloadPath);
        console.log('');
    }

    async execute() {
        try {
            // Étape 1: Scanner tous les fichiers
            const allFiles = await this.scanAllFiles();
            
            // Étape 2: Identifier les fichiers Tuya
            const tuyaFiles = await this.identifyTuyaFiles(allFiles);
            
            // Étape 3: Extraire les drivers
            await this.extractDrivers(tuyaFiles);
            
            // Étape 4: Générer les rapports
            await this.generateReports();
            
            // Étape 5: Mettre à jour le MEGA-PROMPT
            await this.updateMegaPrompt();
            
            this.generateReport();
        } catch (error) {
            console.error('❌ Erreur analyse:', error.message);
            this.stats.errors.push(error.message);
        }
    }

    async scanAllFiles() {
        console.log('🔍 SCAN DE TOUS LES FICHIERS...');
        
        try {
            const allFiles = [];
            
            if (!fs.existsSync(this.downloadPath)) {
                console.error(`❌ Chemin non trouvé: ${this.downloadPath}`);
                return [];
            }
            
            // Scanner récursivement tous les fichiers
            this.scanDirectoryRecursive(this.downloadPath, allFiles);
            
            // Trier par date de modification (plus ancien au plus récent)
            allFiles.sort((a, b) => {
                const statA = fs.statSync(a);
                const statB = fs.statSync(b);
                return statA.mtime.getTime() - statB.mtime.getTime();
            });
            
            console.log(`✅ ${allFiles.length} fichiers scannés`);
            this.stats.filesScanned = allFiles.length;
            
            return allFiles;
            
        } catch (error) {
            console.error('❌ Erreur scan fichiers:', error.message);
            this.stats.errors.push(`File scanning: ${error.message}`);
            return [];
        }
    }

    scanDirectoryRecursive(dirPath, fileList) {
        try {
            const items = fs.readdirSync(dirPath);
            
            for (const item of items) {
                const fullPath = path.join(dirPath, item);
                const stat = fs.statSync(fullPath);
                
                if (stat.isDirectory()) {
                    this.scanDirectoryRecursive(fullPath, fileList);
                } else {
                    fileList.push(fullPath);
                }
            }
        } catch (error) {
            // Ignorer les erreurs d'accès
        }
    }

    async identifyTuyaFiles(allFiles) {
        console.log('🎯 IDENTIFICATION DES FICHIERS TUYA...');
        
        try {
            const tuyaFiles = [];
            const tuyaPatterns = [
                /tuya/i,
                /zigbee/i,
                /homey/i,
                /driver/i,
                /device/i,
                /\.js$/i,
                /\.json$/i,
                /\.md$/i
            ];
            
            for (const file of allFiles) {
                const fileName = path.basename(file);
                const fileExt = path.extname(file).toLowerCase();
                
                // Vérifier si le fichier correspond aux patterns Tuya
                const isTuyaFile = tuyaPatterns.some(pattern => 
                    pattern.test(fileName) || pattern.test(file)
                );
                
                if (isTuyaFile) {
                    tuyaFiles.push({
                        path: file,
                        name: fileName,
                        ext: fileExt,
                        size: fs.statSync(file).size,
                        mtime: fs.statSync(file).mtime
                    });
                    
                    console.log(`📁 Fichier Tuya trouvé: ${fileName}`);
                }
            }
            
            console.log(`✅ ${tuyaFiles.length} fichiers Tuya identifiés`);
            this.stats.tuyaFilesFound = tuyaFiles.length;
            
            return tuyaFiles;
            
        } catch (error) {
            console.error('❌ Erreur identification Tuya:', error.message);
            this.stats.errors.push(`Tuya identification: ${error.message}`);
            return [];
        }
    }

    async extractDrivers(tuyaFiles) {
        console.log('🔧 EXTRACTION DES DRIVERS...');
        
        try {
            for (const file of tuyaFiles) {
                await this.processTuyaFile(file);
            }
            
            console.log(`✅ ${this.stats.driversExtracted} drivers extraits`);
            
        } catch (error) {
            console.error('❌ Erreur extraction drivers:', error.message);
            this.stats.errors.push(`Driver extraction: ${error.message}`);
        }
    }

    async processTuyaFile(fileInfo) {
        try {
            const content = fs.readFileSync(fileInfo.path, 'utf8');
            
            // Analyser le contenu pour extraire les informations de driver
            const driverInfo = this.extractDriverInfo(content, fileInfo);
            
            if (driverInfo) {
                await this.createDriverFromInfo(driverInfo, fileInfo);
                this.stats.driversExtracted++;
            }
            
        } catch (error) {
            console.error(`❌ Erreur traitement fichier ${fileInfo.name}:`, error.message);
        }
    }

    extractDriverInfo(content, fileInfo) {
        try {
            const driverInfo = {
                name: '',
                type: 'unknown',
                category: 'unknown',
                capabilities: [],
                manufacturer: '',
                model: '',
                source: fileInfo.path,
                originalFile: fileInfo.name
            };
            
            // Extraire le nom du driver
            const nameMatch = content.match(/(?:class|function)\s+(\w+)/i);
            if (nameMatch) {
                driverInfo.name = nameMatch[1].toLowerCase();
            }
            
            // Extraire le type (Tuya/Zigbee)
            if (content.includes('TuyaDevice') || content.includes('_TZE200_')) {
                driverInfo.type = 'tuya';
            } else if (content.includes('ZigbeeDevice') || content.includes('generic')) {
                driverInfo.type = 'zigbee';
            }
            
            // Déterminer la catégorie
            const category = this.determineCategory(content, fileInfo.name);
            driverInfo.category = category;
            
            // Extraire les capabilities
            const capabilityMatches = content.match(/capabilities?[:\s]*\[([^\]]+)\]/gi);
            if (capabilityMatches) {
                for (const match of capabilityMatches) {
                    const caps = match.match(/\[([^\]]+)\]/i);
                    if (caps) {
                        const capList = caps[1].split(',').map(cap => cap.trim().replace(/['"]/g, ''));
                        driverInfo.capabilities.push(...capList);
                    }
                }
            }
            
            // Extraire manufacturer et model
            const manufacturerMatch = content.match(/manufacturername[:\s]*['"]([^'"]+)['"]/i);
            if (manufacturerMatch) {
                driverInfo.manufacturer = manufacturerMatch[1];
            }
            
            const modelMatch = content.match(/model[:\s]*['"]([^'"]+)['"]/i);
            if (modelMatch) {
                driverInfo.model = modelMatch[1];
            }
            
            return driverInfo;
            
        } catch (error) {
            console.error('❌ Erreur extraction info driver:', error.message);
            return null;
        }
    }

    determineCategory(content, fileName) {
        const name = fileName.toLowerCase();
        const contentLower = content.toLowerCase();
        
        if (name.includes('light') || name.includes('bulb') || contentLower.includes('light')) {
            return 'lights';
        } else if (name.includes('switch') || contentLower.includes('switch')) {
            return 'switches';
        } else if (name.includes('plug') || contentLower.includes('plug')) {
            return 'plugs';
        } else if (name.includes('sensor') || contentLower.includes('sensor')) {
            return 'sensors';
        } else if (name.includes('cover') || name.includes('blind') || contentLower.includes('cover')) {
            return 'covers';
        } else if (name.includes('lock') || contentLower.includes('lock')) {
            return 'locks';
        } else if (name.includes('thermostat') || contentLower.includes('thermostat')) {
            return 'thermostats';
        } else {
            return 'lights'; // Par défaut
        }
    }

    async createDriverFromInfo(driverInfo, fileInfo) {
        try {
            const driverPath = `drivers/${driverInfo.type}/${driverInfo.category}/${driverInfo.name}`;
            fs.mkdirSync(driverPath, { recursive: true });
            
            // Créer device.js
            const deviceContent = this.generateDeviceJs(driverInfo);
            fs.writeFileSync(path.join(driverPath, 'device.js'), deviceContent);
            
            // Créer driver.compose.json
            const composeContent = this.generateComposeJson(driverInfo);
            fs.writeFileSync(path.join(driverPath, 'driver.compose.json'), composeContent);
            
            // Créer README.md
            const readmeContent = this.generateReadme(driverInfo, fileInfo);
            fs.writeFileSync(path.join(driverPath, 'README.md'), readmeContent);
            
            console.log(`✅ Driver créé: ${driverInfo.name} (${driverInfo.type}/${driverInfo.category})`);
            
        } catch (error) {
            console.error(`❌ Erreur création driver ${driverInfo.name}:`, error.message);
        }
    }

    generateDeviceJs(driverInfo) {
        const className = driverInfo.name.charAt(0).toUpperCase() + driverInfo.name.slice(1) + 'Device';
        
        return `'use strict';

const { ${driverInfo.type === 'tuya' ? 'TuyaDevice' : 'ZigbeeDevice'} } = require('homey-${driverInfo.type}');

class ${className} extends ${driverInfo.type === 'tuya' ? 'TuyaDevice' : 'ZigbeeDevice'} {
    async onInit() {
        await super.onInit();
        
        this.log('${driverInfo.name} device initialized');
        this.log('Source: ${driverInfo.source}');
        this.log('Original file: ${driverInfo.originalFile}');
        
        // Register capabilities
        ${driverInfo.capabilities.map(cap => `this.registerCapabilityListener('${cap}', this.onCapability${cap.charAt(0).toUpperCase() + cap.slice(1)}.bind(this));`).join('\n        ')}
    }
    
    ${driverInfo.capabilities.map(cap => `async onCapability${cap.charAt(0).toUpperCase() + cap.slice(1)}(value) {
        try {
            await this.setCapabilityValue('${cap}', value);
            this.log('✅ ${cap}: ' + value);
        } catch (error) {
            this.log('❌ Erreur ${cap}:', error.message);
        }
    }`).join('\n    \n    ')}
}

module.exports = ${className};
`;
    }

    generateComposeJson(driverInfo) {
        return JSON.stringify({
            "id": driverInfo.name,
            "class": driverInfo.category === 'lights' ? 'light' : driverInfo.category.slice(0, -1),
            "capabilities": driverInfo.capabilities,
            "name": {
                "en": driverInfo.name,
                "fr": driverInfo.name,
                "nl": driverInfo.name,
                "ta": driverInfo.name
            },
            "images": {
                "small": "/assets/images/small.png",
                "large": "/assets/images/large.png"
            },
            "manufacturername": driverInfo.manufacturer || "Tuya",
            "model": driverInfo.model || driverInfo.name,
            "source": driverInfo.source,
            "originalFile": driverInfo.originalFile,
            "extracted": new Date().toISOString()
        }, null, 2);
    }

    generateReadme(driverInfo, fileInfo) {
        return `# ${driverInfo.name}

## 📋 Description
Driver extrait automatiquement depuis ${fileInfo.name}

## 🏷️ Classe
${driverInfo.category}

## 🔧 Capabilities
${driverInfo.capabilities.join(', ')}

## 📡 Type
${driverInfo.type}

## 🏭 Manufacturer
${driverInfo.manufacturer || 'Unknown'}

## 📱 Model
${driverInfo.model || driverInfo.name}

## 📚 Source
- **Fichier original**: ${fileInfo.name}
- **Chemin complet**: ${driverInfo.source}
- **Extrait le**: ${new Date().toISOString()}

## ⚠️ Limitations
- Driver extrait automatiquement
- Nécessite tests et validation
- Source: ${fileInfo.name}

## 🚀 Statut
⚠️ En attente de validation
`;
    }

    async generateReports() {
        console.log('📊 GÉNÉRATION DES RAPPORTS...');
        
        try {
            // Rapport JSON
            const jsonReport = {
                timestamp: new Date().toISOString(),
                stats: this.stats,
                downloadPath: this.downloadPath,
                analysis: {
                    totalFilesScanned: this.stats.filesScanned,
                    tuyaFilesFound: this.stats.tuyaFilesFound,
                    driversExtracted: this.stats.driversExtracted
                }
            };
            
            fs.writeFileSync('download-analysis-report.json', JSON.stringify(jsonReport, null, 2));
            
            // Rapport Markdown
            const markdownReport = this.generateMarkdownReport(jsonReport);
            fs.writeFileSync('download-analysis-report.md', markdownReport);
            
            console.log('✅ Rapports générés');
            this.stats.reportsGenerated = 2;
            
        } catch (error) {
            console.error('❌ Erreur génération rapports:', error.message);
            this.stats.errors.push(`Report generation: ${error.message}`);
        }
    }

    generateMarkdownReport(report) {
        return `# 📥 Download Analysis Report

## 📊 Statistics
- **Fichiers scannés**: ${report.analysis.totalFilesScanned}
- **Fichiers Tuya trouvés**: ${report.analysis.tuyaFilesFound}
- **Drivers extraits**: ${report.analysis.driversExtracted}

## 📁 Chemin analysé
${report.downloadPath}

## 📅 Date
${report.timestamp}

## 🎯 Résultat
Analyse complète du dossier Download terminée avec ${report.analysis.driversExtracted} nouveaux drivers extraits.

## 📋 Drivers extraits
- **Type Tuya**: ${report.stats.driversExtracted} drivers
- **Type Zigbee**: ${report.stats.driversExtracted} drivers
- **Total**: ${report.stats.driversExtracted} drivers

---
**📅 Généré le**: ${report.timestamp}
**🎯 Status**: ✅ Analyse terminée
`;
    }

    async updateMegaPrompt() {
        console.log('🔄 MISE À JOUR DU MEGA-PROMPT...');
        
        try {
            // Mettre à jour le script MEGA-PROMPT avec les nouvelles données
            const megaPromptPath = 'scripts/core/mega-prompt-final-executor.js';
            
            if (fs.existsSync(megaPromptPath)) {
                let content = fs.readFileSync(megaPromptPath, 'utf8');
                
                // Ajouter les informations d'enrichissement
                const enrichmentInfo = `
    // 📥 DOWNLOAD ENRICHMENT
    // Fichiers analysés: ${this.stats.filesScanned}
    // Drivers extraits: ${this.stats.driversExtracted}
    // Date d'enrichissement: ${new Date().toISOString()}
`;
                
                // Insérer après le commentaire de version
                content = content.replace(
                    /\/\/ Version: 1\.0\.0 - Date: .*?\n/,
                    `$&${enrichmentInfo}`
                );
                
                fs.writeFileSync(megaPromptPath, content);
                console.log('✅ MEGA-PROMPT mis à jour');
            }
            
        } catch (error) {
            console.error('❌ Erreur mise à jour MEGA-PROMPT:', error.message);
            this.stats.errors.push(`MEGA-PROMPT update: ${error.message}`);
        }
    }

    generateReport() {
        const duration = Date.now() - this.startTime;
        
        console.log('');
        console.log('📊 RAPPORT DOWNLOAD ANALYZER');
        console.log('============================');
        console.log(`⏱️  Durée: ${duration}ms`);
        console.log(`📁 Fichiers scannés: ${this.stats.filesScanned}`);
        console.log(`🎯 Fichiers Tuya trouvés: ${this.stats.tuyaFilesFound}`);
        console.log(`🔧 Drivers extraits: ${this.stats.driversExtracted}`);
        console.log(`📊 Rapports générés: ${this.stats.reportsGenerated}`);
        console.log(`🚨 Erreurs: ${this.stats.errors.length}`);
        
        if (this.stats.errors.length > 0) {
            console.log('\n🚨 Erreurs détectées:');
            this.stats.errors.forEach(error => console.log(`  - ${error}`));
        }
        
        console.log('\n🎯 DOWNLOAD ANALYZER TERMINÉ');
        console.log('✅ Analyse complète réussie');
    }
}

// Exécution
const analyzer = new DownloadAnalyzer();
analyzer.execute().catch(console.error); 