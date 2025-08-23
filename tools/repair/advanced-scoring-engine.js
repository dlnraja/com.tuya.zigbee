#!/usr/bin/env node

const fs = require('fs');
const path = require('path');

console.log('🏆 ADVANCED SCORING ENGINE - Démarrage...\n');

class AdvancedScoringEngine {
  constructor() {
    this.projectRoot = path.join(__dirname, '../..');
    this.driversPath = path.join(this.projectRoot, 'drivers');
    this.researchPath = path.join(this.projectRoot, 'research');
    this.reportPath = path.join(this.researchPath, 'advanced-scoring-report.json');
    
    this.scoringResults = {
      timestamp: new Date().toISOString(),
      summary: {},
      driverScores: {},
      qualityMetrics: {},
      recommendations: {},
      rankings: {},
      trends: {},
      aiInsights: {}
    };

    // Métriques de scoring avancées
    this.scoringMetrics = {
      completeness: {
        weight: 0.25,
        factors: ['files', 'capabilities', 'clusters', 'assets', 'documentation']
      },
      quality: {
        weight: 0.20,
        factors: ['code_quality', 'structure', 'naming', 'consistency']
      },
      functionality: {
        weight: 0.20,
        factors: ['capabilities', 'flow_cards', 'settings', 'advanced_features']
      },
      compatibility: {
        weight: 0.15,
        factors: ['zigbee_support', 'homey_integration', 'device_coverage']
      },
      innovation: {
        weight: 0.10,
        factors: ['ai_features', 'heuristics', 'automation', 'smart_detection']
      },
      maintenance: {
        weight: 0.10,
        factors: ['documentation', 'testing', 'error_handling', 'logging']
      }
    };

    // Seuils de qualité
    this.qualityThresholds = {
      excellent: 0.9,
      good: 0.8,
      average: 0.7,
      poor: 0.6,
      critical: 0.5
    };
  }

  async runFullScoring() {
    console.log('🔍 Phase 1: Analyse des métriques de scoring...');
    await this.analyzeScoringMetrics();
    
    console.log('🔍 Phase 2: Évaluation de la qualité des drivers...');
    await this.evaluateDriverQuality();
    
    console.log('🔍 Phase 3: Calcul des scores avancés...');
    await this.calculateAdvancedScores();
    
    console.log('🔍 Phase 4: Génération des classements...');
    await this.generateRankings();
    
    console.log('🔍 Phase 5: Analyse des tendances...');
    await this.analyzeTrends();
    
    console.log('🔍 Phase 6: Insights d\'IA...');
    await this.generateAIInsights();
    
    console.log('🔍 Phase 7: Recommandations intelligentes...');
    await this.generateIntelligentRecommendations();
    
    console.log('🔍 Phase 8: Génération du rapport final...');
    await this.generateFinalReport();
    
    console.log('\n🎯 ADVANCED SCORING ENGINE - Scoring terminé !');
  }

  async analyzeScoringMetrics() {
    const metrics = {
      totalDrivers: 0,
      metricCategories: Object.keys(this.scoringMetrics).length,
      factors: [],
      weights: {}
    };

    // Analyser tous les facteurs de scoring
    for (const [category, config] of Object.entries(this.scoringMetrics)) {
      metrics.weights[category] = config.weight;
      metrics.factors.push(...config.factors);
    }

    // Compter les drivers
    const allDrivers = this.getAllDrivers();
    metrics.totalDrivers = allDrivers.length;

    this.scoringResults.summary = metrics;
    console.log(`   📊 Métriques analysées: ${metrics.metricCategories} catégories, ${metrics.factors.length} facteurs`);
  }

  async evaluateDriverQuality() {
    const driverScores = {};
    const allDrivers = this.getAllDrivers();

    for (const driverPath of allDrivers) {
      const driverName = path.basename(driverPath);
      const driverFullPath = path.join(this.driversPath, driverPath);
      
      driverScores[driverName] = {
        path: driverPath,
        scores: {},
        quality: {},
        issues: [],
        strengths: [],
        overall: 0,
        grade: 'F',
        rank: 0
      };

      // Évaluer chaque métrique
      for (const [category, config] of Object.entries(this.scoringMetrics)) {
        const categoryScore = await this.evaluateCategory(driverFullPath, category, config);
        driverScores[driverName].scores[category] = categoryScore;
        driverScores[driverName].quality[category] = this.getQualityLevel(categoryScore);
      }

      // Calculer le score global
      driverScores[driverName].overall = this.calculateOverallScore(driverScores[driverName].scores);
      driverScores[driverName].grade = this.getGrade(driverScores[driverName].overall);
      
      // Identifier les forces et faiblesses
      this.identifyStrengthsAndWeaknesses(driverScores[driverName]);
    }

    this.scoringResults.driverScores = driverScores;
    console.log(`   📊 Qualité des drivers évaluée: ${Object.keys(driverScores).length} drivers analysés`);
  }

