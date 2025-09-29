#!/usr/bin/env node

const fs = require('fs');
const path = require('path');

console.log('🚀 MEGA ANALYSIS ENGINE - Démarrage...\n');

class MegaAnalysisEngine {
  constructor() {
    this.projectRoot = path.join(__dirname, '../..');
    this.driversPath = path.join(this.projectRoot, 'drivers');
    this.researchPath = path.join(this.projectRoot, 'research');
    this.reportPath = path.join(this.researchPath, 'mega-analysis-report.json');
    
    this.analysisResults = {
      timestamp: new Date().toISOString(),
      summary: {},
      drivers: {},
      gaps: {},
      recommendations: {},
      scoring: {},
      heuristics: {},
      sources: {},
      coverage: {}
    };
  }

  async runFullAnalysis() {
    console.log('🔍 Phase 1: Analyse de la structure du projet...');
    await this.analyzeProjectStructure();
    
    console.log('🔍 Phase 2: Analyse des drivers existants...');
    await this.analyzeExistingDrivers();
    
    console.log('🔍 Phase 3: Analyse des drivers universels...');
    await this.analyzeUniversalDrivers();
    
    console.log('🔍 Phase 4: Identification des gaps...');
    await this.identifyGaps();
    
    console.log('🔍 Phase 5: Analyse des sources externes...');
    await this.analyzeExternalSources();
    
    console.log('🔍 Phase 6: Génération des recommandations...');
    await this.generateRecommendations();
    
    console.log('🔍 Phase 7: Calcul des scores...');
    await this.calculateScores();
    
    console.log('🔍 Phase 8: Génération du rapport final...');
    await this.generateFinalReport();
    
    console.log('\n🎯 MEGA ANALYSIS ENGINE - Analyse terminée !');
  }

  async analyzeProjectStructure() {
    const structure = {
      totalDrivers: 0,
      universalDrivers: 0,
      legacyDrivers: 0,
      missingAssets: 0,
      missingDocs: 0
    };

    // Compter tous les drivers
    const allDrivers = this.getAllDrivers();
    structure.totalDrivers = allDrivers.length;
    
    // Identifier les drivers universels
    const universalDrivers = allDrivers.filter(d => d.includes('-universal'));
    structure.universalDrivers = universalDrivers.length;
    
    // Identifier les drivers legacy
    structure.legacyDrivers = structure.totalDrivers - structure.universalDrivers;

    this.analysisResults.summary = structure;
    console.log(`   📊 Structure analysée: ${structure.totalDrivers} drivers totaux`);
  }

  async analyzeExistingDrivers() {
    const drivers = {};
    const allDrivers = this.getAllDrivers();

    for (const driverPath of allDrivers) {
      const driverName = path.basename(driverPath);
      const driverFullPath = path.join(this.driversPath, driverPath);
      
      drivers[driverName] = {
        path: driverPath,
        exists: true,
        files: {},
        completeness: 0,
        issues: [],
        recommendations: []
      };

      // Analyser les fichiers du driver
      const requiredFiles = ['driver.compose.json', 'device.js', 'driver.js', 'README.md'];
      const assetFiles = ['assets/icon.svg', 'assets/images/small.png', 'assets/images/large.png'];
      
      for (const file of requiredFiles) {
        const filePath = path.join(driverFullPath, file);
        drivers[driverName].files[file] = {
          exists: fs.existsSync(filePath),
          size: fs.existsSync(filePath) ? fs.statSync(filePath).size : 0
        };
      }

      // Analyser les assets
      for (const asset of assetFiles) {
        const assetPath = path.join(driverFullPath, asset);
        if (!drivers[driverName].files.assets) {
          drivers[driverName].files.assets = {};
        }
        drivers[driverName].files.assets[asset] = {
          exists: fs.existsSync(assetPath),
          size: fs.existsSync(assetPath) ? fs.statSync(assetPath).size : 0
        };
      }

      // Calculer la complétude
      const totalFiles = requiredFiles.length + assetFiles.length;
      const existingFiles = Object.values(drivers[driverName].files).filter(f => f.exists).length;
      drivers[driverName].completeness = Math.round((existingFiles / totalFiles) * 100);

      // Identifier les problèmes
      if (drivers[driverName].completeness < 100) {
        drivers[driverName].issues.push(`Complétude: ${drivers[driverName].completeness}%`);
      }
    }

    this.analysisResults.drivers = drivers;
    console.log(`   📊 Drivers analysés: ${Object.keys(drivers).length} drivers examinés`);
  }

