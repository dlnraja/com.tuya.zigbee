const fs = require('fs');
const path = require('path');
const https = require('https');
const { execSync } = require('child_process');

class UltimateExternalSourcesAnalyzer {
  constructor() {
    this.extractedData = {
      johanRepo: {
        drivers: [],
        images: [],
        configs: [],
        documentation: []
      },
      homeyForum: {
        universalTuya: [],
        tuyaZigbee: [],
        userReports: [],
        deviceRequests: []
      },
      prsIssues: {
        openPRs: [],
        closedPRs: [],
        openIssues: [],
        closedIssues: []
      },
      homeyDocs: {
        imageSpecs: {},
        driverSpecs: {},
        sdkUpdates: []
      },
      nlpAnalysis: {
        deviceModels: new Set(),
        manufacturers: new Set(),
        capabilities: new Set(),
        clusters: new Set(),
        keywords: new Set()
      }
    };
    
    this.enrichmentResults = [];
  }

  async analyzeAllExternalSources() {
    console.log('🔍 ANALYSE ULTIME DES SOURCES EXTERNES...\n');
    
    // 1. Analyser les données existantes du projet
    await this.analyzeExistingProjectData();
    
    // 2. Analyser repo Johan Benz
    await this.analyzeJohanBenzRepo();
    
    // 3. Analyser données forum Homey existantes
    await this.analyzeExistingHomeyForumData();
    
    // 4. Analyser PRs et Issues existantes
    await this.analyzeExistingPRsIssues();
    
    // 5. Analyser documentation Homey
    await this.analyzeHomeyDocumentation();
    
    // 6. Analyse NLP complète
    await this.performNLPAnalysis();
    
    // 7. Synthèse et recommandations d'enrichissement
    await this.generateEnrichmentPlan();
    
    // 8. Générer rapport complet
    this.generateComprehensiveReport();
  }

  async analyzeExistingProjectData() {
    console.log('📊 Analyse données projet existantes...');
    
    // Analyser matrices existantes
    const matricesPath = './matrices';
    if (fs.existsSync(matricesPath)) {
      const matrixFiles = fs.readdirSync(matricesPath).filter(f => f.endsWith('.json'));
      
      for (const file of matrixFiles) {
        try {
          const data = JSON.parse(fs.readFileSync(path.join(matricesPath, file), 'utf8'));
          this.processMatrixData(file, data);
        } catch (e) {
          console.log(`  ⚠️ Erreur lecture ${file}`);
        }
      }
    }
    
    // Analyser données research existantes
    const researchPath = './research';
    if (fs.existsSync(researchPath)) {
      await this.processResearchData(researchPath);
    }
    
    // Analyser données resources existantes
    const resourcesPath = './resources';
    if (fs.existsSync(resourcesPath)) {
      await this.processResourcesData(resourcesPath);
    }
    
    console.log(`  ✅ Données projet analysées`);
  }

  processMatrixData(filename, data) {
    if (filename.includes('DEVICE') || filename.includes('COMPATIBILITY')) {
      // Extraire modèles de devices
      if (Array.isArray(data)) {
        data.forEach(item => {
          if (item.model) this.extractedData.nlpAnalysis.deviceModels.add(item.model);
          if (item.manufacturer) this.extractedData.nlpAnalysis.manufacturers.add(item.manufacturer);
          if (item.capabilities) {
            if (Array.isArray(item.capabilities)) {
              item.capabilities.forEach(cap => this.extractedData.nlpAnalysis.capabilities.add(cap));
            }
          }
        });
      }
    }
    
    if (filename.includes('CLUSTER')) {
      // Extraire clusters Zigbee
      if (Array.isArray(data)) {
        data.forEach(item => {
          if (item.cluster) this.extractedData.nlpAnalysis.clusters.add(item.cluster);
          if (item.clusterId) this.extractedData.nlpAnalysis.clusters.add(item.clusterId);
        });
      }
    }
  }