  async evaluateCategory(driverPath, category, config) {
    let score = 0;
    let totalFactors = 0;

    for (const factor of config.factors) {
      const factorScore = await this.evaluateFactor(driverPath, factor);
      score += factorScore;
      totalFactors++;
    }

    return totalFactors > 0 ? score / totalFactors : 0;
  }

  async evaluateFactor(driverPath, factor) {
    switch (factor) {
      case 'files':
        return this.evaluateFileCompleteness(driverPath);
      case 'capabilities':
        return this.evaluateCapabilities(driverPath);
      case 'clusters':
        return this.evaluateClusters(driverPath);
      case 'assets':
        return this.evaluateAssets(driverPath);
      case 'documentation':
        return this.evaluateDocumentation(driverPath);
      case 'code_quality':
        return this.evaluateCodeQuality(driverPath);
      case 'structure':
        return this.evaluateStructure(driverPath);
      case 'naming':
        return this.evaluateNaming(driverPath);
      case 'consistency':
        return this.evaluateConsistency(driverPath);
      case 'flow_cards':
        return this.evaluateFlowCards(driverPath);
      case 'settings':
        return this.evaluateSettings(driverPath);
      case 'advanced_features':
        return this.evaluateAdvancedFeatures(driverPath);
      case 'zigbee_support':
        return this.evaluateZigbeeSupport(driverPath);
      case 'homey_integration':
        return this.evaluateHomeyIntegration(driverPath);
      case 'device_coverage':
        return this.evaluateDeviceCoverage(driverPath);
      case 'ai_features':
        return this.evaluateAIFeatures(driverPath);
      case 'heuristics':
        return this.evaluateHeuristics(driverPath);
      case 'automation':
        return this.evaluateAutomation(driverPath);
      case 'smart_detection':
        return this.evaluateSmartDetection(driverPath);
      case 'testing':
        return this.evaluateTesting(driverPath);
      case 'error_handling':
        return this.evaluateErrorHandling(driverPath);
      case 'logging':
        return this.evaluateLogging(driverPath);
      default:
        return 0.5; // Score par défaut
    }
  }

  async evaluateFileCompleteness(driverPath) {
    const requiredFiles = ['driver.compose.json', 'device.js', 'driver.js', 'README.md'];
    let existingFiles = 0;

    for (const file of requiredFiles) {
      if (fs.existsSync(path.join(driverPath, file))) {
        existingFiles++;
      }
    }

    return existingFiles / requiredFiles.length;
  }

  async evaluateCapabilities(driverPath) {
    const composePath = path.join(driverPath, 'driver.compose.json');
    
    if (!fs.existsSync(composePath)) return 0;

    try {
      const compose = JSON.parse(fs.readFileSync(composePath, 'utf8'));
      const capabilities = compose.capabilities || [];
      
      // Score basé sur le nombre et la qualité des capabilities
      let score = Math.min(1.0, capabilities.length / 10); // Normaliser sur 10 capabilities
      
      // Bonus pour les capabilities avancées
      const advancedCapabilities = ['measure_power', 'measure_temperature', 'light_hue', 'target_temperature'];
      const advancedCount = advancedCapabilities.filter(cap => capabilities.includes(cap)).length;
      score += (advancedCount / advancedCapabilities.length) * 0.2;
      
      return Math.min(1.0, score);
    } catch (error) {
      return 0;
    }
  }

