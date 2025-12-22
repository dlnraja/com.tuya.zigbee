#!/usr/bin/env node

/**
 * 📊 WEEKLY FULL ANALYSIS v1.0.0
 *
 * Analyse complète hebdomadaire du système MEGA:
 * - Optimisation drivers (consolidation, dédoublons, règles strictes)
 * - Rapport qualité et couverture features (flows, capacités, DPs)
 * - Détection anomalies et régressions potentielles
 * - Suggestions améliorations architecture
 * - Stats utilisation et performance
 */

const fs = require('fs').promises;
const path = require('path');

class WeeklyFullAnalysis {
  constructor() {
    this.config = {
      // Critères d'optimisation selon mémoire
      optimizationCriteria: {
        // Consolidation drivers similaires
        consolidation: {
          maxSimilarDrivers: 3, // Plus de 3 drivers similaires = consolidation nécessaire
          similarityThreshold: 0.8, // 80% de similarité = fusion
          duplicateManufacturerThreshold: 0.6 // 60% manufacturerNames identiques
        },

        // Qualité drivers
        quality: {
          minManufacturerNames: 5, // Minimum 5 manufacturerNames par driver
          maxManufacturerNames: 500, // Maximum 500 pour éviter bloat
          requiredCapabilities: ['onoff', 'measure_battery'], // Capabilities essentielles
          forbiddenCapabilities: ['alarm_battery'], // Capabilities obsolètes SDK3
          requiredClusters: [0, 1], // Clusters basic + powerConfiguration
          maxClusters: 20 // Éviter trop de clusters
        },

        // Performance
        performance: {
          maxDriverSize: 50000, // Max 50KB par driver
          maxImageSize: 10000, // Max 10KB par image
          maxDriversPerCategory: 10 // Max drivers par catégorie
        }
      },

      // Règles strictes selon mémoire
      strictRules: {
        fingerprintingRules: true,
        ts0601Protection: true,
        manufacturerPairRequired: true,
        nonRegressionEnforced: true,
        sdk3Compliance: true
      },

      // Catégories analysis
      categoryAnalysis: [
        'motion_sensor',
        'climate_sensor',
        'plug_smart',
        'bulb_rgb',
        'bulb_rgbw',
        'switch_1gang',
        'switch_2gang',
        'switch_3gang',
        'switch_4gang',
        'switch_6gang',
        'wireless_button',
        'contact_sensor',
        'water_sensor',
        'thermostat_tuya_dp',
        'curtain_motor',
        'siren',
        'gas_detector',
        'smoke_detector'
      ]
    };

    // Résultats analysis
    this.analysisResults = {
      overview: {
        totalDrivers: 0,
        totalManufacturerNames: 0,
        totalProductIds: 0,
        totalDevicesCovered: 0,
        analysisDuration: 0
      },

      quality: {
        compliantDrivers: 0,
        nonCompliantDrivers: 0,
        missingCapabilities: [],
        obsoleteCapabilities: [],
        invalidClusters: [],
        fingerprintingIssues: []
      },

      optimization: {
        consolidationCandidates: [],
        duplicateManufacturers: [],
        oversizedDrivers: [],
        undersizedDrivers: [],
        categoryImbalance: []
      },

      regression: {
        potentialRegressions: [],
        missingValidations: [],
        ruleViolations: []
      },

      recommendations: {
        immediate: [],
        shortTerm: [],
        longTerm: []
      },

      errors: []
    };
  }

  /**
   * 📝 Logger compatible GitHub Actions
   */
  async log(level, message, data = null) {
    const timestamp = new Date().toISOString();

    if (process.env.GITHUB_ACTIONS === 'true') {
      switch (level.toUpperCase()) {
        case 'ERROR':
          console.log(`::error::${message}`);
          break;
        case 'WARN':
          console.log(`::warning::${message}`);
          break;
        case 'SUCCESS':
          console.log(`::notice::✅ ${message}`);
          break;
        default:
          console.log(`[${timestamp}] ${message}`);
      }
    } else {
      console.log(`[${timestamp}] [${level}] ${message}`);
    }

    if (data) console.log(JSON.stringify(data, null, 2));
  }