  async processResearchData(researchPath) {
    const subdirs = ['device-matrix', 'github', 'homey-forum', 'source-data'];
    
    for (const subdir of subdirs) {
      const subdirPath = path.join(researchPath, subdir);
      if (fs.existsSync(subdirPath)) {
        const files = fs.readdirSync(subdirPath).filter(f => f.endsWith('.json'));
        
        for (const file of files) {
          try {
            const data = JSON.parse(fs.readFileSync(path.join(subdirPath, file), 'utf8'));
            
            if (file.includes('johan') || file.includes('benz')) {
              this.extractedData.johanRepo.documentation.push(data);
            }
            
            if (file.includes('homey') || file.includes('forum')) {
              this.extractedData.homeyForum.universalTuya.push(data);
            }
            
            // Extraction NLP
            this.extractNLPFromData(data);
            
          } catch (e) {
            // Continue avec autres fichiers
          }
        }
      }
    }
  }

  async processResourcesData(resourcesPath) {
    const subdirs = ['forums', 'github'];
    
    for (const subdir of subdirs) {
      const subdirPath = path.join(resourcesPath, subdir);
      if (fs.existsSync(subdirPath)) {
        const files = fs.readdirSync(subdirPath).filter(f => f.endsWith('.json'));
        
        for (const file of files) {
          try {
            const data = JSON.parse(fs.readFileSync(path.join(subdirPath, file), 'utf8'));
            
            if (file.includes('homey-community')) {
              this.extractedData.homeyForum.universalTuya.push(data);
            }
            
            if (file.includes('johan-benz') || file.includes('issues-and-prs')) {
              this.extractedData.prsIssues.openIssues.push(data);
            }
            
            this.extractNLPFromData(data);
            
          } catch (e) {
            // Continue
          }
        }
      }
    }
  }

  extractNLPFromData(data) {
    const text = JSON.stringify(data).toLowerCase();
    
    // Extraire modèles de devices communs
    const devicePatterns = [
      /ts\d{4}[a-z]?/g,
      /tuya[\w-]*/g,
      /zigbee[\w-]*/g,
      /sensor[\w-]*/g,
      /switch[\w-]*/g,
      /light[\w-]*/g,
      /plug[\w-]*/g
    ];
    
    devicePatterns.forEach(pattern => {
      const matches = text.match(pattern);
      if (matches) {
        matches.forEach(match => this.extractedData.nlpAnalysis.deviceModels.add(match));
      }
    });
    
    // Extraire capabilities
    const capabilityPatterns = [
      /onoff/g,
      /dim/g,
      /measure_[\w]+/g,
      /alarm_[\w]+/g,
      /target_[\w]+/g,
      /light_[\w]+/g
    ];
    
    capabilityPatterns.forEach(pattern => {
      const matches = text.match(pattern);
      if (matches) {
        matches.forEach(match => this.extractedData.nlpAnalysis.capabilities.add(match));
      }
    });
    
    // Extraire clusters
    const clusterPattern = /\b\d{1,5}\b/g;
    const clusterMatches = text.match(clusterPattern);
    if (clusterMatches) {
      clusterMatches.forEach(match => {
        const num = parseInt(match);
        if (num > 0 && num < 0xFFFF) {
          this.extractedData.nlpAnalysis.clusters.add(num);
        }
      });
    }
  }

  async analyzeJohanBenzRepo() {
    console.log('👨‍💻 Analyse repo Johan Benz...');
    
    // Analyser tuya-light existant
    const tuyaLightPath = './tuya-light';
    if (fs.existsSync(tuyaLightPath)) {
      await this.analyzeJohanRepoLocal(tuyaLightPath);
    }
    
    // Analyser données github existantes
    const githubPath = './research/github';
    if (fs.existsSync(githubPath)) {
      const johanFiles = fs.readdirSync(githubPath).filter(f => f.includes('johan'));
      
      for (const file of johanFiles) {
        try {
          const data = JSON.parse(fs.readFileSync(path.join(githubPath, file), 'utf8'));
          this.processJohanData(data);
        } catch (e) {
          // Continue
        }
      }
    }
    
    console.log(`  ✅ Repo Johan analysé`);
  }

