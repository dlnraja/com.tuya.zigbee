#!/usr/bin/env node
'use strict';

/**
 * 📊 Module de Construction des Matrices - Version 3.5.0
 * Génération unifiée des matrices de drivers et capacités
 */

const fs = require('fs');
const path = require('path');

class MatrixBuilder {
  constructor() {
    this.config = {
      version: '3.5.0',
      outputDir: 'matrices',
      matrixTypes: ['drivers', 'capabilities', 'classes', 'manufacturers']
    };
    
    this.stats = {
      totalDrivers: 0,
      processedDrivers: 0,
      errors: 0,
      matrices: {}
    };
  }

  async run() {
    console.log('📊 Construction des matrices...');
    
    try {
      await this.ensureOutputDirectory();
      await this.scanDrivers();
      await this.buildDriverMatrix();
      await this.buildCapabilityMatrix();
      await this.buildClassMatrix();
      await this.buildManufacturerMatrix();
      await this.generateSummary();
      
      console.log('✅ Construction des matrices terminée avec succès');
    } catch (error) {
      console.error('❌ Erreur lors de la construction des matrices:', error.message);
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
    console.log(`  📁 Répertoire de sortie: ${this.config.outputDir}`);
  }

  /**
   * 🔍 Scan des drivers
   */
  async scanDrivers() {
    console.log('  🔍 Scan des drivers...');
    
    const driversDir = path.join(process.cwd(), 'drivers');
    this.drivers = this.findDrivers(driversDir);
    
    this.stats.totalDrivers = this.drivers.length;
    console.log(`    📁 ${this.drivers.length} drivers trouvés`);
  }

  /**
   * 📁 Recherche des drivers
   */
  findDrivers(dir) {
    const drivers = [];
    
    const walkDir = (currentDir) => {
      const entries = fs.readdirSync(currentDir);
      
      for (const entry of entries) {
        const fullPath = path.join(currentDir, entry);
        const stat = fs.statSync(fullPath);
        
        if (stat.isDirectory()) {
          // Vérifier si c'est un driver
          if (fs.existsSync(path.join(fullPath, 'driver.compose.json'))) {
            const driverInfo = this.extractDriverInfo(fullPath);
            if (driverInfo) {
              drivers.push(driverInfo);
            }
          }
          // Continuer à scanner récursivement
          walkDir(fullPath);
        }
      }
    };
    
    walkDir(dir);
    return drivers;
  }

  /**
   * 📋 Extraction des informations d'un driver
   */
  extractDriverInfo(driverPath) {
    try {
      const composePath = path.join(driverPath, 'driver.compose.json');
      const compose = JSON.parse(fs.readFileSync(composePath, 'utf8'));
      
      const relativePath = path.relative(process.cwd(), driverPath);
      const driverId = path.basename(driverPath);
      
      const driverInfo = {
        id: driverId,
        path: relativePath,
        class: compose.class || 'unknown',
        capabilities: compose.capabilities || [],
        name: compose.name || {},
        zigbee: compose.zigbee || {},
        tuya_dps: compose.tuya_dps || {},
        files: this.checkDriverFiles(driverPath)
      };

      // Ajout des métadonnées Zigbee
      if (compose.zigbee) {
        driverInfo.manufacturer = compose.zigbee.manufacturerName || [];
        driverInfo.modelId = compose.zigbee.modelId || [];
        driverInfo.productId = compose.zigbee.productId || [];
      }

      this.stats.processedDrivers++;
      return driverInfo;
      
    } catch (error) {
      console.warn(`    ⚠️ Erreur lors de l'extraction du driver ${driverPath}:`, error.message);
      this.stats.errors++;
      return null;
    }
  }

  /**
   * 📄 Vérification des fichiers du driver
   */
  checkDriverFiles(driverPath) {
    const files = {};
    const requiredFiles = ['driver.compose.json', 'device.js'];
    const optionalFiles = ['driver.js', 'pair.js', 'assets/icon.svg', 'settings.json'];
    
    for (const file of requiredFiles) {
      files[file] = fs.existsSync(path.join(driverPath, file));
    }
    
    for (const file of optionalFiles) {
      files[file] = fs.existsSync(path.join(driverPath, file));
    }
    
    return files;
  }

  /**
   * 🚗 Construction de la matrice des drivers
   */
  async buildDriverMatrix() {
    console.log('  🚗 Construction de la matrice des drivers...');
    
    const matrix = {
      metadata: {
        version: this.config.version,
        generated: new Date().toISOString(),
        totalDrivers: this.drivers.length
      },
      drivers: this.drivers
    };
    
    const outputPath = path.join(this.config.outputDir, 'driver_matrix.json');
    fs.writeFileSync(outputPath, JSON.stringify(matrix, null, 2));
    
    this.stats.matrices.drivers = outputPath;
    console.log(`    📄 Matrice des drivers: ${outputPath}`);
  }

  /**
   * ⚡ Construction de la matrice des capacités
   */
  async buildCapabilityMatrix() {
    console.log('  ⚡ Construction de la matrice des capacités...');
    
    const capabilities = {};
    
    for (const driver of this.drivers) {
      for (const capability of driver.capabilities) {
        if (!capabilities[capability]) {
          capabilities[capability] = {
            name: capability,
            drivers: [],
            count: 0
          };
        }
        capabilities[capability].drivers.push(driver.id);
        capabilities[capability].count++;
      }
    }
    
    const matrix = {
      metadata: {
        version: this.config.version,
        generated: new Date().toISOString(),
        totalCapabilities: Object.keys(capabilities).length
      },
      capabilities: Object.values(capabilities).sort((a, b) => b.count - a.count)
    };
    
    const outputPath = path.join(this.config.outputDir, 'capability_matrix.json');
    fs.writeFileSync(outputPath, JSON.stringify(matrix, null, 2));
    
    this.stats.matrices.capabilities = outputPath;
    console.log(`    📄 Matrice des capacités: ${outputPath}`);
  }

  /**
   * 🏷️ Construction de la matrice des classes
   */
  async buildClassMatrix() {
    console.log('  🏷️ Construction de la matrice des classes...');
    
    const classes = {};
    
    for (const driver of this.drivers) {
      const className = driver.class || 'unknown';
      if (!classes[className]) {
        classes[className] = {
          name: className,
          drivers: [],
          count: 0
        };
      }
      classes[className].drivers.push(driver.id);
      classes[className].count++;
    }
    
    const matrix = {
      metadata: {
        version: this.config.version,
        generated: new Date().toISOString(),
        totalClasses: Object.keys(classes).length
      },
      classes: Object.values(classes).sort((a, b) => b.count - a.count)
    };
    
    const outputPath = path.join(this.config.outputDir, 'class_matrix.json');
    fs.writeFileSync(outputPath, JSON.stringify(matrix, null, 2));
    
    this.stats.matrices.classes = outputPath;
    console.log(`    📄 Matrice des classes: ${outputPath}`);
  }

  /**
   * 🏭 Construction de la matrice des fabricants
   */
  async buildManufacturerMatrix() {
    console.log('  🏭 Construction de la matrice des fabricants...');
    
    const manufacturers = {};
    
    for (const driver of this.drivers) {
      if (driver.manufacturer && driver.manufacturer.length > 0) {
        for (const manufacturer of driver.manufacturer) {
          if (!manufacturers[manufacturer]) {
            manufacturers[manufacturer] = {
              name: manufacturer,
              drivers: [],
              count: 0
            };
          }
          manufacturers[manufacturer].drivers.push(driver.id);
          manufacturers[manufacturer].count++;
        }
      }
    }
    
    const matrix = {
      metadata: {
        version: this.config.version,
        generated: new Date().toISOString(),
        totalManufacturers: Object.keys(manufacturers).length
      },
      manufacturers: Object.values(manufacturers).sort((a, b) => b.count - a.count)
    };
    
    const outputPath = path.join(this.config.outputDir, 'manufacturer_matrix.json');
    fs.writeFileSync(outputPath, JSON.stringify(matrix, null, 2));
    
    this.stats.matrices.manufacturers = outputPath;
    console.log(`    📄 Matrice des fabricants: ${outputPath}`);
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
      matrices: this.stats.matrices,
      recommendations: this.generateRecommendations()
    };
    
    const summaryPath = path.join(this.config.outputDir, 'matrix_summary.json');
    fs.writeFileSync(summaryPath, JSON.stringify(summary, null, 2));
    
    console.log(`    📄 Résumé: ${summaryPath}`);
  }

  /**
   * 💡 Génération des recommandations
   */
  generateRecommendations() {
    const recommendations = [];
    
    if (this.stats.errors > 0) {
      recommendations.push(`Corriger ${this.stats.errors} erreurs de parsing`);
    }
    
    if (this.stats.processedDrivers < this.stats.totalDrivers) {
      recommendations.push('Améliorer la robustesse du parsing des drivers');
    }
    
    return recommendations;
  }
}

// Point d'entrée
if (require.main === module) {
  const builder = new MatrixBuilder();
  builder.run().catch(console.error);
}

module.exports = MatrixBuilder;