  /**
   * 📁 Scanner tous les drivers
   */
  async scanAllDrivers() {
    const drivers = {};

    try {
      const driversDir = path.join(process.cwd(), 'drivers');
      const driverNames = await fs.readdir(driversDir);

      for (const driverName of driverNames) {
        try {
          const driverPath = path.join(driversDir, driverName);
          const stat = await fs.stat(driverPath);

          if (!stat.isDirectory()) continue;

          // Lire driver.compose.json
          const composePath = path.join(driverPath, 'driver.compose.json');
          const content = await fs.readFile(composePath, 'utf8');
          const driverConfig = JSON.parse(content);

          // Calculer statistiques driver
          drivers[driverName] = {
            path: driverPath,
            config: driverConfig,
            stats: await this.calculateDriverStats(driverName, driverConfig),
            quality: await this.analyzeDriverQuality(driverName, driverConfig),
            size: content.length
          };

        } catch (error) {
          await this.log('WARN', `Failed to scan driver ${driverName}:`, error);
          this.analysisResults.errors.push(`Driver scan: ${driverName} - ${error.message}`);
        }
      }

      this.analysisResults.overview.totalDrivers = Object.keys(drivers).length;
      await this.log('INFO', `📁 Scanned ${this.analysisResults.overview.totalDrivers} drivers`);

      return drivers;

    } catch (error) {
      await this.log('ERROR', 'Failed to scan drivers directory:', error);
      throw error;
    }
  }

  /**
   * 📊 Calculer statistiques driver
   */
  async calculateDriverStats(driverName, config) {
    const stats = {
      manufacturerNames: 0,
      productIds: 0,
      capabilities: 0,
      clusters: 0,
      category: 'unknown',
      hasImages: false,
      hasFlows: false
    };

    // Compter manufacturerNames
    if (config.zigbee?.manufacturerName) {
      stats.manufacturerNames = Array.isArray(config.zigbee.manufacturerName)
        ? config.zigbee.manufacturerName.length
        : 1;

      this.analysisResults.overview.totalManufacturerNames += stats.manufacturerNames;
    }

    // Compter productIds
    if (config.zigbee?.productId) {
      stats.productIds = Array.isArray(config.zigbee.productId)
        ? config.zigbee.productId.length
        : 1;

      this.analysisResults.overview.totalProductIds += stats.productIds;
    }

    // Compter capabilities
    if (config.capabilities) {
      stats.capabilities = config.capabilities.length;
    }

    // Compter clusters
    if (config.zigbee?.clusters) {
      stats.clusters = config.zigbee.clusters.length;
    }

    // Déterminer catégorie
    stats.category = this.determineDriverCategory(driverName);

    // Vérifier images
    try {
      const imagesPath = path.join(process.cwd(), 'drivers', driverName, 'assets', 'images');
      await fs.access(imagesPath);
      stats.hasImages = true;
    } catch {
      stats.hasImages = false;
    }

    // Vérifier flows (flow.json existence)
    try {
      const flowPath = path.join(process.cwd(), 'drivers', driverName, 'flow.json');
      await fs.access(flowPath);
      stats.hasFlows = true;
    } catch {
      stats.hasFlows = false;
    }

    this.analysisResults.overview.totalDevicesCovered += (stats.manufacturerNames * stats.productIds);

    return stats;
  }