  async analyzeJohanRepoLocal(repoPath) {
    // Analyser drivers
    const driversPath = path.join(repoPath, 'drivers');
    if (fs.existsSync(driversPath)) {
      const drivers = fs.readdirSync(driversPath, { withFileTypes: true })
        .filter(item => item.isDirectory())
        .map(item => item.name);
      
      for (const driverId of drivers) {
        const driverPath = path.join(driversPath, driverId);
        const driverData = await this.analyzeJohanDriver(driverId, driverPath);
        this.extractedData.johanRepo.drivers.push(driverData);
      }
    }
    
    // Analyser app.json pour configurations
    const appJsonPath = path.join(repoPath, 'app.json');
    if (fs.existsSync(appJsonPath)) {
      try {
        const appConfig = JSON.parse(fs.readFileSync(appJsonPath, 'utf8'));
        this.extractedData.johanRepo.configs.push(appConfig);
      } catch (e) {
        // Continue
      }
    }
  }

  async analyzeJohanDriver(driverId, driverPath) {
    const driverData = {
      id: driverId,
      compose: null,
      device: null,
      driver: null,
      images: []
    };
    
    // Analyser compose
    const composeFile = path.join(driverPath, 'driver.compose.json');
    if (fs.existsSync(composeFile)) {
      try {
        driverData.compose = JSON.parse(fs.readFileSync(composeFile, 'utf8'));
      } catch (e) {
        // Continue
      }
    }
    
    // Analyser device.js
    const deviceFile = path.join(driverPath, 'device.js');
    if (fs.existsSync(deviceFile)) {
      driverData.device = fs.readFileSync(deviceFile, 'utf8');
    }
    
    // Analyser driver.js
    const driverFile = path.join(driverPath, 'driver.js');
    if (fs.existsSync(driverFile)) {
      driverData.driver = fs.readFileSync(driverFile, 'utf8');
    }
    
    // Analyser images
    const imagesPath = path.join(driverPath, 'assets', 'images');
    if (fs.existsSync(imagesPath)) {
      const images = fs.readdirSync(imagesPath).filter(f => f.endsWith('.png') || f.endsWith('.svg'));
      driverData.images = images.map(img => {
        const imgPath = path.join(imagesPath, img);
        const stat = fs.statSync(imgPath);
        return {
          name: img,
          size: stat.size,
          path: imgPath
        };
      });
    }
    
    return driverData;
  }

  processJohanData(data) {
    // Extraire informations des PRs et Issues
    if (data.pulls) {
      data.pulls.forEach(pr => {
        if (pr.state === 'open') {
          this.extractedData.prsIssues.openPRs.push(pr);
        } else {
          this.extractedData.prsIssues.closedPRs.push(pr);
        }
      });
    }
    
    if (data.issues) {
      data.issues.forEach(issue => {
        if (issue.state === 'open') {
          this.extractedData.prsIssues.openIssues.push(issue);
        } else {
          this.extractedData.prsIssues.closedIssues.push(issue);
        }
      });
    }
    
    // Extraction NLP
    this.extractNLPFromData(data);
  }

  async analyzeExistingHomeyForumData() {
    console.log('🏠 Analyse données forum Homey...');
    
    const forumPaths = [
      './resources/forums',
      './.external_sources'
    ];
    
    for (const forumPath of forumPaths) {
      if (fs.existsSync(forumPath)) {
        const files = fs.readdirSync(forumPath).filter(f => f.endsWith('.json'));
        
        for (const file of files) {
          try {
            const data = JSON.parse(fs.readFileSync(path.join(forumPath, file), 'utf8'));
            
            if (file.includes('homey') || file.includes('community')) {
              this.processHomeyForumData(data);
            }
            
          } catch (e) {
            // Continue
          }
        }
      }
    }
    
    console.log(`  ✅ Forum Homey analysé`);
  }

  processHomeyForumData(data) {
    // Extraire demandes d'appareils
    if (Array.isArray(data)) {
      data.forEach(item => {
        if (item.title && (item.title.includes('device') || item.title.includes('support'))) {
          this.extractedData.homeyForum.deviceRequests.push(item);
        }
        
        if (item.content) {
          this.extractNLPFromData({ content: item.content });
        }
      });
    } else if (data.posts || data.topics) {
      const posts = data.posts || data.topics || [];
      posts.forEach(post => {
        this.extractedData.homeyForum.userReports.push(post);
        this.extractNLPFromData(post);
      });
    }
  }

