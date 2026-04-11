#!/usr/bin/env node

/**
 * FLOW CARDS ANALYSIS & OPTIMIZATION TOOL v5.5.295
 * Analyse systématique de tous les flow cards pour identifier patterns, doublons et incohérences
 * Génère un rapport complet et propose des optimisations avec fusion intelligente
 */

const fs = require('fs');
const path = require('path');

class FlowAnalyzer {
  constructor() {
    this.patterns = {
      switches: new Map(),
      buttons: new Map(),
      sensors: new Map(),
      lights: new Map(),
      duplicates: [],
      inconsistencies: [],
      optimizations: []
    };

    this.driversPath = path.join(__dirname, 'drivers');
    this.report = {
      totalFlows: 0,
      duplicateFlows: 0,
      inconsistentIds: 0,
      optimizationOpportunities: 0,
      recommendations: []
    };
  }

  /**
   * Analyse tous les fichiers de flow cards
   */
  async analyzeAllFlows() {
    console.log('🔍 ANALYZING ALL FLOW CARDS...');

    const drivers = fs.readdirSync(this.driversPath);

    for (const driverName of drivers) {
      const driverPath = path.join(this.driversPath, driverName);
      if (!fs.statSync(driverPath).isDirectory()) continue;

      // Chercher les fichiers de flow
      const flowFiles = [
        'driver.flow.compose.json',
        'driver.compose.json'
      ];

      for (const flowFile of flowFiles) {
        const flowPath = path.join(driverPath, flowFile);
        if (fs.existsSync(flowPath)) {
          await this.analyzeFlowFile(driverName, flowPath);
          break;
        }
      }
    }

    this.generateOptimizations();
    this.generateReport();
  }

  /**
   * Analyse un fichier de flow spécifique
   */
  async analyzeFlowFile(driverName, flowPath) {
    try {
      const content = fs.readFileSync(flowPath, 'utf8');
      const flowData = JSON.parse(content);

      // Ignorer les fichiers sans flows
      if (!flowData.triggers && !flowData.conditions && !flowData.actions) {
        return;
      }

      const analysis = {
        driverName,
        filePath: flowPath,
        triggers: flowData.triggers || [],
        conditions: flowData.conditions || [],
        actions: flowData.actions || []
      };

      this.analyzeFlowPatterns(analysis);
      this.detectInconsistencies(analysis);
      this.report.totalFlows += analysis.triggers.length + analysis.conditions.length + analysis.actions.length;

    } catch (error) {
      console.log(`⚠️ Error analyzing ${flowPath}: ${error.message}`);
    }
  }

  /**
   * Analyse les patterns par catégorie
   */
  analyzeFlowPatterns(analysis) {
    const { driverName } = analysis;

    // Catégoriser par type de driver
    if (driverName.includes('switch')) {
      this.patterns.switches.set(driverName, analysis);
    } else if (driverName.includes('button')) {
      this.patterns.buttons.set(driverName, analysis);
    } else if (driverName.includes('sensor') || driverName.includes('climate')) {
      this.patterns.sensors.set(driverName, analysis);
    } else if (driverName.includes('bulb') || driverName.includes('led') || driverName.includes('light')) {
      this.patterns.lights.set(driverName, analysis);
    }
  }

  /**
   * Détecte les incohérences dans les IDs et structures
   */
  detectInconsistencies(analysis) {
    const { driverName, triggers, conditions, actions } = analysis;

    // Vérifier la cohérence des IDs
    const allFlows = [...triggers, ...conditions, ...actions];

    allFlows.forEach(flow => {
      if (flow.id) {
        // Détecter les IDs incohérents
        if (!flow.id.startsWith(driverName)) {
          this.patterns.inconsistencies.push({
            driver: driverName,
            flowId: flow.id,
            issue: 'ID_PREFIX_MISMATCH',
            expected: `Should start with ${driverName}`,
            actual: flow.id
          });
          this.report.inconsistentIds++;
        }

        // Détecter les IDs trop longs ou redondants
        if (flow.id.length > 50 || flow.id.includes('_smart_') || flow.id.includes('_hybrid_')) {
          this.patterns.inconsistencies.push({
            driver: driverName,
            flowId: flow.id,
            issue: 'ID_TOO_VERBOSE',
            suggestion: 'Simplify ID structure'
          });
        }
      }
    });
  }

