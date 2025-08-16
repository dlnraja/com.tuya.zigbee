#!/usr/bin/env node
'use strict';

/**
 * 🌐 Module de Construction du Dashboard - Version 3.5.0
 * Construction unifiée du dashboard web pour la gestion des drivers
 */

const fs = require('fs');
const path = require('path');

class DashboardBuilder {
  constructor() {
    this.config = {
      version: '3.5.0',
      outputDir: 'docs',
      templateDir: 'tools/templates',
      assetsDir: 'assets'
    };
    
    this.stats = {
      drivers: 0,
      capabilities: 0,
      classes: 0,
      manufacturers: 0,
      generatedFiles: []
    };
  }

  async run() {
    console.log('🌐 Construction du dashboard...');
    
    try {
      await this.ensureOutputDirectory();
      await this.loadMatrixData();
      await this.buildMainDashboard();
      await this.buildDriverPages();
      await this.buildCapabilityPages();
      await this.buildClassPages();
      await this.buildManufacturerPages();
      await this.copyAssets();
      await this.generateSitemap();
      await this.generateSummary();
      
      console.log('✅ Construction du dashboard terminée avec succès');
    } catch (error) {
      console.error('❌ Erreur lors de la construction du dashboard:', error.message);
      throw error;
    }
  }

  /**
   * 📁 Création du répertoire de sortie
   */
  async ensureOutputDirectory() {
    if (!fs.existsSync(this.config.outputDir)) {
      fs.mkdirSync(this.config.outputDir, { recursive: true });
    }
    
    // Création des sous-répertoires
    const subDirs = ['drivers', 'capabilities', 'classes', 'manufacturers', 'assets', 'data'];
    for (const subDir of subDirs) {
      const fullPath = path.join(this.config.outputDir, subDir);
      if (!fs.existsSync(fullPath)) {
        fs.mkdirSync(fullPath, { recursive: true });
      }
    }
    
    console.log(`  📁 Répertoire de sortie: ${this.config.outputDir}`);
  }

  /**
   * 📊 Chargement des données des matrices
   */
  async loadMatrixData() {
    console.log('  📊 Chargement des données...');
    
    const matricesDir = 'matrices';
    
    try {
      // Chargement de la matrice des drivers
      const driverMatrixPath = path.join(matricesDir, 'driver_matrix.json');
      if (fs.existsSync(driverMatrixPath)) {
        this.driverMatrix = JSON.parse(fs.readFileSync(driverMatrixPath, 'utf8'));
        this.stats.drivers = this.driverMatrix.drivers?.length || 0;
      }
      
      // Chargement de la matrice des capacités
      const capabilityMatrixPath = path.join(matricesDir, 'capability_matrix.json');
      if (fs.existsSync(capabilityMatrixPath)) {
        this.capabilityMatrix = JSON.parse(fs.readFileSync(capabilityMatrixPath, 'utf8'));
        this.stats.capabilities = this.capabilityMatrix.capabilities?.length || 0;
      }
      
      // Chargement de la matrice des classes
      const classMatrixPath = path.join(matricesDir, 'class_matrix.json');
      if (fs.existsSync(classMatrixPath)) {
        this.classMatrix = JSON.parse(fs.readFileSync(classMatrixPath, 'utf8'));
        this.stats.classes = this.classMatrix.classes?.length || 0;
      }
      
      // Chargement de la matrice des fabricants
      const manufacturerMatrixPath = path.join(matricesDir, 'manufacturer_matrix.json');
      if (fs.existsSync(manufacturerMatrixPath)) {
        this.manufacturerMatrix = JSON.parse(fs.readFileSync(manufacturerMatrixPath, 'utf8'));
        this.stats.manufacturers = this.manufacturerMatrix.manufacturers?.length || 0;
      }
      
      console.log(`    📊 Données chargées: ${this.stats.drivers} drivers, ${this.stats.capabilities} capacités`);
    } catch (error) {
      console.warn('    ⚠️ Erreur lors du chargement des matrices:', error.message);
    }
  }

  /**
   * 🏠 Construction du dashboard principal
   */
  async buildMainDashboard() {
    console.log('  🏠 Construction du dashboard principal...');
    
    const html = this.generateMainDashboardHTML();
    const outputPath = path.join(this.config.outputDir, 'index.html');
    fs.writeFileSync(outputPath, html);
    
    this.stats.generatedFiles.push(outputPath);
    console.log(`    📄 Dashboard principal: ${outputPath}`);
  }

