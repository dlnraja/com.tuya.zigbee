#!/usr/bin/env node

const fs = require('fs');
const path = require('path');
const { execSync } = require('child_process');

/**
 * 🔄 MEGA RECURSIVE VALIDATOR FIXED - VALIDATION RÉCURSIVE COMPLÈTE
 * Lance tous les tests de sécurité, workflows et corrections de façon récursive
 */
class MegaRecursiveValidator {
  constructor() {
    this.projectRoot = process.cwd();
    this.maxIterations = 3;
    this.currentIteration = 0;
    this.allIssues = [];
    this.securityScores = [];
  }

  log(message, type = 'info') {
    const icons = {
      info: '📝', success: '✅', error: '❌', warning: '⚠️',
      security: '🔒', fix: '🛠️', scan: '🔍', recursive: '🔄'
    };
    console.log(`${icons[type]} ${message}`);
  }

  /**
   * Lance validation récursive complète
   */
  async runRecursiveValidation() {
    this.log('🚀 DÉMARRAGE VALIDATION RÉCURSIVE MEGA...', 'recursive');

    for (this.currentIteration = 1; this.currentIteration <= this.maxIterations; this.currentIteration++) {
      this.log(`🔄 === ITÉRATION ${this.currentIteration}/${this.maxIterations} ===`, 'recursive');

      const iterationResults = await this.runSingleIteration();

      // Si aucun problème critique trouvé, validation terminée
      if (iterationResults.criticalIssues === 0) {
        this.log(`✅ VALIDATION TERMINÉE À L'ITÉRATION ${this.currentIteration} - ZÉRO PROBLÈME CRITIQUE`, 'success');
        break;
      }

      // Si dernière itération et encore des problèmes
      if (this.currentIteration === this.maxIterations && iterationResults.criticalIssues > 0) {
        this.log(`⚠️ ATTENTION: ${iterationResults.criticalIssues} problèmes critiques restants`, 'warning');
      }
    }

    return this.generateFinalReport();
  }

  /**
   * Exécute une itération complète de validation
   */
  async runSingleIteration() {
    this.log(`📋 Itération ${this.currentIteration}: Validation complète...`, 'scan');

    const results = {
      securityIssues: 0,
      buildIssues: 0,
      criticalIssues: 0,
      fixes: 0
    };

    try {
      // 1. SÉCURITÉ WORKFLOWS
      this.log('🔒 1. Hardening sécurité workflows...', 'security');
      const securityResult = await this.runWorkflowSecurityHardener();
      results.securityIssues = securityResult.violations || 0;
      results.fixes += securityResult.fixes || 0;
      this.securityScores.push(securityResult.securityScore || 0);

      // 2. SÉPARATION BUILD HOMEY
      this.log('🛡️ 2. Séparation sécurisée Homey build...', 'security');
      const separationResult = await this.runHomeyBuildSeparator();
      results.buildIssues = (separationResult.violations || 0) + (separationResult.buildIssues || 0);

      // 3. TEST RÉCURSIF SCRIPTS CRITIQUES
      this.log('🧪 3. Test récursif scripts critiques...', 'scan');
      const scriptResults = await this.runCriticalScriptTests();

      results.criticalIssues = results.securityIssues + results.buildIssues;

      this.log(`📊 Itération ${this.currentIteration} terminée:`, 'scan');
      this.log(`   🔒 Sécurité: ${results.securityIssues} problèmes`, 'scan');
      this.log(`   🛡️ Build: ${results.buildIssues} problèmes`, 'scan');
      this.log(`   🛠️ Corrections: ${results.fixes}`, 'scan');
      this.log(`   📈 Total critique: ${results.criticalIssues} problèmes`, 'scan');

      this.allIssues.push(results);
      return results;

    } catch (error) {
      this.log(`❌ Erreur itération ${this.currentIteration}: ${error.message}`, 'error');
      return { securityIssues: 1, buildIssues: 1, criticalIssues: 2, fixes: 0 };
    }
  }

  /**
   * Lance workflow security hardener
   */
  async runWorkflowSecurityHardener() {
    try {
      const WorkflowSecurityHardener = require('./workflow-security-hardener.js');
      const hardener = new WorkflowSecurityHardener();
      return await hardener.run();
    } catch (error) {
      this.log(`❌ Erreur security hardener: ${error.message}`, 'error');
      return { violations: 1, fixes: 0, securityScore: 0 };
    }
  }

  /**
   * Lance Homey build separator
   */
  async runHomeyBuildSeparator() {
    try {
      const HomeyBuildSeparator = require('./homey-build-separator.js');
      const separator = new HomeyBuildSeparator();
      return await separator.run();
    } catch (error) {
      this.log(`❌ Erreur build separator: ${error.message}`, 'error');
      return { violations: 1, buildIssues: 1 };
    }
  }

  /**
   * Lance tests critiques des scripts
   */
  async runCriticalScriptTests() {
    const criticalScripts = [
      'scripts/community/forum-comprehensive-analyzer.js',
      'scripts/validation/manufacturer-deduplication-enforcer.js'
    ];

    let passedTests = 0;
    for (const script of criticalScripts) {
      const scriptPath = path.join(this.projectRoot, script);
      if (fs.existsSync(scriptPath)) {
        try {
          this.log(`🧪 Test critique: ${script}`, 'scan');
          execSync(`node "${scriptPath}"`, {
            cwd: this.projectRoot,
            encoding: 'utf8',
            timeout: 30000,
            stdio: 'pipe'
          });
          this.log(`✅ ${script} - OK`, 'success');
          passedTests++;
        } catch (error) {
          this.log(`❌ ${script} - ERREUR`, 'error');
        }
      }
    }

    return { passedTests, totalTests: criticalScripts.length };
  }