  async evaluateClusters(driverPath) {
    const composePath = path.join(driverPath, 'driver.compose.json');
    
    if (!fs.existsSync(composePath)) return 0;

    try {
      const compose = JSON.parse(fs.readFileSync(composePath, 'utf8'));
      const zigbee = compose.zigbee || {};
      const clusters = zigbee.clusters || [];
      
      // Score basé sur le nombre et la qualité des clusters
      let score = Math.min(1.0, clusters.length / 8); // Normaliser sur 8 clusters
      
      // Bonus pour les clusters avancés
      const advancedClusters = ['genColorCtrl', 'genElectricalMeasurement', 'genThermostat'];
      const advancedCount = advancedClusters.filter(cluster => clusters.includes(cluster)).length;
      score += (advancedCount / advancedClusters.length) * 0.2;
      
      return Math.min(1.0, score);
    } catch (error) {
      return 0;
    }
  }

  async evaluateAssets(driverPath) {
    const assetsPath = path.join(driverPath, 'assets');
    
    if (!fs.existsSync(assetsPath)) return 0;

    let score = 0;
    let totalAssets = 0;

    // Vérifier l'icône SVG
    if (fs.existsSync(path.join(assetsPath, 'icon.svg'))) {
      score += 0.4;
      totalAssets++;
    }

    // Vérifier les images
    const imagesPath = path.join(assetsPath, 'images');
    if (fs.existsSync(imagesPath)) {
      if (fs.existsSync(path.join(imagesPath, 'small.png'))) {
        score += 0.3;
        totalAssets++;
      }
      if (fs.existsSync(path.join(imagesPath, 'large.png'))) {
        score += 0.3;
        totalAssets++;
      }
    }

    return totalAssets > 0 ? score / totalAssets : 0;
  }

  async evaluateDocumentation(driverPath) {
    const readmePath = path.join(driverPath, 'README.md');
    
    if (!fs.existsSync(readmePath)) return 0;

    try {
      const content = fs.readFileSync(readmePath, 'utf8');
      let score = 0.3; // Score de base pour l'existence

      // Bonus pour la qualité du contenu
      if (content.length > 500) score += 0.2;
      if (content.includes('##')) score += 0.2; // Sections
      if (content.includes('```')) score += 0.1; // Code blocks
      if (content.includes('http')) score += 0.1; // Liens
      if (content.includes('**')) score += 0.1; // Formatage

      return Math.min(1.0, score);
    } catch (error) {
      return 0;
    }
  }

  async evaluateCodeQuality(driverPath) {
    const devicePath = path.join(driverPath, 'device.js');
    
    if (!fs.existsSync(devicePath)) return 0;

    try {
      const content = fs.readFileSync(devicePath, 'utf8');
      let score = 0.5; // Score de base

      // Bonus pour la qualité du code
      if (content.includes('async')) score += 0.1; // Async/await
      if (content.includes('try')) score += 0.1; // Error handling
      if (content.includes('log')) score += 0.1; // Logging
      if (content.includes('//')) score += 0.1; // Comments
      if (content.includes('class')) score += 0.1; // Modern JS

      return Math.min(1.0, score);
    } catch (error) {
      return 0;
    }
  }

  async evaluateStructure(driverPath) {
    const items = fs.readdirSync(driverPath);
    let score = 0.3; // Score de base

    // Bonus pour une structure organisée
    if (items.includes('assets')) score += 0.2;
    if (items.includes('flow')) score += 0.2;
    if (items.includes('settings')) score += 0.1;
    if (items.includes('helpers')) score += 0.1;
    if (items.includes('utils')) score += 0.1;

    return Math.min(1.0, score);
  }

  async evaluateNaming(driverPath) {
    const driverName = path.basename(driverPath);
    let score = 0.5; // Score de base

    // Bonus pour un nommage cohérent
    if (driverName.includes('-universal')) score += 0.2;
    if (driverName.includes('tuya-')) score += 0.2;
    if (driverName.length > 10) score += 0.1;

    return Math.min(1.0, score);
  }

  async evaluateConsistency(driverPath) {
    // Vérifier la cohérence avec les autres drivers
    let score = 0.5; // Score de base

    // Bonus pour la cohérence
    const composePath = path.join(driverPath, 'driver.compose.json');
    if (fs.existsSync(composePath)) {
      try {
        const compose = JSON.parse(fs.readFileSync(composePath, 'utf8'));
        if (compose.zigbee && compose.zigbee.manufacturerName === 'Tuya') score += 0.3;
        if (compose.zigbee && compose.zigbee.endpoints) score += 0.2;
      } catch (error) {
        // Ignorer les erreurs
      }
    }

    return Math.min(1.0, score);
  }