  /**
   * 🚗 Construction des pages des drivers
   */
  async buildDriverPages() {
    console.log('  🚗 Construction des pages des drivers...');
    
    if (!this.driverMatrix?.drivers) return;
    
    // Page de liste des drivers
    const driversListHTML = this.generateDriversListHTML();
    const driversListPath = path.join(this.config.outputDir, 'drivers', 'index.html');
    fs.writeFileSync(driversListPath, driversListHTML);
    this.stats.generatedFiles.push(driversListPath);
    
    // Pages individuelles des drivers
    for (const driver of this.driverMatrix.drivers) {
      const driverHTML = this.generateDriverPageHTML(driver);
      const driverPath = path.join(this.config.outputDir, 'drivers', `${driver.id}.html`);
      fs.writeFileSync(driverPath, driverHTML);
      this.stats.generatedFiles.push(driverPath);
    }
    
    console.log(`    📄 Pages des drivers: ${this.driverMatrix.drivers.length + 1} fichiers`);
  }

  /**
   * ⚡ Construction des pages des capacités
   */
  async buildCapabilityPages() {
    console.log('  ⚡ Construction des pages des capacités...');
    
    if (!this.capabilityMatrix?.capabilities) return;
    
    // Page de liste des capacités
    const capabilitiesListHTML = this.generateCapabilitiesListHTML();
    const capabilitiesListPath = path.join(this.config.outputDir, 'capabilities', 'index.html');
    fs.writeFileSync(capabilitiesListPath, capabilitiesListHTML);
    this.stats.generatedFiles.push(capabilitiesListPath);
    
    // Pages individuelles des capacités
    for (const capability of this.capabilityMatrix.capabilities) {
      const capabilityHTML = this.generateCapabilityPageHTML(capability);
      const capabilityPath = path.join(this.config.outputDir, 'capabilities', `${capability.name}.html`);
      fs.writeFileSync(capabilityPath, capabilityHTML);
      this.stats.generatedFiles.push(capabilityPath);
    }
    
    console.log(`    📄 Pages des capacités: ${this.capabilityMatrix.capabilities.length + 1} fichiers`);
  }

  /**
   * 🏷️ Construction des pages des classes
   */
  async buildClassPages() {
    console.log('  🏷️ Construction des pages des classes...');
    
    if (!this.classMatrix?.classes) return;
    
    // Page de liste des classes
    const classesListHTML = this.generateClassesListHTML();
    const classesListPath = path.join(this.config.outputDir, 'classes', 'index.html');
    fs.writeFileSync(classesListPath, classesListHTML);
    this.stats.generatedFiles.push(classesListPath);
    
    // Pages individuelles des classes
    for (const classInfo of this.classMatrix.classes) {
      const classHTML = this.generateClassPageHTML(classInfo);
      const classPath = path.join(this.config.outputDir, 'classes', `${classInfo.name}.html`);
      fs.writeFileSync(classPath, classHTML);
      this.stats.generatedFiles.push(classPath);
    }
    
    console.log(`    📄 Pages des classes: ${this.classMatrix.classes.length + 1} fichiers`);
  }

  /**
   * 🏭 Construction des pages des fabricants
   */
  async buildManufacturerPages() {
    console.log('  🏭 Construction des pages des fabricants...');
    
    if (!this.manufacturerMatrix?.manufacturers) return;
    
    // Page de liste des fabricants
    const manufacturersListHTML = this.generateManufacturersListHTML();
    const manufacturersListPath = path.join(this.config.outputDir, 'manufacturers', 'index.html');
    fs.writeFileSync(manufacturersListPath, manufacturersListHTML);
    this.stats.generatedFiles.push(manufacturersListPath);
    
    // Pages individuelles des fabricants
    for (const manufacturer of this.manufacturerMatrix.manufacturers) {
      const manufacturerHTML = this.generateManufacturerPageHTML(manufacturer);
      const manufacturerPath = path.join(this.config.outputDir, 'manufacturers', `${manufacturer.name}.html`);
      fs.writeFileSync(manufacturerPath, manufacturerHTML);
      this.stats.generatedFiles.push(manufacturerPath);
    }
    
    console.log(`    📄 Pages des fabricants: ${this.manufacturerMatrix.manufacturers.length + 1} fichiers`);
  }

  /**
   * 🎨 Copie des assets
   */
  async copyAssets() {
    console.log('  🎨 Copie des assets...');
    
    const assetsDir = this.config.assetsDir;
    const outputAssetsDir = path.join(this.config.outputDir, 'assets');
    
    if (fs.existsSync(assetsDir)) {
      this.copyDirectoryRecursive(assetsDir, outputAssetsDir);
      console.log(`    🎨 Assets copiés vers: ${outputAssetsDir}`);
    }
  }