  async analyzeExistingPRsIssues() {
    console.log('🔧 Analyse PRs et Issues...');
    
    const githubPath = './resources/github';
    if (fs.existsSync(githubPath)) {
      const files = fs.readdirSync(githubPath).filter(f => f.endsWith('.json'));
      
      for (const file of files) {
        try {
          const data = JSON.parse(fs.readFileSync(path.join(githubPath, file), 'utf8'));
          this.processJohanData(data);
        } catch (e) {
          // Continue
        }
      }
    }
    
    console.log(`  ✅ PRs et Issues analysés`);
  }

  async analyzeHomeyDocumentation() {
    console.log('📚 Analyse documentation Homey...');
    
    // Spécifications d'images basées sur documentation Homey récente
    this.extractedData.homeyDocs.imageSpecs = {
      small: {
        size: '75x75',
        format: 'PNG',
        requirements: ['transparent_background', 'centered', 'simple_design']
      },
      large: {
        size: '500x500',
        format: 'PNG', 
        requirements: ['transparent_background', 'detailed', 'brand_consistent']
      }
    };
    
    // Spécifications drivers SDK3
    this.extractedData.homeyDocs.driverSpecs = {
      requiredFiles: ['driver.compose.json', 'device.js', 'driver.js'],
      requiredFields: ['id', 'name', 'class', 'capabilities', 'zigbee'],
      zigbeeRequirements: ['manufacturerName', 'productId', 'endpoints'],
      energyRequirements: ['batteries_for_battery_devices']
    };
    
    console.log(`  ✅ Documentation Homey analysée`);
  }

  async performNLPAnalysis() {
    console.log('🧠 Analyse NLP complète...');
    
    // Consolider toutes les données extraites
    const allDeviceModels = Array.from(this.extractedData.nlpAnalysis.deviceModels);
    const allManufacturers = Array.from(this.extractedData.nlpAnalysis.manufacturers);
    const allCapabilities = Array.from(this.extractedData.nlpAnalysis.capabilities);
    const allClusters = Array.from(this.extractedData.nlpAnalysis.clusters);
    
    console.log(`  📊 Modèles devices: ${allDeviceModels.length}`);
    console.log(`  🏭 Manufacturiers: ${allManufacturers.length}`);
    console.log(`  ⚙️ Capabilities: ${allCapabilities.length}`);
    console.log(`  📡 Clusters: ${allClusters.length}`);
    
    // Analyse de fréquence et pertinence
    this.analyzeFrequencyAndRelevance(allDeviceModels, allCapabilities);
    
    console.log(`  ✅ Analyse NLP terminée`);
  }

  analyzeFrequencyAndRelevance(deviceModels, capabilities) {
    // Analyser correspondance devices actuels vs données extraites
    const driversPath = './drivers';
    const currentDrivers = fs.readdirSync(driversPath, { withFileTypes: true })
      .filter(item => item.isDirectory())
      .map(item => item.name);
    
    const matches = [];
    const missingDevices = [];
    
    deviceModels.forEach(model => {
      const found = currentDrivers.some(driver => 
        driver.toLowerCase().includes(model.toLowerCase()) ||
        model.toLowerCase().includes(driver.toLowerCase())
      );
      
      if (found) {
        matches.push(model);
      } else {
        missingDevices.push(model);
      }
    });
    
    this.extractedData.nlpAnalysis.matches = matches;
    this.extractedData.nlpAnalysis.missingDevices = missingDevices.slice(0, 20); // Limiter à 20
  }

  async generateEnrichmentPlan() {
    console.log('📋 Génération plan d\'enrichissement...');
    
    const plan = {
      driverEnhancements: [],
      newDriverOpportunities: [],
      imageImprovements: [],
      configurationUpdates: [],
      documentationUpdates: []
    };
    
    // Enrichissements pour drivers existants
    const currentDrivers = fs.readdirSync('./drivers', { withFileTypes: true })
      .filter(item => item.isDirectory())
      .map(item => item.name);
    
    for (const driverId of currentDrivers.slice(0, 10)) { // Traiter par batch
      const enhancement = await this.generateDriverEnhancement(driverId);
      if (enhancement) {
        plan.driverEnhancements.push(enhancement);
      }
    }
    
    // Opportunités nouveaux drivers
    plan.newDriverOpportunities = this.extractedData.nlpAnalysis.missingDevices.slice(0, 5);
    
    // Améliorations images
    plan.imageImprovements = await this.generateImageImprovements();
    
    // Mises à jour configuration
    plan.configurationUpdates = await this.generateConfigurationUpdates();
    
    this.enrichmentResults = plan;
    console.log(`  ✅ Plan d'enrichissement généré`);
  }