  async analyzeUniversalDrivers() {
    const universalDrivers = {};
    const universalPaths = [
      'fan-tuya-universal',
      'lock-tuya-universal',
      'switch',
      'tuya-climate-universal',
      'tuya-cover-universal',
      'tuya-light-universal',
      'tuya-plug-universal',
      'tuya-remote-universal',
      'tuya-sensor-universal',
      'zigbee-tuya-universal'
    ];

    for (const driverName of universalPaths) {
      const driverPath = path.join(this.driversPath, driverName);
      universalDrivers[driverName] = {
        exists: fs.existsSync(driverPath),
        path: driverPath,
        analysis: {}
      };

      if (fs.existsSync(driverPath)) {
        // Analyser la structure du driver universel
        universalDrivers[driverName].analysis = await this.analyzeDriverStructure(driverPath);
      }
    }

    this.analysisResults.universalDrivers = universalDrivers;
    console.log(`   📊 Drivers universels analysés: ${universalPaths.length} drivers examinés`);
  }

  async analyzeDriverStructure(driverPath) {
    const analysis = {
      files: {},
      capabilities: [],
      zigbee: {},
      metadata: {},
      issues: []
    };

    // Analyser driver.compose.json
    const composePath = path.join(driverPath, 'driver.compose.json');
    if (fs.existsSync(composePath)) {
      try {
        const compose = JSON.parse(fs.readFileSync(composePath, 'utf8'));
        analysis.capabilities = compose.capabilities || [];
        analysis.zigbee = compose.zigbee || {};
        analysis.metadata = compose.metadata || {};
      } catch (error) {
        analysis.issues.push(`Erreur parsing driver.compose.json: ${error.message}`);
      }
    } else {
      analysis.issues.push('driver.compose.json manquant');
    }

    // Analyser device.js
    const devicePath = path.join(driverPath, 'device.js');
    if (fs.existsSync(devicePath)) {
      const deviceContent = fs.readFileSync(devicePath, 'utf8');
      analysis.files.device = {
        exists: true,
        size: deviceContent.length,
        hasOnInit: deviceContent.includes('onInit'),
        hasOnSettings: deviceContent.includes('onSettings'),
        hasCapabilities: deviceContent.includes('capabilities')
      };
    } else {
      analysis.files.device = { exists: false };
      analysis.issues.push('device.js manquant');
    }

    // Analyser les assets
    const assetsPath = path.join(driverPath, 'assets');
    if (fs.existsSync(assetsPath)) {
      analysis.files.assets = {
        exists: true,
        icon: fs.existsSync(path.join(assetsPath, 'icon.svg')),
        small: fs.existsSync(path.join(assetsPath, 'images/small.png')),
        large: fs.existsSync(path.join(assetsPath, 'images/large.png'))
      };
    } else {
      analysis.files.assets = { exists: false };
      analysis.issues.push('Dossier assets manquant');
    }

    return analysis;
  }

  async identifyGaps() {
    const gaps = {
      missingDrivers: [],
      incompleteDrivers: [],
      missingCapabilities: [],
      missingAssets: [],
      missingDocumentation: []
    };

    // Identifier les drivers manquants
    const expectedDrivers = [
      'tuya-button-universal',
      'tuya-curtain-universal',
      'tuya-garage-universal',
      'tuya-ir-universal',
      'tuya-lock-universal',
      'tuya-motor-universal',
      'tuya-outlet-universal',
      'tuya-relay-universal',
      'tuya-thermostat-universal',
      'tuya-valve-universal'
    ];

    for (const expected of expectedDrivers) {
      const driverPath = path.join(this.driversPath, expected);
      if (!fs.existsSync(driverPath)) {
        gaps.missingDrivers.push(expected);
      }
    }

    // Identifier les drivers incomplets
    for (const [driverName, driver] of Object.entries(this.analysisResults.drivers)) {
      if (driver.completeness < 100) {
        gaps.incompleteDrivers.push({
          name: driverName,
          completeness: driver.completeness,
          issues: driver.issues
        });
      }
    }

    this.analysisResults.gaps = gaps;
    console.log(`   📊 Gaps identifiés: ${gaps.missingDrivers.length} drivers manquants, ${gaps.incompleteDrivers.length} incomplets`);
  }

  async analyzeExternalSources() {
    const sources = {
      zigbee2mqtt: {},
      blakadder: {},
      homeyForums: {},
      tuyaDeveloper: {},
      homeAssistant: {}
    };

    // Analyser les sources existantes
    const sourceFiles = [
      'research/source-data/zigbee2mqtt.json',
      'research/source-data/blakadder.json',
      'research/source-data/homey-forums.json',
      'research/source-data/tuya-developer.json',
      'research/source-data/home-assistant.json'
    ];

    for (const sourceFile of sourceFiles) {
      const fullPath = path.join(this.projectRoot, sourceFile);
      if (fs.existsSync(fullPath)) {
        try {
          const data = JSON.parse(fs.readFileSync(fullPath, 'utf8'));
          const sourceName = path.basename(sourceFile, '.json');
          sources[sourceName] = {
            exists: true,
            devices: data.devices ? data.devices.length : 0,
            lastUpdate: data.lastUpdate || 'Unknown',
            coverage: data.coverage || 0
          };
        } catch (error) {
          console.log(`   ⚠️  Erreur parsing ${sourceFile}: ${error.message}`);
        }
      }
    }

    this.analysisResults.sources = sources;
    console.log(`   📊 Sources externes analysées: ${Object.keys(sources).length} sources examinées`);
  }