  /**
   * 🗺️ Génération du sitemap
   */
  async generateSitemap() {
    console.log('  🗺️ Génération du sitemap...');
    
    const sitemap = this.generateSitemapXML();
    const sitemapPath = path.join(this.config.outputDir, 'sitemap.xml');
    fs.writeFileSync(sitemapPath, sitemap);
    
    this.stats.generatedFiles.push(sitemapPath);
    console.log(`    📄 Sitemap: ${sitemapPath}`);
  }

  /**
   * 📊 Génération du résumé
   */
  async generateSummary() {
    console.log('  📊 Génération du résumé...');
    
    const summary = {
      timestamp: new Date().toISOString(),
      version: this.config.version,
      stats: this.stats,
      generatedFiles: this.stats.generatedFiles,
      recommendations: this.generateRecommendations()
    };
    
    const summaryPath = path.join(this.config.outputDir, 'dashboard_summary.json');
    fs.writeFileSync(summaryPath, JSON.stringify(summary, null, 2));
    
    console.log(`    📄 Résumé: ${summaryPath}`);
  }

  /**
   * 🏠 Génération du HTML du dashboard principal
   */
  generateMainDashboardHTML() {
    return `<!DOCTYPE html>
<html lang="fr">
<head>
    <meta charset="UTF-8">
    <meta name="viewport" content="width=device-width, initial-scale=1.0">
    <title>🏠 Universal Tuya Zigbee - Dashboard</title>
    <link rel="stylesheet" href="assets/styles.css">
</head>
<body>
    <div class="container">
        <header class="header">
            <h1>🏠 Universal Tuya Zigbee</h1>
            <p>Dashboard de gestion des drivers - Version ${this.config.version}</p>
        </header>
        
        <div class="stats-grid">
            <div class="stat-card">
                <div class="stat-number">${this.stats.drivers.toLocaleString()}</div>
                <div class="stat-label">Drivers</div>
                <a href="drivers/" class="stat-link">Voir tous</a>
            </div>
            <div class="stat-card">
                <div class="stat-number">${this.stats.capabilities.toLocaleString()}</div>
                <div class="stat-label">Capacités</div>
                <a href="capabilities/" class="stat-link">Voir toutes</a>
            </div>
            <div class="stat-card">
                <div class="stat-number">${this.stats.classes.toLocaleString()}</div>
                <div class="stat-label">Classes</div>
                <a href="classes/" class="stat-link">Voir toutes</a>
            </div>
            <div class="stat-card">
                <div class="stat-number">${this.stats.manufacturers.toLocaleString()}</div>
                <div class="stat-label">Fabricants</div>
                <a href="manufacturers/" class="stat-link">Voir tous</a>
            </div>
        </div>
        
        <div class="quick-actions">
            <h2>🚀 Actions rapides</h2>
            <div class="action-buttons">
                <a href="drivers/" class="btn btn-primary">📁 Gérer les drivers</a>
                <a href="capabilities/" class="btn btn-secondary">⚡ Gérer les capacités</a>
                <a href="classes/" class="btn btn-secondary">🏷️ Gérer les classes</a>
                <a href="manufacturers/" class="btn btn-secondary">🏭 Gérer les fabricants</a>
            </div>
        </div>
        
        <footer class="footer">
            <p>Dashboard généré le ${new Date().toLocaleDateString('fr-FR')}</p>
            <p>Version ${this.config.version}</p>
        </footer>
    </div>
    
    <script src="assets/scripts.js"></script>
</body>
</html>`;
  }

