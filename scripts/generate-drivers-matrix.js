// MEGA ULTIMATE ENHANCED - 2025-08-07T16:33:44.694Z
// Script amélioré avec liens corrigés et fonctionnalités étendues

#!/usr/bin/env node

const fs = require('fs');
const path = require('path');
const { execSync } = require('child_process');

console.log('📊 GÉNÉRATEUR MATRICE DRIVERS - GÉNÉRATION AUTOMATIQUE');
console.log('=' .repeat(70));

class GenerateDriversMatrix {
    constructor() {
        this.startTime = Date.now();
        this.report = {
            timestamp: new Date().toISOString(),
            driversAnalyzed: 0,
            validDrivers: 0,
            warningDrivers: 0,
            errorDrivers: 0,
            missingDrivers: 0,
            enrichedDrivers: 0,
            errors: [],
            warnings: [],
            solutions: []
        };
        this.driversMatrix = [];
    }

    async generateDriversMatrix() {
        console.log('🎯 Démarrage de la génération de la matrice des drivers...');
        
        try {
            // 1. Analyser tous les drivers
            await this.analyzeAllDrivers();
            
            // 2. Générer la matrice
            await this.generateMatrix();
            
            // 3. Créer le fichier Markdown
            await this.createMarkdownFile();
            
            // 4. Créer le fichier JSON
            await this.createJsonFile();
            
            // 5. Générer le rapport
            await this.generateReport();
            
            const duration = Date.now() - this.startTime;
            console.log(`✅ Génération terminée en ${duration}ms`);
            
        } catch (error) {
            console.error('❌ Erreur génération:', error.message);
            this.report.errors.push(error.message);
        }
    }

    async analyzeAllDrivers() {
        console.log('\n🔍 1. Analyse de tous les drivers...');
        
        const driversPath = path.join(__dirname, '..', 'drivers');
        const driverFiles = this.findDriverComposeFiles(driversPath);
        
        console.log(`    📁 Trouvé ${driverFiles.length} fichiers driver.compose.json`);
        
        for (const file of driverFiles) {
            try {
                const driverInfo = await this.analyzeDriver(file);
                this.driversMatrix.push(driverInfo);
                this.report.driversAnalyzed++;
                
                // Compter les statuts
                if (driverInfo.jsonStatus === 'valid' && driverInfo.jsStatus === 'valid') {
                    this.report.validDrivers++;
                } else if (driverInfo.jsonStatus === 'warning' || driverInfo.jsStatus === 'warning') {
                    this.report.warningDrivers++;
                } else if (driverInfo.jsonStatus === 'error' || driverInfo.jsStatus === 'error' || driverInfo.jsStatus === 'missing') {
                    this.report.errorDrivers++;
                } else {
                    this.report.missingDrivers++;
                }
                
                if (driverInfo.enriched) {
                    this.report.enrichedDrivers++;
                }
                
                console.log(`      ✅ Analysé: ${driverInfo.name} (${driverInfo.type})`);
                
            } catch (error) {
                console.error(`      ❌ Erreur analyse ${file}:`, error.message);
                this.report.errors.push(`Erreur ${file}: ${error.message}`);
            }
        }
        
        console.log(`  📊 Total drivers analysés: ${this.report.driversAnalyzed}`);
    }

    async analyzeDriver(filePath) {
        const relativePath = path.relative(path.join(__dirname, '..'), filePath);
        const dirPath = path.dirname(filePath);
        const driverName = path.basename(dirPath);
        
        // Lire le fichier driver.compose.json
        let jsonStatus = 'missing';
        let driverData = null;
        
        try {
            const content = fs.readFileSync(filePath, 'utf8');
            driverData = JSON.parse(content);
            jsonStatus = 'valid';
        } catch (error) {
            jsonStatus = 'error';
        }
        
        // Vérifier la présence du driver.js
        const driverJsPath = path.join(dirPath, 'driver.js');
        let jsStatus = 'missing';
        
        if (fs.existsSync(driverJsPath)) {
            jsStatus = 'valid';
        }
        
        // Déterminer le type de driver
        let driverType = 'unknown';
        if (driverData && driverData.class) {
            driverType = driverData.class;
        }
        
        // Vérifier l'enrichissement
        let enriched = false;
        if (driverData && driverData.metadata && driverData.metadata.enriched) {
            enriched = true;
        }
        
        // Déterminer le mode
        let mode = 'lite';
        if (enriched || (driverData && driverData.metadata && driverData.metadata.megaPromptVersion)) {
            mode = 'full';
        }
        
        return {
            type: driverType,
            name: driverData ? (driverData.name ? driverData.name.en || driverData.name : driverName) : driverName,
            path: relativePath,
            jsonStatus: jsonStatus,
            jsStatus: jsStatus,
            enriched: enriched,
            mode: mode,
            capabilities: driverData ? (driverData.capabilities || []) : [],
            clusters: driverData ? (driverData.clusters || []) : [],
            manufacturer: driverData ? (driverData.manufacturername || 'Unknown') : 'Unknown',
            model: driverData ? (driverData.model || 'Unknown') : 'Unknown'
        };
    }

