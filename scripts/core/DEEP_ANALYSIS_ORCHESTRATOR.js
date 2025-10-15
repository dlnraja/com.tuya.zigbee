#!/usr/bin/env node
'use strict';

/**
 * ORCHESTRATEUR D'ANALYSE PROFONDE
 * 
 * Execute toutes les analyses pour comprendre et résoudre:
 * 1. Problèmes de batterie (historique + patterns)
 * 2. Problèmes d'images (hiérarchie + conflits)
 * 3. Historique Git (versions fonctionnelles)
 * 4. Génère un plan d'action complet
 */

const fs = require('fs').promises;
const path = require('path');
const { execSync } = require('child_process');

class DeepAnalysisOrchestrator {
  
  constructor() {
    this.projectRoot = path.join(__dirname, '..');
    this.results = {
      timestamp: new Date().toISOString(),
      analyses: {},
      globalRecommendations: [],
      criticalIssues: [],
      actionPlan: []
    };
  }

  /**
   * Execute une analyse
   */
  async runAnalysis(name, scriptPath) {
    console.log(`\n${'='.repeat(60)}`);
    console.log(`🔍 ANALYSE: ${name}`);
    console.log('='.repeat(60));
    
    try {
      const result = execSync(`node "${scriptPath}"`, {
        cwd: this.projectRoot,
        encoding: 'utf8',
        maxBuffer: 50 * 1024 * 1024
      });
      
      console.log(result);
      this.results.analyses[name] = {
        success: true,
        timestamp: new Date().toISOString()
      };
      
      return true;
    } catch (err) {
      console.error(`❌ Erreur: ${err.message}`);
      this.results.analyses[name] = {
        success: false,
        error: err.message,
        timestamp: new Date().toISOString()
      };
      
      return false;
    }
  }

  /**
   * Charge un rapport d'analyse
   */
  async loadReport(reportPath) {
    try {
      const data = await fs.readFile(reportPath, 'utf8');
      return JSON.parse(data);
    } catch (err) {
      return null;
    }
  }

  /**
   * Analyse complète
   */
  async analyze() {
    console.log('\n🚀 ORCHESTRATEUR D\'ANALYSE PROFONDE');
    console.log('='.repeat(60));
    console.log('Analyses programmées:');
    console.log('  1. Hiérarchie des images');
    console.log('  2. Historique Git');
    console.log('  3. Système de batterie intelligent');
    console.log('='.repeat(60) + '\n');
    
    // 1. Analyse des images
    const imageAnalysisPath = path.join(__dirname, 'analysis', 'ANALYZE_IMAGE_HIERARCHY.js');
    await this.runAnalysis('Image Hierarchy', imageAnalysisPath);
    
    // 2. Analyse Git
    const gitAnalysisPath = path.join(__dirname, 'analysis', 'ANALYZE_GIT_HISTORY.js');
    await this.runAnalysis('Git History', gitAnalysisPath);
    
    // 3. Charger les rapports
    await this.loadAndProcessReports();
    
    // 4. Générer le plan d'action global
    await this.generateGlobalActionPlan();
    
    // 5. Sauvegarder le rapport complet
    await this.saveReport();
  }

  /**
   * Charge et traite les rapports
   */
  async loadAndProcessReports() {
    console.log('\n📊 TRAITEMENT DES RAPPORTS\n');
    
    // Rapport images
    const imageReport = await this.loadReport(
      path.join(this.projectRoot, 'reports', 'IMAGE_HIERARCHY_ANALYSIS.json')
    );
    if (imageReport) {
      console.log('✅ Rapport images chargé');
      this.processImageReport(imageReport);
    }
    
    // Rapport Git
    const gitReport = await this.loadReport(
      path.join(this.projectRoot, 'reports', 'GIT_HISTORY_ANALYSIS.json')
    );
    if (gitReport) {
      console.log('✅ Rapport Git chargé');
      this.processGitReport(gitReport);
    }
    
    // Rapport batterie
    const batteryDbPath = path.join(this.projectRoot, 'references', 'battery_intelligence_db.json');
    const batteryDb = await this.loadReport(batteryDbPath);
    if (batteryDb) {
      console.log('✅ Base de données batterie chargée');
      this.processBatteryDb(batteryDb);
    }
  }

  /**
   * Traite le rapport d'images
   */
  processImageReport(report) {
    if (!report.conflicts) return;
    
    // Issues critiques
    const criticalConflicts = report.conflicts.filter(c => c.severity === 'critical');
    if (criticalConflicts.length > 0) {
      this.results.criticalIssues.push({
        category: 'images',
        title: 'Conflits d\'images critiques',
        count: criticalConflicts.length,
        details: criticalConflicts
      });
    }
    
    // Ajouter les recommandations
    if (report.recommendations) {
      report.recommendations.forEach(rec => {
        this.results.globalRecommendations.push({
          source: 'image_analysis',
          ...rec
        });
      });
    }
  }