  /**
   * Génère les optimisations et fusions possibles
   */
  generateOptimizations() {
    console.log('🔧 GENERATING OPTIMIZATIONS...');

    // Optimiser les switches
    this.optimizeSwitchFlows();

    // Optimiser les buttons
    this.optimizeButtonFlows();

    // Optimiser les sensors
    this.optimizeSensorFlows();

    // Optimiser les lights
    this.optimizeLightFlows();
  }

  /**
   * Optimise les flow cards des switches
   */
  optimizeSwitchFlows() {
    const switches = Array.from(this.patterns.switches.entries());

    // Détecter les patterns communs
    const commonTriggers = new Map();
    const commonConditions = new Map();
    const commonActions = new Map();

    switches.forEach(([driverName, analysis]) => {
      // Analyser les triggers communs
      analysis.triggers.forEach(trigger => {
        const baseType = this.extractFlowType(trigger.id);
        if (!commonTriggers.has(baseType)) {
          commonTriggers.set(baseType, []);
        }
        commonTriggers.get(baseType).push({ driver: driverName, flow: trigger });
      });

      // Analyser les conditions communes
      analysis.conditions.forEach(condition => {
        const baseType = this.extractFlowType(condition.id);
        if (!commonConditions.has(baseType)) {
          commonConditions.set(baseType, []);
        }
        commonConditions.get(baseType).push({ driver: driverName, flow: condition });
      });

      // Analyser les actions communes
      analysis.actions.forEach(action => {
        const baseType = this.extractFlowType(action.id);
        if (!commonActions.has(baseType)) {
          commonActions.set(baseType, []);
        }
        commonActions.get(baseType).push({ driver: driverName, flow: action });
      });
    });

    // Proposer des optimisations
    this.proposeFlowOptimizations('switches', commonTriggers, commonConditions, commonActions);
  }

  /**
   * Optimise les flow cards des buttons
   */
  optimizeButtonFlows() {
    const buttons = Array.from(this.patterns.buttons.entries());

    const buttonPatterns = {
      commonTriggers: ['pressed', 'double_pressed', 'long_pressed', 'released'],
      batteryFlows: ['battery_low', 'battery_changed', 'battery_above']
    };

    this.report.optimizationOpportunities += buttons.length;
  }

  /**
   * Optimise les flow cards des sensors
   */
  optimizeSensorFlows() {
    const sensors = Array.from(this.patterns.sensors.entries());

    const sensorPatterns = {
      measurements: ['temperature_changed', 'humidity_changed', 'pressure_changed'],
      alarms: ['temperature_alarm_high', 'temperature_alarm_low', 'humidity_alarm_high', 'humidity_alarm_low'],
      conditions: ['temperature_above', 'temperature_below', 'humidity_above', 'humidity_below']
    };

    this.report.optimizationOpportunities += sensors.length;
  }

  /**
   * Optimise les flow cards des lights
   */
  optimizeLightFlows() {
    const lights = Array.from(this.patterns.lights.entries());
    this.report.optimizationOpportunities += lights.length;
  }

  /**
   * Extrait le type de base d'un flow ID
   */
  extractFlowType(flowId) {
    return flowId.replace(/^[a-z_0-9]+_(turned_on|turned_off|is_on|turn_on|turn_off|toggle|dim_changed|set_dim|battery_low|temperature_changed).*$/, '$1');
  }