  async generateDriverEnhancement(driverId) {
    const driverPath = path.join('./drivers', driverId);
    const composeFile = path.join(driverPath, 'driver.compose.json');
    
    if (!fs.existsSync(composeFile)) return null;
    
    try {
      const config = JSON.parse(fs.readFileSync(composeFile, 'utf8'));
      const enhancement = {
        driverId: driverId,
        currentCapabilities: config.capabilities || [],
        suggestedCapabilities: [],
        zigbeeOptimizations: [],
        imageUpdates: []
      };
      
      // Suggestions basées sur données Johan
      const johanDriver = this.extractedData.johanRepo.drivers.find(d => 
        d.id.toLowerCase().includes(driverId.toLowerCase()) ||
        driverId.toLowerCase().includes(d.id.toLowerCase())
      );
      
      if (johanDriver && johanDriver.compose) {
        const johanCapabilities = johanDriver.compose.capabilities || [];
        const newCapabilities = johanCapabilities.filter(cap => 
          !enhancement.currentCapabilities.includes(cap)
        );
        enhancement.suggestedCapabilities.push(...newCapabilities);
        
        // Optimisations Zigbee
        if (johanDriver.compose.zigbee) {
          enhancement.zigbeeOptimizations.push({
            type: 'clusters',
            suggestion: johanDriver.compose.zigbee.endpoints
          });
        }
      }
      
      // Suggestions basées sur NLP
      const relevantCapabilities = Array.from(this.extractedData.nlpAnalysis.capabilities)
        .filter(cap => !enhancement.currentCapabilities.includes(cap))
        .slice(0, 3);
      
      enhancement.suggestedCapabilities.push(...relevantCapabilities);
      
      return enhancement.suggestedCapabilities.length > 0 ? enhancement : null;
      
    } catch (e) {
      return null;
    }
  }

  async generateImageImprovements() {
    const improvements = [];
    const driversPath = './drivers';
    const drivers = fs.readdirSync(driversPath, { withFileTypes: true })
      .filter(item => item.isDirectory())
      .map(item => item.name);
    
    for (const driverId of drivers.slice(0, 10)) { // Limiter pour performance
      const imagesPath = path.join(driversPath, driverId, 'assets', 'images');
      
      if (fs.existsSync(imagesPath)) {
        const images = fs.readdirSync(imagesPath);
        const hasSmall = images.includes('small.png');
        const hasLarge = images.includes('large.png');
        
        if (!hasSmall || !hasLarge) {
          improvements.push({
            driverId: driverId,
            missing: {
              small: !hasSmall,
              large: !hasLarge
            },
            johanReference: this.findJohanImageReference(driverId)
          });
        } else {
          // Vérifier tailles
          const smallStat = fs.statSync(path.join(imagesPath, 'small.png'));
          const largeStat = fs.statSync(path.join(imagesPath, 'large.png'));
          
          if (smallStat.size < 1000 || largeStat.size < 2000) {
            improvements.push({
              driverId: driverId,
              issue: 'undersized_images',
              johanReference: this.findJohanImageReference(driverId)
            });
          }
        }
      }
    }
    
    return improvements;
  }

  findJohanImageReference(driverId) {
    const johanDriver = this.extractedData.johanRepo.drivers.find(d => 
      d.id.toLowerCase().includes(driverId.toLowerCase()) ||
      driverId.toLowerCase().includes(d.id.toLowerCase())
    );
    
    return johanDriver ? johanDriver.images : null;
  }

  async generateConfigurationUpdates() {
    const updates = [];
    
    // Mises à jour basées sur les configs de Johan
    this.extractedData.johanRepo.configs.forEach(config => {
      if (config.permissions && config.permissions.length > 0) {
        updates.push({
          type: 'permissions',
          suggestion: config.permissions,
          source: 'johan_repo'
        });
      }
      
      if (config.compatibility) {
        updates.push({
          type: 'compatibility',
          suggestion: config.compatibility,
          source: 'johan_repo'
        });
      }
    });
    
    return updates;
  }

