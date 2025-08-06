#!/usr/bin/env node

/**
 * 📊 DRIVER MATRIX GENERATOR
 * Version: 1.0.0
 * Date: 2025-08-05T08:19:29.736Z
 * 
 * Ce script analyse tous les drivers et génère automatiquement :
 * - drivers-matrix.md (pour GitHub)
 * - docs/dashboard.html (pour GitHub Pages)
 */

const fs = require('fs');
const path = require('path');

class DriverMatrixGenerator {
    constructor() {
        this.driversPath = './drivers';
        this.matrix = {
            total: 0,
            valid: 0,
            invalid: 0,
            enriched: 0,
            lite: 0,
            full: 0,
            categories: {},
            manufacturers: {},
            details: []
        };
    }

    async generateMatrix() {
        console.log('📊 DRIVER MATRIX GENERATOR - DÉMARRAGE');
        console.log('📅 Date:', new Date().toISOString());
        console.log('🎯 Objectif: Analyser tous les drivers et générer les matrices');
        console.log('');

        // Analyser tous les drivers
        await this.analyzeAllDrivers();
        
        // Générer drivers-matrix.md
        await this.generateMarkdownMatrix();
        
        // Générer dashboard HTML
        await this.generateDashboardHTML();
        
        console.log('');
        console.log('✅ DRIVER MATRIX GENERATOR - TERMINÉ');
        console.log(`📊 Résultats: ${this.matrix.total} drivers analysés, ${this.matrix.valid} valides`);
    }

    async analyzeAllDrivers() {
        console.log('🔍 ANALYSE DE TOUS LES DRIVERS...');
        
        const tuyaPath = path.join(this.driversPath, 'tuya');
        const zigbeePath = path.join(this.driversPath, 'zigbee');
        
        // Analyser les drivers Tuya
        if (fs.existsSync(tuyaPath)) {
            await this.analyzeDriverCategory(tuyaPath, 'tuya');
        }
        
        // Analyser les drivers Zigbee
        if (fs.existsSync(zigbeePath)) {
            await this.analyzeDriverCategory(zigbeePath, 'zigbee');
        }
        
        console.log(`📊 Total drivers analysés: ${this.matrix.total}`);
        console.log(`✅ Drivers valides: ${this.matrix.valid}`);
        console.log(`❌ Drivers invalides: ${this.matrix.invalid}`);
        console.log(`🧠 Drivers enrichis: ${this.matrix.enriched}`);
        console.log(`💡 Mode lite: ${this.matrix.lite}`);
        console.log(`🚀 Mode full: ${this.matrix.full}`);
        console.log('');
    }

    async analyzeDriverCategory(categoryPath, type) {
        const categories = fs.readdirSync(categoryPath);
        
        for (const category of categories) {
            const categoryFullPath = path.join(categoryPath, category);
            if (!fs.statSync(categoryFullPath).isDirectory()) continue;
            
            console.log(`📂 Analyse de la catégorie: ${type}/${category}`);
            
            const drivers = fs.readdirSync(categoryFullPath);
            for (const driver of drivers) {
                const driverPath = path.join(categoryFullPath, driver);
                if (!fs.statSync(driverPath).isDirectory()) continue;
                
                await this.analyzeDriver(driverPath, `${type}/${category}/${driver}`);
            }
        }
    }

