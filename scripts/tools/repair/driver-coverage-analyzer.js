#!/usr/bin/env node

console.log('🔍 ANALYSE COMPLÈTE DE LA COUVERTURE DES DRIVERS');
console.log('==================================================');

const fs = require('fs');
const path = require('path');

class DriverCoverageAnalyzer {
  constructor() {
    this.projectRoot = path.join(__dirname, '../..');
    this.researchDir = path.join(this.projectRoot, 'research');
    this.driversDir = path.join(this.projectRoot, 'drivers');
    
    // Sources de données externes
    this.externalSources = [
      'zigbee2mqtt',
      'blakadder', 
      'homey-forums',
      'tuya-developer',
      'home-assistant'
    ];
    
    // Matrices et index du projet
    this.projectMatrices = [
      'drivers-matrix.json',
      'drivers-index.json',
      'drivers-structure-index.json',
      'drivers-check-report.json'
    ];
    
    this.analysisResults = {
      timestamp: new Date().toISOString(),
      currentDrivers: [],
      externalCoverage: {},
      missingDrivers: [],
      recommendations: [],
      coverageScore: 0
    };
  }
  
  async analyzeCompleteCoverage() {
    try {
      console.log('🚀 Début de l\'analyse complète...\n');
      
      // 1. Analyser les drivers actuels du projet
      await this.analyzeCurrentDrivers();
      
      // 2. Analyser la couverture externe
      await this.analyzeExternalCoverage();
      
      // 3. Identifier les drivers manquants
      await this.identifyMissingDrivers();
      
      // 4. Générer des recommandations
      await this.generateRecommendations();
      
      // 5. Calculer le score de couverture
      this.calculateCoverageScore();
      
      // 6. Sauvegarder le rapport
      await this.saveAnalysisReport();
      
      // 7. Afficher le résumé
      this.displaySummary();
      
      console.log('✅ Analyse complète terminée !');
      console.log('::END::DRIVER_COVERAGE_ANALYSIS::OK');
      
    } catch (error) {
      console.error('❌ Erreur lors de l\'analyse:', error.message);
      console.log('::END::DRIVER_COVERAGE_ANALYSIS::FAIL');
      process.exit(1);
    }
  }
  
  async analyzeCurrentDrivers() {
    console.log('📁 Analyse des drivers actuels du projet...');
    
    if (!fs.existsSync(this.driversDir)) {
      console.log('⚠️ Dossier drivers/ non trouvé');
      return;
    }
    
    const driverDirs = fs.readdirSync(this.driversDir, { withFileTypes: true })
      .filter(dirent => dirent.isDirectory())
      .map(dirent => dirent.name);
    
    console.log(`📊 Drivers trouvés: ${driverDirs.length}`);
    
    for (const driverDir of driverDirs) {
      const driverPath = path.join(this.driversDir, driverDir);
      const composePath = path.join(driverPath, 'driver.compose.json');
      const devicePath = path.join(driverPath, 'device.js');
      
      const driverInfo = {
        id: driverDir,
        path: driverPath,
        hasCompose: fs.existsSync(composePath),
        hasDevice: fs.existsSync(devicePath),
        capabilities: [],
        type: this.extractDriverType(driverDir),
        category: this.extractDriverCategory(driverDir)
      };
      
      // Lire les capacités depuis driver.compose.json
      if (driverInfo.hasCompose) {
        try {
          const composeData = JSON.parse(fs.readFileSync(composePath, 'utf8'));
          driverInfo.capabilities = composeData.capabilities || [];
          driverInfo.name = composeData.name || {};
          driverInfo.class = composeData.class || 'unknown';
        } catch (error) {
          console.log(`⚠️ Erreur lecture ${driverDir}/driver.compose.json`);
        }
      }
      
      this.analysisResults.currentDrivers.push(driverInfo);
      
      if (driverInfo.hasCompose && driverInfo.hasDevice) {
        console.log(`✅ ${driverDir} - Complet`);
      } else {
        console.log(`❌ ${driverDir} - Incomplet`);
      }
    }
    
    console.log(`\n📊 Résumé drivers actuels:`);
    console.log(`   Total: ${this.analysisResults.currentDrivers.length}`);
    console.log(`   Complets: ${this.analysisResults.currentDrivers.filter(d => d.hasCompose && d.hasDevice).length}`);
    console.log(`   Incomplets: ${this.analysisResults.currentDrivers.filter(d => !d.hasCompose || !d.hasDevice).length}\n`);
  }
  