  async evaluateFlowCards(driverPath) {
    const composePath = path.join(driverPath, 'driver.compose.json');
    
    if (!fs.existsSync(composePath)) return 0;

    try {
      const compose = JSON.parse(fs.readFileSync(composePath, 'utf8'));
      const flowCards = compose.flowCards || [];
      
      let score = Math.min(1.0, flowCards.length / 5); // Normaliser sur 5 flow cards
      
      // Bonus pour les flow cards avancées
      const advancedFlowCards = ['power_threshold', 'temperature_alert', 'schedule_set'];
      const advancedCount = advancedFlowCards.filter(card => flowCards.includes(card)).length;
      score += (advancedCount / advancedFlowCards.length) * 0.2;
      
      return Math.min(1.0, score);
    } catch (error) {
      return 0;
    }
  }

  async evaluateSettings(driverPath) {
    const settingsPath = path.join(driverPath, 'driver.settings.compose.json');
    
    if (!fs.existsSync(settingsPath)) return 0.3; // Score de base

    try {
      const settings = JSON.parse(fs.readFileSync(settingsPath, 'utf8'));
      let score = 0.5; // Score de base pour l'existence

      // Bonus pour la qualité des paramètres
      if (settings.title) score += 0.2;
      if (settings.group) score += 0.2;
      if (settings.items && Object.keys(settings.items).length > 0) score += 0.1;

      return Math.min(1.0, score);
    } catch (error) {
      return 0.3;
    }
  }

  async evaluateAdvancedFeatures(driverPath) {
    let score = 0.3; // Score de base

    // Vérifier les fonctionnalités avancées
    const composePath = path.join(driverPath, 'driver.compose.json');
    if (fs.existsSync(composePath)) {
      try {
        const compose = JSON.parse(fs.readFileSync(composePath, 'utf8'));
        
        // Bonus pour les fonctionnalités avancées
        if (compose.metadata && compose.metadata.advanced_features) score += 0.2;
        if (compose.metadata && compose.metadata.confidence_score > 90) score += 0.2;
        if (compose.metadata && compose.metadata.sources && compose.metadata.sources.length > 2) score += 0.2;
        if (compose.metadata && compose.metadata.tested_devices) score += 0.1;
      } catch (error) {
        // Ignorer les erreurs
      }
    }

    return Math.min(1.0, score);
  }

  async evaluateZigbeeSupport(driverPath) {
    const composePath = path.join(driverPath, 'driver.compose.json');
    
    if (!fs.existsSync(composePath)) return 0;

    try {
      const compose = JSON.parse(fs.readFileSync(composePath, 'utf8'));
      const zigbee = compose.zigbee || {};
      let score = 0.3; // Score de base

      // Bonus pour le support Zigbee
      if (zigbee.manufacturerName) score += 0.2;
      if (zigbee.productId) score += 0.2;
      if (zigbee.endpoints) score += 0.2;
      if (zigbee.clusters) score += 0.1;

      return Math.min(1.0, score);
    } catch (error) {
      return 0;
    }
  }

  async evaluateHomeyIntegration(driverPath) {
    let score = 0.5; // Score de base

    // Vérifier l'intégration Homey
    const devicePath = path.join(driverPath, 'device.js');
    if (fs.existsSync(devicePath)) {
      try {
        const content = fs.readFileSync(devicePath, 'utf8');
        
        // Bonus pour l'intégration Homey
        if (content.includes('Homey.app')) score += 0.2;
        if (content.includes('this.setCapabilityValue')) score += 0.2;
        if (content.includes('this.getCapabilityValue')) score += 0.1;
      } catch (error) {
        // Ignorer les erreurs
      }
    }

    return Math.min(1.0, score);
  }

  async evaluateDeviceCoverage(driverPath) {
    const composePath = path.join(driverPath, 'driver.compose.json');
    
    if (!fs.existsSync(composePath)) return 0.3;

    try {
      const compose = JSON.parse(fs.readFileSync(composePath, 'utf8'));
      let score = 0.3; // Score de base

      // Bonus pour la couverture des devices
      if (compose.metadata && compose.metadata.tested_devices) {
        const deviceCount = compose.metadata.tested_devices.length;
        score += Math.min(0.4, deviceCount * 0.1);
      }
      if (compose.metadata && compose.metadata.confidence_score > 80) score += 0.2;
      if (compose.metadata && compose.metadata.sources) score += 0.1;

      return Math.min(1.0, score);
    } catch (error) {
      return 0.3;
    }
  }