    async analyzeDriver(driverPath, driverName) {
        this.matrix.total++;
        
        const composePath = path.join(driverPath, 'driver.compose.json');
        const devicePath = path.join(driverPath, 'device.js');
        
        const driverInfo = {
            name: driverName,
            path: driverPath,
            hasCompose: fs.existsSync(composePath),
            hasDevice: fs.existsSync(devicePath),
            isValid: false,
            isEnriched: false,
            mode: 'unknown',
            category: driverName.split('/')[1],
            manufacturer: this.extractManufacturer(driverName),
            capabilities: [],
            errors: []
        };
        
        // Vérifier driver.compose.json
        if (driverInfo.hasCompose) {
            try {
                const composeData = JSON.parse(fs.readFileSync(composePath, 'utf8'));
                driverInfo.isValid = this.validateComposeJSON(composeData);
                driverInfo.isEnriched = composeData.metadata?.enriched || false;
                driverInfo.mode = composeData.metadata?.mode || 'unknown';
                driverInfo.capabilities = composeData.capabilities || [];
                
                if (driverInfo.isValid) {
                    this.matrix.valid++;
                    if (driverInfo.isEnriched) this.matrix.enriched++;
                    if (driverInfo.mode === 'lite') this.matrix.lite++;
                    if (driverInfo.mode === 'full') this.matrix.full++;
                } else {
                    this.matrix.invalid++;
                    driverInfo.errors.push('Invalid JSON structure');
                }
            } catch (error) {
                this.matrix.invalid++;
                driverInfo.errors.push(`JSON Error: ${error.message}`);
            }
        } else {
            this.matrix.invalid++;
            driverInfo.errors.push('Missing driver.compose.json');
        }
        
        // Vérifier device.js
        if (!driverInfo.hasDevice) {
            this.matrix.invalid++;
            driverInfo.errors.push('Missing device.js');
        }
        
        // Mettre à jour les statistiques
        this.updateStatistics(driverInfo);
        
        // Ajouter aux détails
        this.matrix.details.push(driverInfo);
        
        const status = driverInfo.isValid ? '✅' : '❌';
        console.log(`  ${status} ${driverName}`);
    }

    validateComposeJSON(data) {
        const requiredFields = ['id', 'title', 'class', 'capabilities'];
        return requiredFields.every(field => data.hasOwnProperty(field));
    }

    extractManufacturer(driverName) {
        const parts = driverName.split('/');
        if (parts.length >= 3) {
            return parts[2].charAt(0).toUpperCase() + parts[2].slice(1);
        }
        return 'Unknown';
    }

    updateStatistics(driverInfo) {
        // Catégories
        if (!this.matrix.categories[driverInfo.category]) {
            this.matrix.categories[driverInfo.category] = 0;
        }
        this.matrix.categories[driverInfo.category]++;
        
        // Fabricants
        if (!this.matrix.manufacturers[driverInfo.manufacturer]) {
            this.matrix.manufacturers[driverInfo.manufacturer] = 0;
        }
        this.matrix.manufacturers[driverInfo.manufacturer]++;
    }

    async generateMarkdownMatrix() {
        console.log('📄 GÉNÉRATION DE DRIVERS-MATRIX.MD...');
        
        const markdown = this.generateMarkdownContent();
        fs.writeFileSync('./drivers-matrix.md', markdown);
        console.log('✅ drivers-matrix.md généré');
    }

    generateMarkdownContent() {
        return `# 📊 Drivers Matrix - Universal TUYA Zigbee Device App

## 📈 Statistiques Générales

| Métrique | Valeur |
|----------|--------|
| **Total Drivers** | ${this.matrix.total} |
| **Drivers Valides** | ${this.matrix.valid} |
| **Drivers Invalides** | ${this.matrix.invalid} |
| **Drivers Enrichis** | ${this.matrix.enriched} |
| **Mode Lite** | ${this.matrix.lite} |
| **Mode Full** | ${this.matrix.full} |
| **Taux de Validité** | ${((this.matrix.valid / this.matrix.total) * 100).toFixed(1)}% |

## 🧩 Répartition par Catégories

| Catégorie | Nombre |
|-----------|--------|
${Object.entries(this.matrix.categories)
    .sort(([,a], [,b]) => b - a)
    .map(([category, count]) => `| **${category}** | ${count} |`)
    .join('\n')}

## 🏭 Répartition par Fabricants

| Fabricant | Nombre |
|-----------|--------|
${Object.entries(this.matrix.manufacturers)
    .sort(([,a], [,b]) => b - a)
    .map(([manufacturer, count]) => `| **${manufacturer}** | ${count} |`)
    .join('\n')}

## 📋 Détails des Drivers

${this.matrix.details.map(driver => {
    const status = driver.isValid ? '✅' : '❌';
    const mode = driver.mode !== 'unknown' ? ` (${driver.mode})` : '';
    const enriched = driver.isEnriched ? ' 🧠' : '';
    return `- ${status} **${driver.name}**${mode}${enriched}`;
}).join('\n')}

## 🚀 Drivers avec Erreurs

${this.matrix.details
    .filter(driver => !driver.isValid)
    .map(driver => {
        return `### ❌ ${driver.name}
- **Erreurs**: ${driver.errors.join(', ')}
- **Chemin**: \`${driver.path}\``;
    }).join('\n\n')}