  /**
   * 🚗 Génération du HTML de la liste des drivers
   */
  generateDriversListHTML() {
    if (!this.driverMatrix?.drivers) return '<h1>Aucun driver trouvé</h1>';
    
    const driversList = this.driverMatrix.drivers.map(driver => 
      `<tr>
        <td><a href="${driver.id}.html">${driver.id}</a></td>
        <td>${driver.class || 'N/A'}</td>
        <td>${driver.capabilities?.join(', ') || 'N/A'}</td>
                 <td>${Array.isArray(driver.manufacturer) ? driver.manufacturer.join(', ') : driver.manufacturer || 'N/A'}</td>
      </tr>`
    ).join('');
    
    return `<!DOCTYPE html>
<html lang="fr">
<head>
    <meta charset="UTF-8">
    <meta name="viewport" content="width=device-width, initial-scale=1.0">
    <title>🚗 Drivers - Universal Tuya Zigbee</title>
    <link rel="stylesheet" href="../assets/styles.css">
</head>
<body>
    <div class="container">
        <header class="header">
            <h1>🚗 Drivers</h1>
            <p>Liste de tous les drivers (${this.stats.drivers})</p>
            <a href="../" class="back-link">← Retour au dashboard</a>
        </header>
        
        <div class="table-container">
            <table class="data-table">
                <thead>
                    <tr>
                        <th>ID</th>
                        <th>Classe</th>
                        <th>Capacités</th>
                        <th>Fabricant</th>
                    </tr>
                </thead>
                <tbody>
                    ${driversList}
                </tbody>
            </table>
        </div>
    </div>
</body>
</html>`;
  }

  /**
   * 🚗 Génération du HTML d'une page de driver
   */
  generateDriverPageHTML(driver) {
    return `<!DOCTYPE html>
<html lang="fr">
<head>
    <meta charset="UTF-8">
    <meta name="viewport" content="width=device-width, initial-scale=1.0">
    <title>${driver.id} - Universal Tuya Zigbee</title>
    <link rel="stylesheet" href="../assets/styles.css">
</head>
<body>
    <div class="container">
        <header class="header">
            <h1>🚗 ${driver.id}</h1>
            <p>Détails du driver</p>
            <a href="index.html" class="back-link">← Retour à la liste</a>
        </header>
        
        <div class="driver-details">
            <div class="detail-section">
                <h2>📋 Informations générales</h2>
                <p><strong>ID:</strong> ${driver.id}</p>
                <p><strong>Classe:</strong> ${driver.class || 'N/A'}</p>
                <p><strong>Chemin:</strong> ${driver.path}</p>
            </div>
            
            <div class="detail-section">
                <h2>⚡ Capacités</h2>
                <ul>
                    ${driver.capabilities?.map(cap => `<li>${cap}</li>`).join('') || '<li>Aucune capacité</li>'}
                </ul>
            </div>
            
            <div class="detail-section">
                <h2>🏭 Fabricant</h2>
                <p>${Array.isArray(driver.manufacturer) ? driver.manufacturer.join(', ') : driver.manufacturer || 'N/A'}</p>
            </div>
        </div>
    </div>
</body>
</html>`;
  }

  /**
   * ⚡ Génération du HTML de la liste des capacités
   */
  generateCapabilitiesListHTML() {
    if (!this.capabilityMatrix?.capabilities) return '<h1>Aucune capacité trouvée</h1>';
    
    const capabilitiesList = this.capabilityMatrix.capabilities.map(cap => 
      `<tr>
        <td><a href="${cap.name}.html">${cap.name}</a></td>
        <td>${cap.count}</td>
        <td>${cap.drivers.slice(0, 5).join(', ')}${cap.drivers.length > 5 ? '...' : ''}</td>
      </tr>`
    ).join('');
    
    return `<!DOCTYPE html>
<html lang="fr">
<head>
    <meta charset="UTF-8">
    <meta name="viewport" content="width=device-width, initial-scale=1.0">
    <title>⚡ Capacités - Universal Tuya Zigbee</title>
    <link rel="stylesheet" href="../assets/styles.css">
</head>
<body>
    <div class="container">
        <header class="header">
            <h1>⚡ Capacités</h1>
            <p>Liste de toutes les capacités (${this.stats.capabilities})</p>
            <a href="../" class="back-link">← Retour au dashboard</a>
        </header>
        
        <div class="table-container">
            <table class="data-table">
                <thead>
                    <tr>
                        <th>Nom</th>
                        <th>Nombre de drivers</th>
                        <th>Exemples de drivers</th>
                    </tr>
                </thead>
                <tbody>
                    ${capabilitiesList}
                </tbody>
            </table>
        </div>
    </div>
</body>
</html>`;
  }