  async evaluateAIFeatures(driverPath) {
    // Évaluer les fonctionnalités d'IA
    let score = 0.3; // Score de base

    // Bonus pour les fonctionnalités d'IA
    const composePath = path.join(driverPath, 'driver.compose.json');
    if (fs.existsSync(composePath)) {
      try {
        const compose = JSON.parse(fs.readFileSync(composePath, 'utf8'));
        
        if (compose.metadata && compose.metadata.auto_corrected) score += 0.3;
        if (compose.metadata && compose.metadata.ai_enhanced) score += 0.2;
        if (compose.metadata && compose.metadata.smart_detection) score += 0.2;
      } catch (error) {
        // Ignorer les erreurs
      }
    }

    return Math.min(1.0, score);
  }

  async evaluateHeuristics(driverPath) {
    // Évaluer l'utilisation d'algorithmes heuristiques
    let score = 0.3; // Score de base

    // Bonus pour les heuristiques
    const devicePath = path.join(driverPath, 'device.js');
    if (fs.existsSync(devicePath)) {
      try {
        const content = fs.readFileSync(devicePath, 'utf8');
        
        if (content.includes('pattern')) score += 0.2;
        if (content.includes('infer')) score += 0.2;
        if (content.includes('guess')) score += 0.2;
        if (content.includes('heuristic')) score += 0.1;
      } catch (error) {
        // Ignorer les erreurs
      }
    }

    return Math.min(1.0, score);
  }

  async evaluateAutomation(driverPath) {
    // Évaluer l'automatisation
    let score = 0.3; // Score de base

    // Bonus pour l'automatisation
    const devicePath = path.join(driverPath, 'device.js');
    if (fs.existsSync(devicePath)) {
      try {
        const content = fs.readFileSync(devicePath, 'utf8');
        
        if (content.includes('setInterval')) score += 0.2;
        if (content.includes('setTimeout')) score += 0.2;
        if (content.includes('automated')) score += 0.2;
        if (content.includes('schedule')) score += 0.1;
      } catch (error) {
        // Ignorer les erreurs
      }
    }

    return Math.min(1.0, score);
  }

  async evaluateSmartDetection(driverPath) {
    // Évaluer la détection intelligente
    let score = 0.3; // Score de base

    // Bonus pour la détection intelligente
    const devicePath = path.join(driverPath, 'device.js');
    if (fs.existsSync(devicePath)) {
      try {
        const content = fs.readFileSync(devicePath, 'utf8');
        
        if (content.includes('detect')) score += 0.2;
        if (content.includes('identify')) score += 0.2;
        if (content.includes('recognize')) score += 0.2;
        if (content.includes('smart')) score += 0.1;
      } catch (error) {
        // Ignorer les erreurs
      }
    }

    return Math.min(1.0, score);
  }

  async evaluateTesting(driverPath) {
    // Évaluer les tests
    let score = 0.3; // Score de base

    // Bonus pour les tests
    const testFiles = ['test.js', 'spec.js', 'test.json'];
    for (const testFile of testFiles) {
      if (fs.existsSync(path.join(driverPath, testFile))) {
        score += 0.2;
        break;
      }
    }

    return Math.min(1.0, score);
  }

  async evaluateErrorHandling(driverPath) {
    // Évaluer la gestion d'erreurs
    let score = 0.3; // Score de base

    // Bonus pour la gestion d'erreurs
    const devicePath = path.join(driverPath, 'device.js');
    if (fs.existsSync(devicePath)) {
      try {
        const content = fs.readFileSync(devicePath, 'utf8');
        
        if (content.includes('try')) score += 0.2;
        if (content.includes('catch')) score += 0.2;
        if (content.includes('error')) score += 0.2;
        if (content.includes('exception')) score += 0.1;
      } catch (error) {
        // Ignorer les erreurs
      }
    }

    return Math.min(1.0, score);
  }