  /**
   * Traite le rapport Git
   */
  processGitReport(report) {
    if (!report.workingVersions || report.workingVersions.length === 0) return;
    
    // Identifier la dernière version fonctionnelle
    const lastWorking = report.workingVersions[0];
    this.results.criticalIssues.push({
      category: 'git',
      title: 'Version fonctionnelle identifiée',
      commit: lastWorking.shortHash,
      message: lastWorking.message,
      recommendation: `Comparer avec commit ${lastWorking.shortHash}`
    });
    
    // Ajouter les recommandations Git
    if (report.recommendations) {
      report.recommendations.forEach(rec => {
        this.results.globalRecommendations.push({
          source: 'git_analysis',
          ...rec
        });
      });
    }
  }

  /**
   * Traite la base de données de batterie
   */
  processBatteryDb(db) {
    if (!db.manufacturers) return;
    
    const manufacturers = Object.keys(db.manufacturers);
    const confirmed = Object.values(db.manufacturers).filter(m => m.confirmed);
    const learning = manufacturers.length - confirmed.length;
    
    this.results.analyses.battery_intelligence = {
      totalManufacturers: manufacturers.length,
      confirmed: confirmed.length,
      learning: learning,
      accuracy: manufacturers.length > 0 ? 
        Math.round((confirmed.length / manufacturers.length) * 100) : 0
    };
    
    if (learning > 0) {
      this.results.criticalIssues.push({
        category: 'battery',
        title: 'Manufacturers en apprentissage',
        count: learning,
        recommendation: 'Collecter plus de données pour confirmation automatique'
      });
    }
  }

  /**
   * Génère le plan d'action global
   */
  async generateGlobalActionPlan() {
    console.log('\n📋 GÉNÉRATION DU PLAN D\'ACTION GLOBAL\n');
    
    // Étape 1: Nettoyer les caches
    this.results.actionPlan.push({
      step: 1,
      priority: 'critical',
      title: 'Nettoyer tous les caches',
      actions: [
        'Supprimer .homeybuild/',
        'Supprimer .homeycompose/',
        'Supprimer node_modules/.cache/ si existe'
      ],
      commands: [
        'Remove-Item -Recurse -Force .homeybuild -ErrorAction SilentlyContinue',
        'Remove-Item -Recurse -Force .homeycompose -ErrorAction SilentlyContinue'
      ]
    });
    
    // Étape 2: Corriger les images
    const imageIssues = this.results.criticalIssues.filter(i => i.category === 'images');
    if (imageIssues.length > 0) {
      this.results.actionPlan.push({
        step: 2,
        priority: 'high',
        title: 'Corriger les images',
        actions: [
          'Vérifier dimensions: drivers/*/assets/small.png = 75x75',
          'Vérifier dimensions: drivers/*/assets/large.png = 500x500',
          'Vérifier dimensions: assets/small.png = 250x175',
          'Vérifier dimensions: assets/large.png = 500x350'
        ],
        reference: 'Voir reports/IMAGE_HIERARCHY_ANALYSIS.json'
      });
    }
    
    // Étape 3: Système de batterie intelligent
    this.results.actionPlan.push({
      step: 3,
      priority: 'high',
      title: 'Activer le système de batterie intelligent',
      actions: [
        'Le système apprend automatiquement par manufacturerName',
        'Utilise le voltage pour affiner (si disponible)',
        'Sauvegarde la configuration apprise dans references/battery_intelligence_db.json',
        'Après 5 échantillons cohérents, auto-confirmation du type de données'
      ],
      status: 'Intégré dans device.js v2.15.18'
    });
    
    // Étape 4: Comparer avec version fonctionnelle
    const gitIssues = this.results.criticalIssues.filter(i => i.category === 'git');
    if (gitIssues.length > 0) {
      const lastWorking = gitIssues[0];
      this.results.actionPlan.push({
        step: 4,
        priority: 'medium',
        title: 'Comparer avec version fonctionnelle',
        commit: lastWorking.commit,
        actions: [
          `git show ${lastWorking.commit}:drivers/pir_radar_illumination_sensor_battery/device.js`,
          `git diff ${lastWorking.commit} HEAD -- drivers/`,
          'Identifier les changements qui ont cassé la validation'
        ]
      });
    }
    
    // Étape 5: Validation et test
    this.results.actionPlan.push({
      step: 5,
      priority: 'high',
      title: 'Validation et test',
      actions: [
        'homey app validate --level publish',
        'Vérifier aucune erreur critique',
        'Tester avec un device réel si possible'
      ]
    });
    
    // Afficher le plan
    console.log('📋 PLAN D\'ACTION:\n');
    this.results.actionPlan.forEach(step => {
      console.log(`ÉTAPE ${step.step}: ${step.title} [${step.priority.toUpperCase()}]`);
      if (step.actions) {
        step.actions.forEach(action => {
          console.log(`   • ${action}`);
        });
      }
      if (step.commands) {
        console.log('   Commandes:');
        step.commands.forEach(cmd => {
          console.log(`     ${cmd}`);
        });
      }
      console.log('');
    });
  }