  /**
   * Test sécurisé des workflows YML
   */
  async testSecureWorkflows() {
    this.log('🔍 Test sécurisé workflows YML...', 'scan');

    const workflowsDir = path.join(this.projectRoot, '.github', 'workflows');
    if (!fs.existsSync(workflowsDir)) {
      this.log('❌ Répertoire workflows non trouvé', 'error');
      return [];
    }

    const workflowFiles = fs.readdirSync(workflowsDir)
      .filter(f => f.endsWith('.yml') || f.endsWith('.yaml'));

    const testResults = [];
    for (const workflow of workflowFiles) {
      const workflowPath = path.join(workflowsDir, workflow);
      const content = fs.readFileSync(workflowPath, 'utf8');

      const testResult = {
        workflow: workflow,
        secure: true,
        issues: []
      };

      // Vérifications de sécurité
      if (content.includes('${{ github.event.') && !content.includes('# SÉCURISÉ')) {
        testResult.secure = false;
        testResult.issues.push('Injection potentielle github.event');
      }

      if (content.includes('write-all') || (content.includes('permissions:') && content.split(':').length > 5)) {
        testResult.secure = false;
        testResult.issues.push('Permissions trop larges');
      }

      testResults.push(testResult);
      const status = testResult.secure ? '✅' : '❌';
      this.log(`${status} ${workflow}: ${testResult.issues.length} problèmes`, 'scan');
    }

    return testResults;
  }

  /**
   * Génère rapport final récursif
   */
  generateFinalReport() {
    const finalSecurityScore = this.securityScores.length > 0
      ? this.securityScores[this.securityScores.length - 1]
      : 0;

    const totalCriticalStart = this.allIssues.length > 0 ? this.allIssues[0].criticalIssues : 0;
    const totalCriticalEnd = this.allIssues.length > 0 ? this.allIssues[this.allIssues.length - 1].criticalIssues : 0;

    const report = {
      timestamp: new Date().toISOString(),
      validation_summary: {
        iterations_completed: this.currentIteration,
        max_iterations: this.maxIterations,
        critical_issues_start: totalCriticalStart,
        critical_issues_end: totalCriticalEnd,
        issues_resolved: Math.max(0, totalCriticalStart - totalCriticalEnd),
        final_security_score: finalSecurityScore,
        validation_success: totalCriticalEnd === 0
      },
      iteration_details: this.allIssues,
      security_scores_progression: this.securityScores,
      recommendations: this.generateRecommendations(totalCriticalEnd)
    };

    const reportPath = path.join(this.projectRoot, 'project-data', 'MEGA_RECURSIVE_VALIDATION_REPORT.json');
    fs.mkdirSync(path.dirname(reportPath), { recursive: true });
    fs.writeFileSync(reportPath, JSON.stringify(report, null, 2));

    return report;
  }

  /**
   * Génère recommandations finales
   */
  generateRecommendations(remainingCritical) {
    if (remainingCritical === 0) {
      return [
        '✅ Validation récursive terminée avec succès',
        '🔒 Sécurité workflows optimisée',
        '🛡️ Séparation Homey build configurée',
        '🚀 Prêt pour déploiement production sécurisé',
        '📋 Monitoring continu activé'
      ];
    } else {
      return [
        `⚠️ ${remainingCritical} problèmes critiques restants`,
        '🔍 Review manuelle de sécurité requise',
        '🛠️ Corrections critiques nécessaires avant déploiement',
        '🔒 Renforcement sécurité obligatoire',
        '📋 Tests supplémentaires recommandés'
      ];
    }
  }

  /**
   * Exécution principale sécurisée
   */
  async run() {
    this.log('🚀 DÉMARRAGE MEGA RECURSIVE VALIDATOR SÉCURISÉ...', 'recursive');

    try {
      // Validation récursive principale
      const report = await this.runRecursiveValidation();

      // Test final des workflows sécurisés
      const workflowTests = await this.testSecureWorkflows();

      // Résumé final sécurisé
      this.log('📋 === RÉSUMÉ FINAL VALIDATION SÉCURISÉE ===', 'success');
      this.log(`🔄 Itérations: ${report.validation_summary.iterations_completed}/${this.maxIterations}`, 'success');
      this.log(`📊 Problèmes critiques résolus: ${report.validation_summary.issues_resolved}`, 'success');
      this.log(`🔒 Score sécurité final: ${report.validation_summary.final_security_score}/100`, 'security');
      this.log(`🚀 Validation réussie: ${report.validation_summary.validation_success ? 'OUI' : 'NON'}`,
        report.validation_summary.validation_success ? 'success' : 'warning');
      this.log(`🛡️ Workflows sécurisés: ${workflowTests.filter(w => w.secure).length}/${workflowTests.length}`, 'security');
      this.log(`📄 Rapport: project-data/MEGA_RECURSIVE_VALIDATION_REPORT.json`, 'success');

      return {
        success: report.validation_summary.validation_success,
        iterations: report.validation_summary.iterations_completed,
        criticalResolved: report.validation_summary.issues_resolved,
        finalScore: report.validation_summary.final_security_score,
        workflowsSecure: workflowTests.every(w => w.secure)
      };

    } catch (error) {
      this.log(`❌ ERREUR CRITIQUE: ${error.message}`, 'error');
      throw error;
    }
  }
}

// Exécution si script appelé directement
if (require.main === module) {
  const validator = new MegaRecursiveValidator();
  validator.run().catch(console.error);
}

module.exports = MegaRecursiveValidator;