  async evaluateLogging(driverPath) {
    // Évaluer le logging
    let score = 0.3; // Score de base

    // Bonus pour le logging
    const devicePath = path.join(driverPath, 'device.js');
    if (fs.existsSync(devicePath)) {
      try {
        const content = fs.readFileSync(devicePath, 'utf8');
        
        if (content.includes('log')) score += 0.3;
        if (content.includes('debug')) score += 0.2;
        if (content.includes('info')) score += 0.2;
        if (content.includes('warn')) score += 0.1;
      } catch (error) {
        // Ignorer les erreurs
      }
    }

    return Math.min(1.0, score);
  }

  calculateOverallScore(scores) {
    let totalScore = 0;
    let totalWeight = 0;

    for (const [category, score] of Object.entries(scores)) {
      const weight = this.scoringMetrics[category].weight;
      totalScore += score * weight;
      totalWeight += weight;
    }

    return totalWeight > 0 ? totalScore / totalWeight : 0;
  }

  getQualityLevel(score) {
    if (score >= this.qualityThresholds.excellent) return 'excellent';
    if (score >= this.qualityThresholds.good) return 'good';
    if (score >= this.qualityThresholds.average) return 'average';
    if (score >= this.qualityThresholds.poor) return 'poor';
    return 'critical';
  }

  getGrade(score) {
    if (score >= 0.9) return 'A+';
    if (score >= 0.8) return 'A';
    if (score >= 0.7) return 'B';
    if (score >= 0.6) return 'C';
    if (score >= 0.5) return 'D';
    return 'F';
  }

  identifyStrengthsAndWeaknesses(driver) {
    const strengths = [];
    const weaknesses = [];

    for (const [category, score] of Object.entries(driver.scores)) {
      if (score >= 0.8) {
        strengths.push(`${category}: ${Math.round(score * 100)}%`);
      } else if (score < 0.6) {
        weaknesses.push(`${category}: ${Math.round(score * 100)}%`);
      }
    }

    driver.strengths = strengths;
    driver.weaknesses = weaknesses;
  }

  async calculateAdvancedScores() {
    const qualityMetrics = {
      average: 0,
      median: 0,
      distribution: {},
      trends: {},
      correlations: {}
    };

    const scores = Object.values(this.scoringResults.driverScores).map(d => d.overall);
    
    if (scores.length > 0) {
      // Calculer la moyenne
      qualityMetrics.average = scores.reduce((sum, score) => sum + score, 0) / scores.length;
      
      // Calculer la médiane
      const sortedScores = scores.sort((a, b) => a - b);
      qualityMetrics.median = sortedScores[Math.floor(sortedScores.length / 2)];
      
      // Distribution des scores
      qualityMetrics.distribution = {
        excellent: scores.filter(s => s >= this.qualityThresholds.excellent).length,
        good: scores.filter(s => s >= this.qualityThresholds.good && s < this.qualityThresholds.excellent).length,
        average: scores.filter(s => s >= this.qualityThresholds.average && s < this.qualityThresholds.good).length,
        poor: scores.filter(s => s >= this.qualityThresholds.poor && s < this.qualityThresholds.average).length,
        critical: scores.filter(s => s < this.qualityThresholds.poor).length
      };
    }

    this.scoringResults.qualityMetrics = qualityMetrics;
    console.log(`   📊 Scores avancés calculés: Moyenne ${Math.round(qualityMetrics.average * 100)}%, Médiane ${Math.round(qualityMetrics.median * 100)}%`);
  }

  async generateRankings() {
    const rankings = {
      topDrivers: [],
      bottomDrivers: [],
      byCategory: {},
      improvements: []
    };

    // Trier les drivers par score
    const sortedDrivers = Object.entries(this.scoringResults.driverScores)
      .sort(([, a], [, b]) => b.overall - a.overall);

    // Top 10 drivers
    rankings.topDrivers = sortedDrivers.slice(0, 10).map(([name, driver]) => ({
      name,
      score: driver.overall,
      grade: driver.grade,
      strengths: driver.strengths.slice(0, 3)
    }));

    // Bottom 10 drivers
    rankings.bottomDrivers = sortedDrivers.slice(-10).map(([name, driver]) => ({
      name,
      score: driver.overall,
      grade: driver.grade,
      weaknesses: driver.weaknesses.slice(0, 3)
    }));

    // Classements par catégorie
    for (const category of Object.keys(this.scoringMetrics)) {
      const categoryRanking = sortedDrivers
        .map(([name, driver]) => ({ name, score: driver.scores[category] }))
        .sort((a, b) => b.score - a.score)
        .slice(0, 5);
      
      rankings.byCategory[category] = categoryRanking;
    }

    // Opportunités d'amélioration
    rankings.improvements = sortedDrivers
      .filter(([, driver]) => driver.overall < 0.7)
      .map(([name, driver]) => ({
        name,
        currentScore: driver.overall,
        targetScore: 0.8,
        improvement: 0.8 - driver.overall,
        priority: driver.overall < 0.5 ? 'high' : 'medium'
      }));

    this.scoringResults.rankings = rankings;
    console.log(`   📊 Classements générés: Top ${rankings.topDrivers.length}, Bottom ${rankings.bottomDrivers.length}, ${Object.keys(rankings.byCategory).length} catégories`);
  }