  /**
   * Sauvegarde le rapport complet
   */
  async saveReport() {
    const reportPath = path.join(this.projectRoot, 'reports', 'DEEP_ANALYSIS_COMPLETE.json');
    await fs.mkdir(path.dirname(reportPath), { recursive: true });
    await fs.writeFile(reportPath, JSON.stringify(this.results, null, 2));
    console.log(`\n✅ Rapport complet sauvegardé: ${reportPath}`);
    
    // Créer aussi un rapport Markdown
    await this.generateMarkdownReport();
  }

  /**
   * Génère un rapport Markdown lisible
   */
  async generateMarkdownReport() {
    const lines = [];
    
    lines.push('# 🔬 RAPPORT D\'ANALYSE PROFONDE');
    lines.push('');
    lines.push(`Généré le: ${new Date().toLocaleString('fr-FR')}`);
    lines.push('');
    
    // Analyses exécutées
    lines.push('## 📊 Analyses Exécutées');
    lines.push('');
    Object.entries(this.results.analyses).forEach(([name, result]) => {
      const status = result.success ? '✅' : '❌';
      lines.push(`- ${status} **${name}**`);
    });
    lines.push('');
    
    // Issues critiques
    if (this.results.criticalIssues.length > 0) {
      lines.push('## 🔴 Issues Critiques');
      lines.push('');
      this.results.criticalIssues.forEach(issue => {
        lines.push(`### ${issue.title}`);
        lines.push('');
        if (issue.count) lines.push(`Nombre: ${issue.count}`);
        if (issue.commit) lines.push(`Commit: \`${issue.commit}\``);
        if (issue.recommendation) lines.push(`**Recommandation:** ${issue.recommendation}`);
        lines.push('');
      });
    }
    
    // Plan d'action
    lines.push('## 📋 Plan d\'Action');
    lines.push('');
    this.results.actionPlan.forEach(step => {
      lines.push(`### Étape ${step.step}: ${step.title}`);
      lines.push('');
      lines.push(`**Priorité:** ${step.priority}`);
      lines.push('');
      if (step.actions) {
        step.actions.forEach(action => {
          lines.push(`- ${action}`);
        });
        lines.push('');
      }
      if (step.commands) {
        lines.push('**Commandes:**');
        lines.push('```powershell');
        step.commands.forEach(cmd => lines.push(cmd));
        lines.push('```');
        lines.push('');
      }
    });
    
    // Système de batterie
    lines.push('## 🔋 Système de Batterie Intelligent');
    lines.push('');
    lines.push('Le système apprend automatiquement les caractéristiques de batterie par `manufacturerName`:');
    lines.push('');
    lines.push('- **Détection automatique** du type de données (0-100, 0-200, 0-255)');
    lines.push('- **Utilisation du voltage** pour affiner la précision (si disponible)');
    lines.push('- **Courbes de décharge** par technologie de batterie');
    lines.push('- **Persistance** dans `references/battery_intelligence_db.json`');
    lines.push('- **Auto-confirmation** après 5 échantillons cohérents');
    lines.push('');
    
    if (this.results.analyses.battery_intelligence) {
      const stats = this.results.analyses.battery_intelligence;
      lines.push('**Statistiques actuelles:**');
      lines.push('');
      lines.push(`- Manufacturers total: ${stats.totalManufacturers}`);
      lines.push(`- Confirmés: ${stats.confirmed}`);
      lines.push(`- En apprentissage: ${stats.learning}`);
      lines.push(`- Taux de précision: ${stats.accuracy}%`);
      lines.push('');
    }
    
    const reportPath = path.join(this.projectRoot, 'reports', 'DEEP_ANALYSIS_COMPLETE.md');
    await fs.writeFile(reportPath, lines.join('\n'));
    console.log(`✅ Rapport Markdown sauvegardé: ${reportPath}`);
  }
}

// Exécution
if (require.main === module) {
  (async () => {
    try {
      const orchestrator = new DeepAnalysisOrchestrator();
      await orchestrator.analyze();
      
      console.log('\n' + '='.repeat(60));
      console.log('✅ ANALYSE PROFONDE TERMINÉE');
      console.log('='.repeat(60));
      console.log('\nRapports générés:');
      console.log('  • reports/DEEP_ANALYSIS_COMPLETE.json');
      console.log('  • reports/DEEP_ANALYSIS_COMPLETE.md');
      console.log('  • reports/IMAGE_HIERARCHY_ANALYSIS.json');
      console.log('  • reports/GIT_HISTORY_ANALYSIS.json');
      console.log('='.repeat(60) + '\n');
      
      process.exit(0);
    } catch (err) {
      console.error('❌ ERREUR:', err);
      process.exit(1);
    }
  })();
}

module.exports = DeepAnalysisOrchestrator;