  generateComprehensiveReport() {
    console.log('\n📊 RAPPORT ANALYSE SOURCES EXTERNES:');
    console.log('='.repeat(60));
    
    console.log(`📈 DONNÉES EXTRAITES:`);
    console.log(`  🔧 Drivers Johan: ${this.extractedData.johanRepo.drivers.length}`);
    console.log(`  📄 Configs Johan: ${this.extractedData.johanRepo.configs.length}`);
    console.log(`  🏠 Posts Forum: ${this.extractedData.homeyForum.userReports.length}`);
    console.log(`  🔧 PRs ouvertes: ${this.extractedData.prsIssues.openPRs.length}`);
    console.log(`  🐛 Issues ouvertes: ${this.extractedData.prsIssues.openIssues.length}`);
    
    console.log(`\n🧠 ANALYSE NLP:`);
    console.log(`  📱 Modèles devices: ${Array.from(this.extractedData.nlpAnalysis.deviceModels).length}`);
    console.log(`  🏭 Manufacturiers: ${Array.from(this.extractedData.nlpAnalysis.manufacturers).length}`);
    console.log(`  ⚙️ Capabilities: ${Array.from(this.extractedData.nlpAnalysis.capabilities).length}`);
    console.log(`  📡 Clusters: ${Array.from(this.extractedData.nlpAnalysis.clusters).length}`);
    
    console.log(`\n📋 PLAN ENRICHISSEMENT:`);
    console.log(`  🔧 Drivers à enrichir: ${this.enrichmentResults.driverEnhancements?.length || 0}`);
    console.log(`  🆕 Nouvelles opportunités: ${this.enrichmentResults.newDriverOpportunities?.length || 0}`);
    console.log(`  🖼️ Images à améliorer: ${this.enrichmentResults.imageImprovements?.length || 0}`);
    console.log(`  ⚙️ Configs à mettre à jour: ${this.enrichmentResults.configurationUpdates?.length || 0}`);
    
    // Sauvegarder rapport complet
    const report = {
      timestamp: new Date().toISOString(),
      extractedData: {
        johanRepoDriversCount: this.extractedData.johanRepo.drivers.length,
        homeyForumPostsCount: this.extractedData.homeyForum.userReports.length,
        openPRsCount: this.extractedData.prsIssues.openPRs.length,
        openIssuesCount: this.extractedData.prsIssues.openIssues.length,
        nlpAnalysis: {
          deviceModelsCount: Array.from(this.extractedData.nlpAnalysis.deviceModels).length,
          manufacturersCount: Array.from(this.extractedData.nlpAnalysis.manufacturers).length,
          capabilitiesCount: Array.from(this.extractedData.nlpAnalysis.capabilities).length,
          clustersCount: Array.from(this.extractedData.nlpAnalysis.clusters).length,
          topDeviceModels: Array.from(this.extractedData.nlpAnalysis.deviceModels).slice(0, 10),
          topCapabilities: Array.from(this.extractedData.nlpAnalysis.capabilities).slice(0, 10)
        }
      },
      enrichmentPlan: this.enrichmentResults,
      recommendations: this.generateRecommendations()
    };
    
    fs.writeFileSync('./ultimate_external_sources_analysis.json', JSON.stringify(report, null, 2));
    console.log('\n📄 Rapport sauvé: ultimate_external_sources_analysis.json');
    
    console.log('\n🚀 PRÊT POUR ENRICHISSEMENT ULTIME!');
  }

  generateRecommendations() {
    return [
      'Appliquer enrichissements drivers identifiés',
      'Mettre à jour images selon standards Homey + style Johan',
      'Intégrer nouvelles capabilities découvertes',
      'Optimiser configurations Zigbee',
      'Ajouter nouveaux drivers pour devices manquants'
    ];
  }
}

// Exécuter analyse complète
const analyzer = new UltimateExternalSourcesAnalyzer();
analyzer.analyzeAllExternalSources().catch(console.error);