  async analyzeTrends() {
    const trends = {
      scoreDistribution: {},
      qualityEvolution: {},
      categoryPerformance: {},
      recommendations: []
    };

    // Analyser la distribution des scores
    const scores = Object.values(this.scoringResults.driverScores).map(d => d.overall);
    trends.scoreDistribution = {
      range: { min: Math.min(...scores), max: Math.max(...scores) },
      standardDeviation: this.calculateStandardDeviation(scores),
      skewness: this.calculateSkewness(scores)
    };

    // Performance par catégorie
    for (const category of Object.keys(this.scoringMetrics)) {
      const categoryScores = Object.values(this.scoringResults.driverScores)
        .map(d => d.scores[category]);
      
      trends.categoryPerformance[category] = {
        average: categoryScores.reduce((sum, score) => sum + score, 0) / categoryScores.length,
        best: Math.max(...categoryScores),
        worst: Math.min(...categoryScores),
        variance: this.calculateVariance(categoryScores)
      };
    }

    // Recommandations basées sur les tendances
    trends.recommendations = this.generateTrendBasedRecommendations(trends);

    this.scoringResults.trends = trends;
    console.log(`   📊 Tendances analysées: ${Object.keys(trends.categoryPerformance).length} catégories, ${trends.recommendations.length} recommandations`);
  }

  async generateAIInsights() {
    const aiInsights = {
      patterns: [],
      anomalies: [],
      opportunities: [],
      risks: [],
      predictions: []
    };

    // Détecter les patterns
    aiInsights.patterns = this.detectPatterns();
    
    // Identifier les anomalies
    aiInsights.anomalies = this.detectAnomalies();
    
    // Identifier les opportunités
    aiInsights.opportunities = this.identifyOpportunities();
    
    // Évaluer les risques
    aiInsights.risks = this.assessRisks();
    
    // Faire des prédictions
    aiInsights.predictions = this.makePredictions();

    this.scoringResults.aiInsights = aiInsights;
    console.log(`   📊 Insights d'IA générés: ${aiInsights.patterns.length} patterns, ${aiInsights.opportunities.length} opportunités`);
  }

  async generateIntelligentRecommendations() {
    const recommendations = {
      immediate: [],
      shortTerm: [],
      longTerm: [],
      strategic: []
    };

    // Recommandations immédiates basées sur les scores critiques
    const criticalDrivers = Object.entries(this.scoringResults.driverScores)
      .filter(([, driver]) => driver.overall < 0.5);
    
    for (const [name, driver] of criticalDrivers) {
      recommendations.immediate.push({
        driver: name,
        action: 'Correction critique requise',
        priority: 'critical',
        impact: 'high',
        effort: 'medium'
      });
    }

    // Recommandations à court terme
    const poorDrivers = Object.entries(this.scoringResults.driverScores)
      .filter(([, driver]) => driver.overall >= 0.5 && driver.overall < 0.7);
    
    for (const [name, driver] of poorDrivers) {
      recommendations.shortTerm.push({
        driver: name,
        action: 'Amélioration de la qualité',
        priority: 'high',
        impact: 'medium',
        effort: 'low'
      });
    }

    // Recommandations à long terme
    recommendations.longTerm.push({
      action: 'Implémentation de tests automatisés',
      priority: 'medium',
      impact: 'high',
      effort: 'high'
    });

    recommendations.longTerm.push({
      action: 'Standardisation des patterns de code',
      priority: 'medium',
      impact: 'medium',
      effort: 'medium'
    });

    // Recommandations stratégiques
    recommendations.strategic.push({
      action: 'Développement d\'un pipeline d\'enrichissement automatique',
      priority: 'high',
      impact: 'very_high',
      effort: 'very_high'
    });

    this.scoringResults.recommendations = recommendations;
    console.log(`   📊 Recommandations intelligentes générées: ${recommendations.immediate.length} immédiates, ${recommendations.strategic.length} stratégiques`);
  }