  /**
   * 🔍 Analyser qualité driver
   */
  async analyzeDriverQuality(driverName, config) {
    const quality = {
      compliant: true,
      issues: [],
      score: 100,
      recommendations: []
    };

    // Vérification manufacturerNames + productIds pair (règle critique)
    if (!config.zigbee?.manufacturerName || !config.zigbee?.productId) {
      quality.compliant = false;
      quality.issues.push('Missing manufacturerName or productId pair - CRITICAL');
      quality.score -= 50;
      this.analysisResults.quality.fingerprintingIssues.push(driverName);
    }

    // Vérification TS0601 protection
    if (config.zigbee?.productId?.includes('TS0601') && !config.zigbee?.manufacturerName) {
      quality.compliant = false;
      quality.issues.push('TS0601 without manufacturerName - FORBIDDEN');
      quality.score -= 40;
    }

    // Vérification capabilities obsolètes (alarm_battery)
    if (config.capabilities?.includes('alarm_battery')) {
      quality.issues.push('Contains obsolete alarm_battery capability - should be measure_battery');
      quality.score -= 20;
      this.analysisResults.quality.obsoleteCapabilities.push(driverName);
    }

    // Vérification clusters format (numérique uniquement)
    if (config.zigbee?.clusters) {
      const invalidClusters = config.zigbee.clusters.filter(c => typeof c !== 'number');
      if (invalidClusters.length > 0) {
        quality.issues.push('Non-numeric clusters detected - SDK3 requires numeric format');
        quality.score -= 15;
        this.analysisResults.quality.invalidClusters.push({
          driver: driverName,
          invalidClusters
        });
      }
    }

    // Vérification taille manufacturerNames (optimisation)
    const mfrCount = Array.isArray(config.zigbee?.manufacturerName)
      ? config.zigbee.manufacturerName.length
      : 1;

    if (mfrCount < this.config.optimizationCriteria.quality.minManufacturerNames) {
      quality.recommendations.push('Consider adding more manufacturerNames for better coverage');
      quality.score -= 5;
      this.analysisResults.optimization.undersizedDrivers.push(driverName);
    } else if (mfrCount > this.config.optimizationCriteria.quality.maxManufacturerNames) {
      quality.recommendations.push('Too many manufacturerNames - consider splitting driver');
      quality.score -= 10;
      this.analysisResults.optimization.oversizedDrivers.push(driverName);
    }

    if (quality.compliant) {
      this.analysisResults.quality.compliantDrivers++;
    } else {
      this.analysisResults.quality.nonCompliantDrivers++;
    }

    return quality;
  }

  /**
   * 🏷️ Déterminer catégorie driver
   */
  determineDriverCategory(driverName) {
    for (const category of this.config.categoryAnalysis) {
      if (driverName.includes(category)) {
        return category;
      }
    }
    return 'unknown';
  }

  /**
   * 🔄 Analyser candidats consolidation
   */
  async analyzeConsolidationCandidates(drivers) {
    const categories = {};

    // Grouper par catégorie
    for (const [driverName, driverData] of Object.entries(drivers)) {
      const category = driverData.stats.category;
      if (!categories[category]) {
        categories[category] = [];
      }
      categories[category].push({ name: driverName, data: driverData });
    }

    // Analyser chaque catégorie
    for (const [category, categoryDrivers] of Object.entries(categories)) {
      if (categoryDrivers.length <= this.config.optimizationCriteria.consolidation.maxSimilarDrivers) {
        continue;
      }

      // Trop de drivers dans cette catégorie
      this.analysisResults.optimization.categoryImbalance.push({
        category: category,
        driverCount: categoryDrivers.length,
        drivers: categoryDrivers.map(d => d.name),
        recommendation: `Consider consolidating ${categoryDrivers.length} ${category} drivers`
      });

      // Chercher drivers très similaires
      for (let i = 0; i < categoryDrivers.length; i++) {
        for (let j = i + 1; j < categoryDrivers.length; j++) {
          const similarity = this.calculateDriverSimilarity(
            categoryDrivers[i].data,
            categoryDrivers[j].data
          );

          if (similarity > this.config.optimizationCriteria.consolidation.similarityThreshold) {
            this.analysisResults.optimization.consolidationCandidates.push({
              driver1: categoryDrivers[i].name,
              driver2: categoryDrivers[j].name,
              similarity: similarity,
              category: category,
              recommendation: `Consider merging these highly similar drivers (${(similarity * 100).toFixed(1)}% similar)`
            });
          }
        }
      }
    }

    await this.log('INFO', `🔄 Found ${this.analysisResults.optimization.consolidationCandidates.length} consolidation candidates`);
  }

  /**
   * 📐 Calculer similarité entre drivers
   */
  calculateDriverSimilarity(driver1, driver2) {
    let similarity = 0;
    let factors = 0;

    // Similarité capabilities
    if (driver1.config.capabilities && driver2.config.capabilities) {
      const common = driver1.config.capabilities.filter(c =>
        driver2.config.capabilities.includes(c)
      );
      const total = [...new Set([...driver1.config.capabilities, ...driver2.config.capabilities])];
      similarity += common.length / total.length;
      factors++;
    }

    // Similarité clusters
    if (driver1.config.zigbee?.clusters && driver2.config.zigbee?.clusters) {
      const common = driver1.config.zigbee.clusters.filter(c =>
        driver2.config.zigbee.clusters.includes(c)
      );
      const total = [...new Set([...driver1.config.zigbee.clusters, ...driver2.config.zigbee.clusters])];
      similarity += common.length / total.length;
      factors++;
    }

    // Similarité catégorie
    if (driver1.stats.category === driver2.stats.category) {
      similarity += 1;
    }
    factors++;

    return factors > 0 ? similarity / factors : 0;
  }