  async analyzeExternalCoverage() {
    console.log('🌐 Analyse de la couverture externe...');
    
    for (const source of this.externalSources) {
      const sourceFile = path.join(this.researchDir, 'source-data', `${source}.json`);
      
      if (fs.existsSync(sourceFile)) {
        try {
          const sourceData = JSON.parse(fs.readFileSync(sourceFile, 'utf8'));
          const devices = sourceData.devices || [];
          
          this.analysisResults.externalCoverage[source] = {
            name: sourceData.name || source,
            url: sourceData.url || '',
            totalDevices: devices.length,
            deviceTypes: this.extractDeviceTypes(devices),
            capabilities: this.extractCapabilities(devices),
            lastUpdated: sourceData.last_updated || 'unknown'
          };
          
          console.log(`✅ ${source}: ${devices.length} devices`);
          
        } catch (error) {
          console.log(`⚠️ Erreur lecture ${source}: ${error.message}`);
        }
      } else {
        console.log(`⚠️ Fichier source non trouvé: ${source}`);
      }
    }
    
    console.log('');
  }
  
  async identifyMissingDrivers() {
    console.log('🔍 Identification des drivers manquants...');
    
    // Analyser les matrices du projet
    for (const matrixFile of this.projectMatrices) {
      const matrixPath = path.join(this.projectRoot, matrixFile);
      
      if (fs.existsSync(matrixPath)) {
        try {
          const matrixData = JSON.parse(fs.readFileSync(matrixPath, 'utf8'));
          this.analyzeMatrixForMissingDrivers(matrixData, matrixFile);
        } catch (error) {
          console.log(`⚠️ Erreur lecture ${matrixFile}: ${error.message}`);
        }
      }
    }
    
    // Analyser la couverture externe pour identifier les gaps
    this.analyzeExternalCoverageForGaps();
    
    console.log(`📊 Drivers manquants identifiés: ${this.analysisResults.missingDrivers.length}\n`);
  }
  
  analyzeMatrixForMissingDrivers(matrixData, matrixName) {
    if (matrixData.drivers && Array.isArray(matrixData.drivers)) {
      for (const driver of matrixData.drivers) {
        if (driver.type && driver.name) {
          const driverId = `${driver.type}-${driver.name}-universal`;
          
          if (!this.analysisResults.currentDrivers.find(d => d.id === driverId)) {
            this.analysisResults.missingDrivers.push({
              id: driverId,
              type: driver.type,
              name: driver.name,
              source: matrixName,
              capabilities: driver.capabilities || [],
              priority: this.calculateDriverPriority(driver)
            });
          }
        }
      }
    }
  }
  
  analyzeExternalCoverageForGaps() {
    const allExternalCapabilities = new Set();
    const allExternalTypes = new Set();
    
    // Collecter toutes les capacités et types externes
    Object.values(this.analysisResults.externalCoverage).forEach(source => {
      source.capabilities.forEach(cap => allExternalCapabilities.add(cap));
      source.deviceTypes.forEach(type => allExternalTypes.add(type));
    });
    
    // Identifier les capacités manquantes dans les drivers actuels
    const currentCapabilities = new Set();
    this.analysisResults.currentDrivers.forEach(driver => {
      driver.capabilities.forEach(cap => currentCapabilities.add(cap));
    });
    
    const missingCapabilities = [...allExternalCapabilities].filter(cap => !currentCapabilities.has(cap));
    
    if (missingCapabilities.length > 0) {
      this.analysisResults.missingDrivers.push({
        id: 'missing-capabilities',
        type: 'capability',
        name: 'Missing Capabilities',
        source: 'external-analysis',
        capabilities: missingCapabilities,
        priority: 'high'
      });
    }
  }
  
  async generateRecommendations() {
    console.log('💡 Génération des recommandations...');
    
    // Recommandations basées sur les drivers manquants
    for (const missingDriver of this.analysisResults.missingDrivers) {
      if (missingDriver.type !== 'capability') {
        this.analysisResults.recommendations.push({
          type: 'create_driver',
          driver: missingDriver.id,
          priority: missingDriver.priority,
          reason: `Driver référencé dans ${missingDriver.source} mais absent du projet`,
          action: `Créer le driver ${missingDriver.id} avec les capacités: ${missingDriver.capabilities.join(', ')}`
        });
      }
    }
    
    // Recommandations basées sur la couverture externe
    Object.entries(this.analysisResults.externalCoverage).forEach(([source, data]) => {
      if (data.totalDevices > 0) {
        this.analysisResults.recommendations.push({
          type: 'enhance_coverage',
          source: source,
          priority: 'medium',
          reason: `${data.totalDevices} devices trouvés dans ${source}`,
          action: `Vérifier la couverture des types: ${data.deviceTypes.join(', ')}`
        });
      }
    });
    
    // Recommandations d'amélioration
    this.analysisResults.recommendations.push({
      type: 'improve_existing',
      priority: 'low',
      reason: 'Amélioration continue des drivers existants',
      action: 'Ajouter des capacités avancées et des flow cards'
    });
    
    console.log(`📊 Recommandations générées: ${this.analysisResults.recommendations.length}\n`);
  }
  