  /**
   * ⚡ Génération du HTML d'une page de capacité
   */
  generateCapabilityPageHTML(capability) {
    return `<!DOCTYPE html>
<html lang="fr">
<head>
    <meta charset="UTF-8">
    <meta name="viewport" content="width=device-width, initial-scale=1.0">
    <title>${capability.name} - Universal Tuya Zigbee</title>
    <link rel="stylesheet" href="../assets/styles.css">
</head>
<body>
    <div class="container">
        <header class="header">
            <h1>⚡ ${capability.name}</h1>
            <p>Capacité utilisée par ${capability.count} drivers</p>
            <a href="index.html" class="back-link">← Retour à la liste</a>
        </header>
        
        <div class="capability-details">
            <div class="detail-section">
                <h2>📊 Statistiques</h2>
                <p><strong>Nom:</strong> ${capability.name}</p>
                <p><strong>Nombre de drivers:</strong> ${capability.count}</p>
            </div>
            
            <div class="detail-section">
                <h2>🚗 Drivers utilisant cette capacité</h2>
                <ul>
                    ${capability.drivers.map(driver => `<li>${driver}</li>`).join('')}
                </ul>
            </div>
        </div>
    </div>
</body>
</html>`;
  }

  /**
   * 🏷️ Génération du HTML de la liste des classes
   */
  generateClassesListHTML() {
    if (!this.classMatrix?.classes) return '<h1>Aucune classe trouvée</h1>';
    
    const classesList = this.classMatrix.classes.map(cls => 
      `<tr>
        <td><a href="${cls.name}.html">${cls.name}</a></td>
        <td>${cls.count}</td>
        <td>${cls.drivers.slice(0, 5).join(', ')}${cls.drivers.length > 5 ? '...' : ''}</td>
      </tr>`
    ).join('');
    
    return `<!DOCTYPE html>
<html lang="fr">
<head>
    <meta charset="UTF-8">
    <meta name="viewport" content="width=device-width, initial-scale=1.0">
    <title>🏷️ Classes - Universal Tuya Zigbee</title>
    <link rel="stylesheet" href="../assets/styles.css">
</head>
<body>
    <div class="container">
        <header class="header">
            <h1>🏷️ Classes</h1>
            <p>Liste de toutes les classes (${this.stats.classes})</p>
            <a href="../" class="back-link">← Retour au dashboard</a>
        </header>
        
        <div class="table-container">
            <table class="data-table">
                <thead>
                    <tr>
                        <th>Nom</th>
                        <th>Nombre de drivers</th>
                        <th>Exemples de drivers</th>
                    </tr>
                </thead>
                <tbody>
                    ${classesList}
                </tbody>
            </table>
        </div>
    </div>
</body>
</html>`;
  }

  /**
   * 🏷️ Génération du HTML d'une page de classe
   */
  generateClassPageHTML(classInfo) {
    return `<!DOCTYPE html>
<html lang="fr">
<head>
    <meta charset="UTF-8">
    <meta name="viewport" content="width=device-width, initial-scale=1.0">
    <title>${classInfo.name} - Universal Tuya Zigbee</title>
    <link rel="stylesheet" href="../assets/styles.css">
</head>
<body>
    <div class="container">
        <header class="header">
            <h1>🏷️ ${classInfo.name}</h1>
            <p>Classe utilisée par ${classInfo.count} drivers</p>
            <a href="index.html" class="back-link">← Retour à la liste</a>
        </header>
        
        <div class="class-details">
            <div class="detail-section">
                <h2>📊 Statistiques</h2>
                <p><strong>Nom:</strong> ${classInfo.name}</p>
                <p><strong>Nombre de drivers:</strong> ${classInfo.count}</p>
            </div>
            
            <div class="detail-section">
                <h2>🚗 Drivers de cette classe</h2>
                <ul>
                    ${classInfo.drivers.map(driver => `<li>${driver}</li>`).join('')}
                </ul>
            </div>
        </div>
    </div>
</body>
</html>`;
  }

  /**
   * 🏭 Génération du HTML de la liste des fabricants
   */
  generateManufacturersListHTML() {
    if (!this.manufacturerMatrix?.manufacturers) return '<h1>Aucun fabricant trouvé</h1>';
    
    const manufacturersList = this.manufacturerMatrix.manufacturers.map(mfr => 
      `<tr>
        <td><a href="${mfr.name}.html">${mfr.name}</a></td>
        <td>${mfr.count}</td>
        <td>${mfr.drivers.slice(0, 5).join(', ')}${mfr.drivers.length > 5 ? '...' : ''}</td>
      </tr>`
    ).join('');
    
    return `<!DOCTYPE html>
<html lang="fr">
<head>
    <meta charset="UTF-8">
    <meta name="viewport" content="width=device-width, initial-scale=1.0">
    <title>🏭 Fabricants - Universal Tuya Zigbee</title>
    <link rel="stylesheet" href="../assets/styles.css">
</head>
<body>
    <div class="container">
        <header class="header">
            <h1>🏭 Fabricants</h1>
            <p>Liste de tous les fabricants (${this.stats.manufacturers})</p>
            <a href="../" class="back-link">← Retour au dashboard</a>
        </header>
        
        <div class="table-container">
            <table class="data-table">
                <thead>
                    <tr>
                        <th>Nom</th>
                        <th>Nombre de drivers</th>
                        <th>Exemples de drivers</th>
                    </tr>
                </thead>
                <tbody>
                    ${manufacturersList}
                </tbody>
            </table>
        </div>
    </div>
</body>
</html>`;
  }