  /**
   * 🛡️ Détecter régressions potentielles
   */
  async detectPotentialRegressions(drivers) {
    for (const [driverName, driverData] of Object.entries(drivers)) {
      // Règle 9.8: Vérifier suppressions potentielles
      if (driverData.stats.manufacturerNames === 0) {
        this.analysisResults.regression.potentialRegressions.push({
          driver: driverName,
          type: 'missing_manufacturers',
          severity: 'critical',
          description: 'Driver has no manufacturerNames - potential regression'
        });
      }

      // Vérifier violations règles strictes
      if (!driverData.quality.compliant) {
        this.analysisResults.regression.ruleViolations.push({
          driver: driverName,
          issues: driverData.quality.issues,
          severity: 'high'
        });
      }

      // Vérifier manufacturerNames dupliqués entre drivers
      const manufacturerNames = driverData.config.zigbee?.manufacturerName || [];
      for (const [otherDriverName, otherDriverData] of Object.entries(drivers)) {
        if (driverName === otherDriverName) continue;

        const otherManufacturerNames = otherDriverData.config.zigbee?.manufacturerName || [];
        const duplicates = manufacturerNames.filter(m => otherManufacturerNames.includes(m));

        if (duplicates.length > 0) {
          this.analysisResults.optimization.duplicateManufacturers.push({
            driver1: driverName,
            driver2: otherDriverName,
            duplicates: duplicates,
            recommendation: 'Review duplicate manufacturerNames - may cause conflicts'
          });
        }
      }
    }

    await this.log('INFO', `🛡️ Found ${this.analysisResults.regression.potentialRegressions.length} potential regressions`);
  }

  /**
   * 💡 Générer recommandations
   */
  generateRecommendations() {
    // Recommandations immédiates (critiques)
    if (this.analysisResults.quality.nonCompliantDrivers > 0) {
      this.analysisResults.recommendations.immediate.push({
        priority: 'CRITICAL',
        action: `Fix ${this.analysisResults.quality.nonCompliantDrivers} non-compliant drivers`,
        drivers: this.analysisResults.quality.fingerprintingIssues.slice(0, 5),
        impact: 'Prevents Homey app validation failures'
      });
    }

    if (this.analysisResults.quality.obsoleteCapabilities.length > 0) {
      this.analysisResults.recommendations.immediate.push({
        priority: 'HIGH',
        action: `Remove alarm_battery from ${this.analysisResults.quality.obsoleteCapabilities.length} drivers`,
        drivers: this.analysisResults.quality.obsoleteCapabilities.slice(0, 5),
        impact: 'SDK3 compliance required'
      });
    }

    // Recommandations court terme (optimisations)
    if (this.analysisResults.optimization.consolidationCandidates.length > 0) {
      this.analysisResults.recommendations.shortTerm.push({
        priority: 'MEDIUM',
        action: `Consider consolidating ${this.analysisResults.optimization.consolidationCandidates.length} similar drivers`,
        impact: 'Reduces maintenance overhead and user confusion'
      });
    }

    if (this.analysisResults.optimization.duplicateManufacturers.length > 0) {
      this.analysisResults.recommendations.shortTerm.push({
        priority: 'MEDIUM',
        action: `Resolve ${this.analysisResults.optimization.duplicateManufacturers.length} duplicate manufacturerName conflicts`,
        impact: 'Prevents device matching conflicts'
      });
    }

    // Recommandations long terme (architecture)
    this.analysisResults.recommendations.longTerm.push({
      priority: 'LOW',
      action: 'Implement automated driver quality monitoring',
      impact: 'Prevents quality regressions in future'
    });

    this.analysisResults.recommendations.longTerm.push({
      priority: 'LOW',
      action: 'Create consolidated mega-drivers per category',
      impact: 'Simplifies maintenance and improves user experience'
    });

    await this.log('INFO', `💡 Generated ${this.analysisResults.recommendations.immediate.length + this.analysisResults.recommendations.shortTerm.length + this.analysisResults.recommendations.longTerm.length} recommendations`);
  }