  calculateCoverageScore() {
    const totalExpectedDrivers = this.analysisResults.currentDrivers.length + this.analysisResults.missingDrivers.length;
    const currentValidDrivers = this.analysisResults.currentDrivers.filter(d => d.hasCompose && d.hasDevice).length;
    
    if (totalExpectedDrivers > 0) {
      this.analysisResults.coverageScore = Math.round((currentValidDrivers / totalExpectedDrivers) * 100);
    }
    
    console.log(`📈 Score de couverture calculé: ${this.analysisResults.coverageScore}%`);
  }
  
  async saveAnalysisReport() {
    const reportPath = path.join(this.researchDir, 'driver-coverage-analysis.json');
    
    fs.writeFileSync(reportPath, JSON.stringify(this.analysisResults, null, 2));
    console.log(`💾 Rapport sauvegardé: ${reportPath}`);
  }
  
  displaySummary() {
    console.log('\n📊 RÉSUMÉ DE L\'ANALYSE COMPLÈTE');
    console.log('====================================');
    
    console.log(`\n🎯 Drivers Actuels:`);
    console.log(`   Total: ${this.analysisResults.currentDrivers.length}`);
    console.log(`   Complets: ${this.analysisResults.currentDrivers.filter(d => d.hasCompose && d.hasDevice).length}`);
    console.log(`   Incomplets: ${this.analysisResults.currentDrivers.filter(d => !d.hasCompose || !d.hasDevice).length}`);
    
    console.log(`\n🌐 Couverture Externe:`);
    Object.entries(this.analysisResults.externalCoverage).forEach(([source, data]) => {
      console.log(`   ${source}: ${data.totalDevices} devices, ${data.deviceTypes.length} types`);
    });
    
    console.log(`\n❌ Drivers Manquants:`);
    console.log(`   Total: ${this.analysisResults.missingDrivers.length}`);
    this.analysisResults.missingDrivers.forEach(driver => {
      console.log(`   - ${driver.id} (${driver.priority})`);
    });
    
    console.log(`\n💡 Recommandations:`);
    console.log(`   Total: ${this.analysisResults.recommendations.length}`);
    this.analysisResults.recommendations.slice(0, 5).forEach(rec => {
      console.log(`   - ${rec.type}: ${rec.action}`);
    });
    
    console.log(`\n📈 Score de Couverture: ${this.analysisResults.coverageScore}%`);
    
    if (this.analysisResults.coverageScore >= 90) {
      console.log('🎉 Excellente couverture !');
    } else if (this.analysisResults.coverageScore >= 70) {
      console.log('✅ Bonne couverture');
    } else if (this.analysisResults.coverageScore >= 50) {
      console.log('⚠️ Couverture moyenne');
    } else {
      console.log('❌ Couverture insuffisante');
    }
  }
  
  extractDriverType(driverId) {
    if (driverId.includes('tuya')) return 'tuya';
    if (driverId.includes('zigbee')) return 'zigbee';
    return 'unknown';
  }
  
  extractDriverCategory(driverId) {
    if (driverId.includes('light')) return 'lighting';
    if (driverId.includes('plug')) return 'plugs';
    if (driverId.includes('sensor')) return 'sensors';
    if (driverId.includes('cover')) return 'covers';
    if (driverId.includes('climate')) return 'climate';
    if (driverId.includes('remote')) return 'remotes';
    if (driverId.includes('fan')) return 'fans';
    if (driverId.includes('lock')) return 'locks';
    return 'other';
  }
  
  extractDeviceTypes(devices) {
    const types = new Set();
    devices.forEach(device => {
      if (device.zigbee && device.zigbee.model) {
        const model = device.zigbee.model;
        if (model.includes('TS')) types.add('tuya');
        if (model.includes('light') || model.includes('bulb')) types.add('lighting');
        if (model.includes('switch') || model.includes('plug')) types.add('switches');
        if (model.includes('sensor')) types.add('sensors');
        if (model.includes('cover') || model.includes('blind')) types.add('covers');
        if (model.includes('thermostat') || model.includes('climate')) types.add('climate');
      }
    });
    return [...types];
  }
  
  extractCapabilities(devices) {
    const capabilities = new Set();
    devices.forEach(device => {
      if (device.capabilities) {
        device.capabilities.forEach(cap => capabilities.add(cap));
      }
    });
    return [...capabilities];
  }
  
  calculateDriverPriority(driver) {
    if (driver.capabilities && driver.capabilities.length > 3) return 'high';
    if (driver.capabilities && driver.capabilities.length > 1) return 'medium';
    return 'low';
  }
}

// Exécuter l'analyse
if (require.main === module) {
  const analyzer = new DriverCoverageAnalyzer();
  analyzer.analyzeCompleteCoverage();
}

module.exports = DriverCoverageAnalyzer;