  /**
   * 🏭 Génération du HTML d'une page de fabricant
   */
  generateManufacturerPageHTML(manufacturer) {
    return `<!DOCTYPE html>
<html lang="fr">
<head>
    <meta charset="UTF-8">
    <meta name="viewport" content="width=device-width, initial-scale=1.0">
    <title>${manufacturer.name} - Universal Tuya Zigbee</title>
    <link rel="stylesheet" href="../assets/styles.css">
</head>
<body>
    <div class="container">
        <header class="header">
            <h1>🏭 ${manufacturer.name}</h1>
            <p>Fabricant de ${manufacturer.count} drivers</p>
            <a href="index.html" class="back-link">← Retour à la liste</a>
        </header>
        
        <div class="manufacturer-details">
            <div class="detail-section">
                <h2>📊 Statistiques</h2>
                <p><strong>Nom:</strong> ${manufacturer.name}</p>
                <p><strong>Nombre de drivers:</strong> ${manufacturer.count}</p>
            </div>
            
            <div class="detail-section">
                <h2>🚗 Drivers de ce fabricant</h2>
                <ul>
                    ${manufacturer.drivers.map(driver => `<li>${driver}</li>`).join('')}
                </ul>
            </div>
        </div>
    </div>
</body>
</html>`;
  }

  /**
   * 🗺️ Génération du sitemap XML
   */
  generateSitemapXML() {
    const baseUrl = 'https://dlnraja.github.io/com.tuya.zigbee/';
    const currentDate = new Date().toISOString().split('T')[0];
    
    let sitemap = `<?xml version="1.0" encoding="UTF-8"?>
<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">
    <url>
        <loc>${baseUrl}</loc>
        <lastmod>${currentDate}</lastmod>
        <changefreq>daily</changefreq>
        <priority>1.0</priority>
    </url>`;
    
    // Ajout des pages des drivers
    if (this.driverMatrix?.drivers) {
      for (const driver of this.driverMatrix.drivers) {
        sitemap += `
    <url>
        <loc>${baseUrl}drivers/${driver.id}.html</loc>
        <lastmod>${currentDate}</lastmod>
        <changefreq>weekly</changefreq>
        <priority>0.8</priority>
    </url>`;
      }
    }
    
    // Ajout des pages des capacités
    if (this.capabilityMatrix?.capabilities) {
      for (const capability of this.capabilityMatrix.capabilities) {
        sitemap += `
    <url>
        <loc>${baseUrl}capabilities/${capability.name}.html</loc>
        <lastmod>${currentDate}</lastmod>
        <changefreq>weekly</changefreq>
        <priority>0.7</priority>
    </url>`;
      }
    }
    
    sitemap += `
</urlset>`;
    
    return sitemap;
  }

  /**
   * 📁 Copie récursive d'un répertoire
   */
  copyDirectoryRecursive(source, destination) {
    if (!fs.existsSync(destination)) {
      fs.mkdirSync(destination, { recursive: true });
    }
    
    const entries = fs.readdirSync(source);
    
    for (const entry of entries) {
      const sourcePath = path.join(source, entry);
      const destPath = path.join(destination, entry);
      const stat = fs.statSync(sourcePath);
      
      if (stat.isDirectory()) {
        this.copyDirectoryRecursive(sourcePath, destPath);
      } else {
        fs.copyFileSync(sourcePath, destPath);
      }
    }
  }

  /**
   * 💡 Génération des recommandations
   */
  generateRecommendations() {
    const recommendations = [];
    
    if (this.stats.generatedFiles.length === 0) {
      recommendations.push('Aucun fichier généré - vérifier les données des matrices');
    }
    
    if (this.stats.drivers === 0) {
      recommendations.push('Aucun driver trouvé - exécuter la construction des matrices');
    }
    
    return recommendations;
  }
}

// Point d'entrée
if (require.main === module) {
  const builder = new DashboardBuilder();
  builder.run().catch(console.error);
}

module.exports = DashboardBuilder;