  /**
   * Propose des optimisations pour un groupe de flows
   */
  proposeFlowOptimizations(category, triggers, conditions, actions) {
    // Identifier les doublons exacts
    triggers.forEach((flows, flowType) => {
      if (flows.length > 1) {
        this.report.duplicateFlows += flows.length - 1;
        this.patterns.optimizations.push({
          category,
          type: 'DUPLICATE_TRIGGERS',
          flowType,
          count: flows.length,
          drivers: flows.map(f => f.driver),
          recommendation: 'Merge into unified flow with driver filter'
        });
      }
    });

    conditions.forEach((flows, flowType) => {
      if (flows.length > 1) {
        this.report.duplicateFlows += flows.length - 1;
        this.patterns.optimizations.push({
          category,
          type: 'DUPLICATE_CONDITIONS',
          flowType,
          count: flows.length,
          drivers: flows.map(f => f.driver),
          recommendation: 'Merge into unified flow with driver filter'
        });
      }
    });

    actions.forEach((flows, flowType) => {
      if (flows.length > 1) {
        this.report.duplicateFlows += flows.length - 1;
        this.patterns.optimizations.push({
          category,
          type: 'DUPLICATE_ACTIONS',
          flowType,
          count: flows.length,
          drivers: flows.map(f => f.driver),
          recommendation: 'Merge into unified flow with driver filter'
        });
      }
    });
  }

  /**
   * Génère le rapport final
   */
  generateReport() {
    console.log('\n📊 FLOW ANALYSIS REPORT:');
    console.log('═'.repeat(60));
    console.log(`Total flows analyzed: ${this.report.totalFlows}`);
    console.log(`Duplicate flows found: ${this.report.duplicateFlows}`);
    console.log(`Inconsistent IDs: ${this.report.inconsistentIds}`);
    console.log(`Optimization opportunities: ${this.report.optimizationOpportunities}`);

    console.log('\n🔍 PATTERNS DETECTED:');
    console.log(`- Switches: ${this.patterns.switches.size} drivers`);
    console.log(`- Buttons: ${this.patterns.buttons.size} drivers`);
    console.log(`- Sensors: ${this.patterns.sensors.size} drivers`);
    console.log(`- Lights: ${this.patterns.lights.size} drivers`);

    console.log('\n⚠️ INCONSISTENCIES:');
    this.patterns.inconsistencies.slice(0, 10).forEach((issue, index) => {
      console.log(`${index + 1}. ${issue.driver}: ${issue.issue} - ${issue.flowId}`);
    });

    if (this.patterns.inconsistencies.length > 10) {
      console.log(`... and ${this.patterns.inconsistencies.length - 10} more issues`);
    }

    console.log('\n🚀 OPTIMIZATION RECOMMENDATIONS:');
    this.patterns.optimizations.slice(0, 5).forEach((opt, index) => {
      console.log(`${index + 1}. ${opt.type}: ${opt.count} duplicates in ${opt.category}`);
      console.log(`   Recommendation: ${opt.recommendation}`);
    });

    // Sauvegarder le rapport détaillé
    this.saveDetailedReport();
  }

  /**
   * Sauvegarde un rapport détaillé en JSON
   */
  saveDetailedReport() {
    const detailedReport = {
      timestamp: new Date().toISOString(),
      summary: this.report,
      patterns: {
        switches: Array.from(this.patterns.switches.entries()),
        buttons: Array.from(this.patterns.buttons.entries()),
        sensors: Array.from(this.patterns.sensors.entries()),
        lights: Array.from(this.patterns.lights.entries())
      },
      inconsistencies: this.patterns.inconsistencies,
      optimizations: this.patterns.optimizations
    };

    fs.writeFileSync('flow_analysis_report.json', JSON.stringify(detailedReport, null, 2));
    console.log('\n💾 Detailed report saved: flow_analysis_report.json');
  }
}

// Exécution
if (require.main === module) {
  const analyzer = new FlowAnalyzer();
  analyzer.analyzeAllFlows().catch(console.error);
}

module.exports = FlowAnalyzer;