    findDriverComposeFiles(dir) {
        const files = [];
        
        if (!fs.existsSync(dir)) {
            return files;
        }
        
        const items = fs.readdirSync(dir);
        
        for (const item of items) {
            const fullPath = path.join(dir, item);
            const stat = fs.statSync(fullPath);
            
            if (stat.isDirectory()) {
                files.push(...this.findDriverComposeFiles(fullPath));
            } else if (item === 'driver.compose.json') {
                files.push(fullPath);
            }
        }
        
        return files;
    }

    async generateMatrix() {
        console.log('\n📊 2. Génération de la matrice...');
        
        // Trier les drivers par type puis par nom
        this.driversMatrix.sort((a, b) => {
            if (a.type !== b.type) {
                return a.type.localeCompare(b.type);
            }
            return a.name.localeCompare(b.name);
        });
        
        console.log(`    ✅ Matrice générée avec ${this.driversMatrix.length} drivers`);
    }

    async createMarkdownFile() {
        console.log('\n📝 3. Création du fichier Markdown...');
        
        const markdownContent = this.generateMarkdownContent();
        const markdownPath = path.join(__dirname, '..', 'drivers-matrix.md');
        fs.writeFileSync(markdownPath, markdownContent);
        
        console.log(`    ✅ Fichier Markdown créé: ${markdownPath}`);
    }

    generateMarkdownContent() {
        let content = `# 📊 Matrice des Drivers - Universal TUYA Zigbee Device App

## 📅 Date
**${new Date().toLocaleString('fr-FR')}**

## 🎯 Objectif
**Matrice complète des drivers disponibles avec leur statut de validation**

## 📊 Statistiques Globales

| Métrique | Nombre | Pourcentage |
|----------|--------|-------------|
| **Total Drivers** | ${this.report.driversAnalyzed} | 100% |
| **Validés** | ${this.report.validDrivers} | ${this.calculatePercentage(this.report.validDrivers, this.report.driversAnalyzed)}% |
| **Avertissements** | ${this.report.warningDrivers} | ${this.calculatePercentage(this.report.warningDrivers, this.report.driversAnalyzed)}% |
| **Erreurs** | ${this.report.errorDrivers} | ${this.calculatePercentage(this.report.errorDrivers, this.report.driversAnalyzed)}% |
| **Manquants** | ${this.report.missingDrivers} | ${this.calculatePercentage(this.report.missingDrivers, this.report.driversAnalyzed)}% |
| **Enrichis** | ${this.report.enrichedDrivers} | ${this.calculatePercentage(this.report.enrichedDrivers, this.report.driversAnalyzed)}% |

## 📋 Matrice Détaillée

| Type | Nom | Chemin | JSON | JS | Enrichi | Mode | Fabricant | Modèle |
|------|-----|--------|------|----|---------|------|-----------|--------|
`;

        for (const driver of this.driversMatrix) {
            const jsonStatus = this.getStatusEmoji(driver.jsonStatus);
            const jsStatus = this.getStatusEmoji(driver.jsStatus);
            const enrichedStatus = driver.enriched ? '✅' : '❌';
            
            content += `| ${driver.type} | ${driver.name} | \`${driver.path}\` | ${jsonStatus} | ${jsStatus} | ${enrichedStatus} | ${driver.mode} | ${driver.manufacturer} | ${driver.model} |\n`;
        }

        content += `
## 🚀 Fonctionnalités par Type

`;

        // Grouper par type
        const driversByType = {};
        for (const driver of this.driversMatrix) {
            if (!driversByType[driver.type]) {
                driversByType[driver.type] = [];
            }
            driversByType[driver.type].push(driver);
        }

        for (const [type, drivers] of Object.entries(driversByType)) {
            const validCount = drivers.filter(d => d.jsonStatus === 'valid' && d.jsStatus === 'valid').length;
            const enrichedCount = drivers.filter(d => d.enriched).length;
            
            content += `### ${type.charAt(0).toUpperCase() + type.slice(1)}s (${drivers.length} drivers)
- **Validés**: ${validCount}/${drivers.length}
- **Enrichis**: ${enrichedCount}/${drivers.length}
- **Capabilities**: ${this.getUniqueCapabilities(drivers).join(', ')}
- **Clusters**: ${this.getUniqueClusters(drivers).join(', ')}

`;
        }

        content += `## 🎯 MEGA-PROMPT ULTIME - VERSION FINALE 2025

**✅ MATRICE DES DRIVERS GÉNÉRÉE AUTOMATIQUEMENT !**

---
**📅 Généré**: ${new Date().toISOString()}
**🎯 Objectif**: Matrice des drivers complète
**✅ Statut**: **MATRICE GÉNÉRÉE**
**🚀 MEGA-PROMPT ULTIME - VERSION FINALE 2025**
`;

        return content;
    }