## 📅 Informations

- **Date de génération**: ${new Date().toISOString()}
- **Script**: generate-matrix.js
- **Version**: 1.0.0
- **Mode**: Analyse complète récursive

## 🎯 Objectif

Cette matrice est générée automatiquement pour maintenir une vue d'ensemble complète de l'écosystème Tuya Zigbee.

---
**📅 Généré**: ${new Date().toISOString()}
**🎯 Objectif**: Matrice complète des drivers
**✅ Statut**: **MATRICE GÉNÉRÉE**
**🚀 MEGA-PROMPT ULTIME - VERSION FINALE 2025**`;
    }

    async generateDashboardHTML() {
        console.log('📄 GÉNÉRATION DU DASHBOARD HTML...');
        
        // Créer le dossier docs s'il n'existe pas
        const docsDir = './docs';
        if (!fs.existsSync(docsDir)) {
            fs.mkdirSync(docsDir, { recursive: true });
        }
        
        const dashboardHTML = this.generateDashboardContent();
        fs.writeFileSync('./docs/dashboard.html', dashboardHTML);
        console.log('✅ docs/dashboard.html généré');
    }

    generateDashboardContent() {
        return `<!DOCTYPE html>
<html lang="fr">
<head>
    <meta charset="UTF-8">
    <meta name="viewport" content="width=device-width, initial-scale=1.0">
    <title>🚀 Universal TUYA Zigbee Device App - Dashboard</title>
    <style>
        * {
            margin: 0;
            padding: 0;
            box-sizing: border-box;
        }

        body {
            font-family: 'Segoe UI', Tahoma, Geneva, Verdana, sans-serif;
            background: linear-gradient(135deg, #667eea 0%, #764ba2 100%);
            min-height: 100vh;
            color: #333;
        }

        .container {
            max-width: 1200px;
            margin: 0 auto;
            padding: 20px;
        }

        .header {
            text-align: center;
            background: rgba(255, 255, 255, 0.95);
            border-radius: 15px;
            padding: 30px;
            margin-bottom: 30px;
            box-shadow: 0 10px 30px rgba(0, 0, 0, 0.1);
        }

        .header h1 {
            font-size: 2.5em;
            color: #2c3e50;
            margin-bottom: 10px;
        }

        .header p {
            font-size: 1.2em;
            color: #7f8c8d;
        }

        .stats-grid {
            display: grid;
            grid-template-columns: repeat(auto-fit, minmax(250px, 1fr));
            gap: 20px;
            margin-bottom: 30px;
        }

        .stat-card {
            background: rgba(255, 255, 255, 0.95);
            border-radius: 15px;
            padding: 25px;
            text-align: center;
            box-shadow: 0 5px 15px rgba(0, 0, 0, 0.1);
            transition: transform 0.3s ease;
        }

        .stat-card:hover {
            transform: translateY(-5px);
        }

        .stat-number {
            font-size: 2.5em;
            font-weight: bold;
            color: #3498db;
            margin-bottom: 10px;
        }

        .stat-label {
            font-size: 1.1em;
            color: #7f8c8d;
            text-transform: uppercase;
            letter-spacing: 1px;
        }

        .categories-section {
            background: rgba(255, 255, 255, 0.95);
            border-radius: 15px;
            padding: 30px;
            margin-bottom: 30px;
            box-shadow: 0 5px 15px rgba(0, 0, 0, 0.1);
        }

        .categories-section h2 {
            color: #2c3e50;
            margin-bottom: 20px;
            font-size: 1.8em;
        }

        .category-grid {
            display: grid;
            grid-template-columns: repeat(auto-fit, minmax(200px, 1fr));
            gap: 15px;
        }

        .category-card {
            background: #f8f9fa;
            border-radius: 10px;
            padding: 15px;
            text-align: center;
        }

        .category-name {
            font-weight: bold;
            color: #2c3e50;
            margin-bottom: 5px;
        }

        .category-count {
            color: #3498db;
            font-size: 1.2em;
            font-weight: bold;
        }

        .footer {
            text-align: center;
            background: rgba(255, 255, 255, 0.95);
            border-radius: 15px;
            padding: 20px;
            box-shadow: 0 5px 15px rgba(0, 0, 0, 0.1);
        }

        .footer p {
            color: #7f8c8d;
            margin-bottom: 10px;
        }

        .badge {
            display: inline-block;
            padding: 5px 10px;
            border-radius: 15px;
            font-size: 0.8em;
            font-weight: bold;
            margin: 2px;
        }

        .badge-success {
            background: #27ae60;
            color: white;
        }

        .badge-info {
            background: #3498db;
            color: white;
        }

        .badge-warning {
            background: #f39c12;
            color: white;
        }

        @media (max-width: 768px) {
            .container {
                padding: 10px;
            }
            
            .header h1 {
                font-size: 2em;
            }
            
            .stats-grid {
                grid-template-columns: 1fr;
            }
        }
    </style>
</head>
<body>
    <div class="container">
        <div class="header">
            <h1>🚀 Universal TUYA Zigbee Device App</h1>
            <p>Dashboard en temps réel - MEGA-PROMPT ULTIME - VERSION FINALE 2025</p>
            <div style="margin-top: 15px;">
                <span class="badge badge-success">✅ Fonctionnel</span>
                <span class="badge badge-info">📊 Live</span>
                <span class="badge badge-warning">🚀 MEGA-PROMPT</span>
            </div>
        </div>

        <div class="stats-grid">
            <div class="stat-card">
                <div class="stat-number">${this.matrix.total}</div>
                <div class="stat-label">Total Drivers</div>
            </div>
            <div class="stat-card">
                <div class="stat-number">${this.matrix.valid}</div>
                <div class="stat-label">Drivers Valides</div>
            </div>
            <div class="stat-card">
                <div class="stat-number">${this.matrix.enriched}</div>
                <div class="stat-label">Drivers Enrichis</div>
            </div>
            <div class="stat-card">
                <div class="stat-number">${Object.keys(this.matrix.categories).length}</div>
                <div class="stat-label">Catégories</div>
            </div>
        </div>

        <div class="categories-section">
            <h2>🧩 Répartition par Catégories</h2>
            <div class="category-grid">
                ${Object.entries(this.matrix.categories)
                    .sort(([,a], [,b]) => b - a)
                    .map(([category, count]) => `
                <div class="category-card">
                    <div class="category-name">${category}</div>
                    <div class="category-count">${count}</div>
                </div>
                `).join('')}
            </div>
        </div>

        <div class="footer">
            <p><strong>📅 Généré automatiquement</strong> - ${new Date().toLocaleString('fr-FR')}</p>
            <p><strong>🎯 Objectif</strong> - Dashboard en temps réel pour l'écosystème Tuya Zigbee</p>
            <p><strong>✅ Statut</strong> - DÉPLOIEMENT AUTOMATIQUE ACTIF</p>
            <p><strong>🚀 MEGA-PROMPT ULTIME - VERSION FINALE 2025</strong></p>
        </div>
    </div>

    <script>
        // Animation au chargement
        document.addEventListener('DOMContentLoaded', function() {
            const cards = document.querySelectorAll('.stat-card, .category-card');
            cards.forEach((card, index) => {
                setTimeout(() => {
                    card.style.opacity = '0';
                    card.style.transform = 'translateY(20px)';
                    card.style.transition = 'all 0.5s ease';
                    
                    setTimeout(() => {
                        card.style.opacity = '1';
                        card.style.transform = 'translateY(0)';
                    }, 100);
                }, index * 100);
            });
        });
    </script>
</body>
</html>`;
    }
}

// Exécution du script
async function main() {
    const generator = new DriverMatrixGenerator();
    await generator.generateMatrix();
}

if (require.main === module) {
    main().catch(console.error);
}

module.exports = DriverMatrixGenerator; 