  async generateRecommendations() {
    const recommendations = {
      immediate: [],
      shortTerm: [],
      longTerm: [],
      critical: []
    };

    // Recommandations immédiates
    if (this.analysisResults.gaps.missingDrivers.length > 0) {
      recommendations.immediate.push(`Créer ${this.analysisResults.gaps.missingDrivers.length} drivers manquants`);
    }

    if (this.analysisResults.gaps.incompleteDrivers.length > 0) {
      recommendations.immediate.push(`Compléter ${this.analysisResults.gaps.incompleteDrivers.length} drivers incomplets`);
    }

    // Recommandations critiques
    const criticalIssues = Object.values(this.analysisResults.drivers)
      .filter(d => d.completeness < 50)
      .map(d => d.path);
    
    if (criticalIssues.length > 0) {
      recommendations.critical.push(`Drivers critiques à corriger: ${criticalIssues.join(', ')}`);
    }

    // Recommandations à long terme
    recommendations.longTerm.push('Implémenter un système de scoring avancé');
    recommendations.longTerm.push('Créer un pipeline d\'enrichissement automatique');
    recommendations.longTerm.push('Développer des algorithmes heuristiques pour la détection de patterns');

    this.analysisResults.recommendations = recommendations;
    console.log(`   📊 Recommandations générées: ${recommendations.immediate.length} immédiates, ${recommendations.critical.length} critiques`);
  }

  async calculateScores() {
    const scoring = {
      overall: 0,
      drivers: 0,
      assets: 0,
      documentation: 0,
      coverage: 0,
      quality: 0
    };

    // Score des drivers
    const totalCompleteness = Object.values(this.analysisResults.drivers)
      .reduce((sum, d) => sum + d.completeness, 0);
    scoring.drivers = Math.round(totalCompleteness / Object.keys(this.analysisResults.drivers).length);

    // Score des assets
    let totalAssets = 0;
    let existingAssets = 0;
    Object.values(this.analysisResults.drivers).forEach(driver => {
      if (driver.files.assets) {
        Object.values(driver.files.assets).forEach(asset => {
          totalAssets++;
          if (asset.exists) existingAssets++;
        });
      }
    });
    scoring.assets = totalAssets > 0 ? Math.round((existingAssets / totalAssets) * 100) : 0;

    // Score global
    scoring.overall = Math.round((scoring.drivers + scoring.assets + scoring.documentation + scoring.coverage + scoring.quality) / 5);

    this.analysisResults.scoring = scoring;
    console.log(`   📊 Scores calculés: Global ${scoring.overall}%, Drivers ${scoring.drivers}%, Assets ${scoring.assets}%`);
  }

  async generateFinalReport() {
    // Sauvegarder le rapport
    fs.writeFileSync(this.reportPath, JSON.stringify(this.analysisResults, null, 2));
    
    // Afficher le résumé
    console.log('\n🎯 RAPPORT FINAL MEGA ANALYSIS ENGINE');
    console.log('=====================================');
    console.log(`📊 Drivers totaux: ${this.analysisResults.summary.totalDrivers}`);
    console.log(`📊 Drivers universels: ${this.analysisResults.summary.universalDrivers}`);
    console.log(`📊 Drivers legacy: ${this.analysisResults.summary.legacyDrivers}`);
    console.log(`📊 Score global: ${this.analysisResults.scoring.overall}%`);
    console.log(`📊 Drivers manquants: ${this.analysisResults.gaps.missingDrivers.length}`);
    console.log(`📊 Drivers incomplets: ${this.analysisResults.gaps.incompleteDrivers.length}`);
    console.log(`📊 Sources externes: ${Object.keys(this.analysisResults.sources).length}`);
    
    console.log('\n🚀 Rapport sauvegardé dans:', this.reportPath);
  }

  getAllDrivers() {
    const drivers = [];
    
    function scanDirectory(dirPath, relativePath = '') {
      const items = fs.readdirSync(dirPath);
      
      for (const item of items) {
        const fullPath = path.join(dirPath, item);
        const relativeItemPath = path.join(relativePath, item);
        
        if (fs.statSync(fullPath).isDirectory()) {
          // Vérifier si c'est un driver (contient driver.compose.json ou driver.js)
          if (fs.existsSync(path.join(fullPath, 'driver.compose.json')) || 
              fs.existsSync(path.join(fullPath, 'driver.js'))) {
            drivers.push(relativeItemPath);
          } else {
            // Continuer à scanner les sous-dossiers
            scanDirectory(fullPath, relativeItemPath);
          }
        }
      }
    }
    
    scanDirectory(this.driversPath);
    return drivers;
  }
}

// Exécuter l'analyse
async function main() {
  const engine = new MegaAnalysisEngine();
  await engine.runFullAnalysis();
}

if (require.main === module) {
  main().catch(console.error);
}

module.exports = MegaAnalysisEngine;