  /**
   * 📊 Générer rapport détaillé
   */
  async generateDetailedReport() {
    const reportPath = path.join(process.cwd(), 'logs', 'mega-automation', `weekly-analysis-${Date.now()}.json`);

    await fs.mkdir(path.dirname(reportPath), { recursive: true });

    const report = {
      timestamp: new Date().toISOString(),
      analysisType: 'weekly_full_analysis',
      version: '1.0.0',

      overview: this.analysisResults.overview,
      quality: this.analysisResults.quality,
      optimization: this.analysisResults.optimization,
      regression: this.analysisResults.regression,
      recommendations: this.analysisResults.recommendations,

      metrics: {
        qualityScore: (this.analysisResults.quality.compliantDrivers / this.analysisResults.overview.totalDrivers * 100).toFixed(2) + '%',
        averageManufacturersPerDriver: (this.analysisResults.overview.totalManufacturerNames / this.analysisResults.overview.totalDrivers).toFixed(1),
        totalDeviceCoverage: this.analysisResults.overview.totalDevicesCovered,
        optimizationOpportunities: this.analysisResults.optimization.consolidationCandidates.length +
          this.analysisResults.optimization.duplicateManufacturers.length,
        regressionRisks: this.analysisResults.regression.potentialRegressions.length +
          this.analysisResults.regression.ruleViolations.length
      },

      errors: this.analysisResults.errors
    };

    await fs.writeFile(reportPath, JSON.stringify(report, null, 2));

    await this.log('SUCCESS', `📊 Detailed analysis report saved to ${reportPath}`);
    return reportPath;
  }

  /**
   * 🚀 Exécution principale analysis
   */
  async execute() {
    const startTime = Date.now();

    try {
      await this.log('INFO', '🚀 Starting Weekly Full Analysis');

      // 1. Scanner tous les drivers
      const drivers = await this.scanAllDrivers();

      // 2. Analyser candidats consolidation
      await this.analyzeConsolidationCandidates(drivers);

      // 3. Détecter régressions potentielles
      await this.detectPotentialRegressions(drivers);

      // 4. Générer recommandations
      this.generateRecommendations();

      // 5. Calculer durée analysis
      this.analysisResults.overview.analysisDuration = Date.now() - startTime;

      // 6. Générer rapport détaillé
      const reportPath = await this.generateDetailedReport();

      // 7. Résumé pour GitHub Actions
      await this.log('SUCCESS', `✅ Weekly Analysis completed in ${(this.analysisResults.overview.analysisDuration / 1000).toFixed(1)}s`);
      await this.log('INFO', `📊 ${this.analysisResults.overview.totalDrivers} drivers, ${this.analysisResults.quality.compliantDrivers} compliant, ${this.analysisResults.optimization.consolidationCandidates.length} consolidation opportunities`);

      return {
        success: true,
        reportPath: reportPath,
        metrics: this.analysisResults.overview,
        summary: {
          totalDrivers: this.analysisResults.overview.totalDrivers,
          qualityScore: (this.analysisResults.quality.compliantDrivers / this.analysisResults.overview.totalDrivers * 100).toFixed(2),
          optimizationOpportunities: this.analysisResults.optimization.consolidationCandidates.length,
          regressionRisks: this.analysisResults.regression.potentialRegressions.length,
          immediateActions: this.analysisResults.recommendations.immediate.length
        }
      };

    } catch (error) {
      await this.log('ERROR', '❌ Weekly Full Analysis failed:', error);
      this.analysisResults.errors.push(error.message);
      throw error;
    }
  }
}

// CLI execution
if (require.main === module) {
  const analysis = new WeeklyFullAnalysis();

  analysis.execute()
    .then(results => {
      console.log('✅ Weekly Full Analysis completed:', JSON.stringify(results, null, 2));
      process.exit(0);
    })
    .catch(error => {
      console.error('❌ Weekly Full Analysis failed:', error);
      process.exit(1);
    });
}

module.exports = WeeklyFullAnalysis;