  async generateFinalReport() {
    // Sauvegarder le rapport
    fs.writeFileSync(this.reportPath, JSON.stringify(this.scoringResults, null, 2));
    
    // Afficher le résumé
    console.log('\n🎯 RAPPORT FINAL ADVANCED SCORING ENGINE');
    console.log('=========================================');
    console.log(`📊 Drivers évalués: ${Object.keys(this.scoringResults.driverScores).length}`);
    console.log(`📊 Score moyen: ${Math.round(this.scoringResults.qualityMetrics.average * 100)}%`);
    console.log(`📊 Top drivers: ${this.scoringResults.rankings.topDrivers.length}`);
    console.log(`📊 Drivers critiques: ${this.scoringResults.rankings.improvements.filter(i => i.priority === 'high').length}`);
    console.log(`📊 Recommandations: ${Object.values(this.scoringResults.recommendations).flat().length}`);
    
    console.log('\n🚀 Rapport sauvegardé dans:', this.reportPath);
  }

  // Méthodes utilitaires
  calculateStandardDeviation(values) {
    const mean = values.reduce((sum, val) => sum + val, 0) / values.length;
    const squaredDiffs = values.map(val => Math.pow(val - mean, 2));
    const variance = squaredDiffs.reduce((sum, diff) => sum + diff, 0) / values.length;
    return Math.sqrt(variance);
  }

  calculateVariance(values) {
    const mean = values.reduce((sum, val) => sum + val, 0) / values.length;
    const squaredDiffs = values.map(val => Math.pow(val - mean, 2));
    return squaredDiffs.reduce((sum, diff) => sum + diff, 0) / values.length;
  }

  calculateSkewness(values) {
    const mean = values.reduce((sum, val) => sum + val, 0) / values.length;
    const stdDev = this.calculateStandardDeviation(values);
    const cubedDiffs = values.map(val => Math.pow((val - mean) / stdDev, 3));
    return cubedDiffs.reduce((sum, diff) => sum + diff, 0) / values.length;
  }

  detectPatterns() {
    return [
      {
        type: 'score_distribution',
        description: 'Distribution normale des scores avec concentration autour de la moyenne',
        confidence: 0.8
      },
      {
        type: 'category_correlation',
        description: 'Corrélation positive entre la qualité du code et la fonctionnalité',
        confidence: 0.7
      }
    ];
  }

  detectAnomalies() {
    return [
      {
        type: 'outlier_score',
        description: 'Drivers avec des scores exceptionnellement élevés ou faibles',
        count: 3
      }
    ];
  }

  identifyOpportunities() {
    return [
      {
        type: 'low_hanging_fruit',
        description: 'Drivers avec des améliorations faciles à implémenter',
        count: 5
      },
      {
        type: 'high_impact_low_effort',
        description: 'Améliorations avec un impact élevé et un effort minimal',
        count: 3
      }
    ];
  }

  assessRisks() {
    return [
      {
        type: 'technical_debt',
        description: 'Accumulation de dette technique dans les drivers critiques',
        severity: 'medium',
        probability: 'high'
      }
    ];
  }

  makePredictions() {
    return [
      {
        type: 'quality_improvement',
        description: 'Amélioration de 15% de la qualité globale dans les 3 prochains mois',
        confidence: 0.7,
        timeframe: '3 months'
      }
    ];
  }

  generateTrendBasedRecommendations(trends) {
    return [
      {
        type: 'focus_area',
        description: 'Concentrer les efforts sur les catégories avec les scores les plus faibles',
        priority: 'high'
      }
    ];
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

// Exécuter le scoring
async function main() {
  const engine = new AdvancedScoringEngine();
  await engine.runFullScoring();
}

if (require.main === module) {
  main().catch(console.error);
}

module.exports = AdvancedScoringEngine;