    async createJsonFile() {
        console.log('\n📄 4. Création du fichier JSON...');
        
        const jsonContent = {
            timestamp: new Date().toISOString(),
            statistics: {
                totalDrivers: this.report.driversAnalyzed,
                validDrivers: this.report.validDrivers,
                warningDrivers: this.report.warningDrivers,
                errorDrivers: this.report.errorDrivers,
                missingDrivers: this.report.missingDrivers,
                enrichedDrivers: this.report.enrichedDrivers
            },
            drivers: this.driversMatrix
        };
        
        const jsonPath = path.join(__dirname, '..', 'drivers-matrix.json');
        fs.writeFileSync(jsonPath, JSON.stringify(jsonContent, null, 2));
        
        console.log(`    ✅ Fichier JSON créé: ${jsonPath}`);
    }

    async generateReport() {
        console.log('\n📊 5. Génération du rapport...');
        
        const report = `# 📊 RAPPORT GÉNÉRATION MATRICE DRIVERS

## 📅 Date
**${new Date().toLocaleString('fr-FR')}**

## 🎯 Objectif
**Génération automatique de la matrice des drivers**

## 📊 Résultats de la Génération
- **Drivers analysés**: ${this.report.driversAnalyzed}
- **Drivers validés**: ${this.report.validDrivers}
- **Drivers avec avertissements**: ${this.report.warningDrivers}
- **Drivers avec erreurs**: ${this.report.errorDrivers}
- **Drivers manquants**: ${this.report.missingDrivers}
- **Drivers enrichis**: ${this.report.enrichedDrivers}
- **Erreurs**: ${this.report.errors.length}
- **Avertissements**: ${this.report.warnings.length}

## ✅ Fichiers Générés
- **drivers-matrix.md**: Matrice complète en Markdown
- **drivers-matrix.json**: Données structurées en JSON
- **Rapport de génération**: Ce fichier

## 🎯 MEGA-PROMPT ULTIME - VERSION FINALE 2025
**✅ GÉNÉRATION MATRICE DRIVERS RÉALISÉE AVEC SUCCÈS !**

---
**📅 Généré**: ${new Date().toISOString()}
**🎯 Objectif**: Génération matrice drivers
**✅ Statut**: **GÉNÉRATION RÉALISÉE AVEC SUCCÈS**
**🚀 MEGA-PROMPT ULTIME - VERSION FINALE 2025**
`;

        const reportPath = path.join(__dirname, '../GENERATION-MATRICE-DRIVERS-REPORT.md');
        fs.writeFileSync(reportPath, report);
        
        console.log(`✅ Rapport de génération créé: ${reportPath}`);
    }

    // Méthodes utilitaires
    calculatePercentage(value, total) {
        if (total === 0) return 0;
        return Math.round((value / total) * 100);
    }

    getStatusEmoji(status) {
        switch (status) {
            case 'valid': return '✅';
            case 'warning': return '⚠️';
            case 'error': return '❌';
            case 'missing': return '❓';
            default: return '❓';
        }
    }

    getUniqueCapabilities(drivers) {
        const capabilities = new Set();
        for (const driver of drivers) {
            for (const capability of driver.capabilities) {
                capabilities.add(capability);
            }
        }
        return Array.from(capabilities).sort();
    }

    getUniqueClusters(drivers) {
        const clusters = new Set();
        for (const driver of drivers) {
            for (const cluster of driver.clusters) {
                clusters.add(cluster);
            }
        }
        return Array.from(clusters).sort();
    }
}

// Exécution
const generateur = new GenerateDriversMatrix();
generateur.generateDriversMatrix().catch(console.error); 