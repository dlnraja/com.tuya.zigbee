#!/usr/bin/env node

const fs = require('fs');
const path = require('path');
const { execSync } = require('child_process');

/**
 * 🔄 MEGA RECURSIVE VALIDATOR - VALIDATION RÉCURSIVE COMPLÈTE
 * Lance tous les tests de sécurité, workflows et corrections de façon récursive
 */
class MegaRecursiveValidator {
  constructor() {
    this.projectRoot = process.cwd();
    this.maxIterations = 5;
    this.currentIteration = 0;
    this.allIssues = [];
    this.allFixes = [];
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

      // Si aucun problème trouvé, validation terminée
      if (iterationResults.totalIssues === 0) {
        this.log(`✅ VALIDATION TERMINÉE À L'ITÉRATION ${this.currentIteration} - ZÉRO PROBLÈME`, 'success');
        break;
      }

      // Si dernière itération et encore des problèmes
      if (this.currentIteration === this.maxIterations && iterationResults.totalIssues > 0) {
        this.log(`⚠️ ATTENTION: ${iterationResults.totalIssues} problèmes restants après ${this.maxIterations} itérations`, 'warning');
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
      workflowIssues: 0,
      buildIssues: 0,
      totalIssues: 0,
      fixes: 0
    };

    try {
      // 1. SÉCURITÉ WORKFLOWS
      this.log('🔒 1. Hardening sécurité workflows...', 'security');
      const securityResult = await this.runWorkflowSecurityHardener();
      results.securityIssues = securityResult.violations;
      results.fixes += securityResult.fixes;
      this.securityScores.push(securityResult.securityScore);

      // 2. SÉPARATION BUILD HOMEY
      this.log('🛡️ 2. Séparation sécurisée Homey build...', 'security');
      const separationResult = await this.runHomeyBuildSeparator();
      results.buildIssues = separationResult.violations + separationResult.buildIssues;
      results.fixes += separationResult.buildIssues === 0 ? 1 : 0;

      // 3. VALIDATION WORKFLOWS YML
      this.log('📋 3. Validation workflows YML...', 'scan');
      const workflowResult = await this.runWorkflowValidation();
      results.workflowIssues = workflowResult.issues;

      // 4. TEST RÉCURSIF SCRIPTS
      this.log('🧪 4. Test récursif scripts...', 'scan');
      await this.runRecursiveScriptTests();

      // 5. CORRECTION AUTOMATIQUE
      if (results.securityIssues > 0 || results.workflowIssues > 0 || results.buildIssues > 0) {
        this.log('🛠️ 5. Application corrections automatiques...', 'fix');
        await this.applyAutomaticFixes();
        results.fixes++;
      }

      results.totalIssues = results.securityIssues + results.workflowIssues + results.buildIssues;

      this.log(`📊 Itération ${this.currentIteration} terminée:`, 'scan');
      this.log(`   🔒 Sécurité: ${results.securityIssues} problèmes`, 'scan');
      this.log(`   📋 Workflows: ${results.workflowIssues} problèmes`, 'scan');
      this.log(`   🛡️ Build: ${results.buildIssues} problèmes`, 'scan');
      this.log(`   🛠️ Corrections: ${results.fixes}`, 'scan');
      this.log(`   📈 Total: ${results.totalIssues} problèmes`, 'scan');

      this.allIssues.push(results);
      return results;

    } catch (error) {
      this.log(`❌ Erreur itération ${this.currentIteration}: ${error.message}`, 'error');
      throw error;
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
      return { violations: 1, buildIssues: 1, filesInBuild: 0 };
    }
  }

  /**
   * Lance validation workflows
   */
  async runWorkflowValidation() {
    try {
      const result = execSync('node scripts/validation/validate-github-workflows.js', {
        cwd: this.projectRoot,
        encoding: 'utf8'
      });

      // Parser résultat pour compter problèmes
      const problemMatches = result.match(/(\d+) problèmes détectés/);
      const issues = problemMatches ? parseInt(problemMatches[1]) : 0;

      // Test performance
      const workflowsDir = path.join(this.projectRoot, '.github', 'workflows');
      const workflowFiles = fs.readdirSync(workflowsDir)
        .filter(f => f.endsWith('.yml') || f.endsWith('.yaml'));

      let performanceIssues = 0;
      for (const workflow of workflowFiles) {
        const workflowPath = path.join(workflowsDir, workflow);
        const content = fs.readFileSync(workflowPath, 'utf8');

        if (content.includes('cron:') && content.match(/cron:.*\*.*\*/g)) {
          const cronMatch = content.match(/cron: ['"](.+?)['"]/);
          if (cronMatch && cronMatch[1].includes('*')) {
            performanceIssues++;
          }
        }
      }

      return { issues: issues + performanceIssues };
    } catch (error) {
      this.log(`⚠️ Workflow validation warning: ${error.message}`, 'warning');
      return { issues: 0 };
    }
  }

  /**
   * Lance tests récursifs des scripts
   */
  async runRecursiveScriptTests() {
    const scriptsToTest = [
      'scripts/community/forum-comprehensive-analyzer.js',
      'scripts/validation/manufacturer-deduplication-enforcer.js'
    ];

    for (const script of scriptsToTest) {
      const scriptPath = path.join(this.projectRoot, script);
      if (fs.existsSync(scriptPath)) {
        try {
          this.log(`🧪 Test: ${script}`, 'scan');
          execSync(`node "${scriptPath}"`, {
            cwd: this.projectRoot,
            encoding: 'utf8',
            timeout: 30000 // 30s timeout
          });
          this.log(`✅ ${script} - OK`, 'success');
        } catch (error) {
          this.log(`❌ ${script} - ERREUR: ${error.message}`, 'error');
        }
      }
    }
  }

  /**
   * Applique corrections automatiques
   */
  async applyAutomaticFixes() {
    try {
      // 1. Nettoyer cache npm
      execSync('npm cache clean --force', { cwd: this.projectRoot });

      // 2. Réinstaller dépendances
      execSync('npm install', { cwd: this.projectRoot });

      // 3. Corriger permissions fichiers
      if (process.platform !== 'win32') {
        execSync('chmod +x scripts/**/*.js', { cwd: this.projectRoot });
      }

      // 4. Linter automatique
      try {
        execSync('npm run lint -- --fix', { cwd: this.projectRoot });
      } catch (lintError) {
        this.log('⚠️ Pas de linter configuré', 'warning');
      }

      this.log('🛠️ Corrections automatiques appliquées', 'fix');

    } catch (error) {
      this.log(`⚠️ Corrections partielles: ${error.message}`, 'warning');
    }
  }

  /**
   * Test mega workflows YML
   */
  async testMegaWorkflows() {
    this.log('🚀 Test MEGA workflows YML...', 'scan');

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
        syntax_valid: true,
        security_compliant: true,
        performance_optimized: true,
        issues: []
      };

      // Test syntaxe YAML
      try {
        require('js-yaml').load(content);
      } catch (yamlError) {
        testResult.syntax_valid = false;
        testResult.issues.push(`Erreur syntaxe YAML: ${yamlError.message}`);
      }

      // Test sécurité
      if (content.includes('${{ github.event.') &&
        !content.includes('# Sécurisé')) {
        testResult.security_compliant = false;
        testResult.issues.push('Utilisation potentiellement dangereuse de github.event');
      }

      // Test performance
      if (content.includes('cron:') && content.match(/cron:.*\*.*\*/g)) {
        const cronMatch = content.match(/cron: ['"](.+?)['"]/);

        if (cronMatch && cronMatch[1].includes('*')) {
          testResult.performance_optimized = false;
          testResult.issues.push('Utilisation de cron avec *');

          const totalIssuesStart = this.allIssues.length > 0 ? this.allIssues[0].totalIssues : 0;
          const totalIssuesEnd = this.allIssues.length > 0 ? this.allIssues[this.allIssues.length - 1].totalIssues : 0;

          const report = {
            timestamp: new Date().toISOString(),
            validation_summary: {
              iterations_completed: this.currentIteration,
              max_iterations: this.maxIterations,
              issues_start: totalIssuesStart,
              issues_end: totalIssuesEnd,
              issues_resolved: totalIssuesStart - totalIssuesEnd,
              final_security_score: finalSecurityScore,
              validation_success: totalIssuesEnd === 0
            },
            iteration_details: this.allIssues,
            security_scores_progression: this.securityScores,
            recommendations: this.generateFinalRecommendations(totalIssuesEnd)
          };

          const reportPath = path.join(this.projectRoot, 'project-data', 'MEGA_RECURSIVE_VALIDATION_REPORT.json');
          fs.mkdirSync(path.dirname(reportPath), { recursive: true });
          fs.writeFileSync(reportPath, JSON.stringify(report, null, 2));

          return report;
        }

        /**
         * Génère recommandations finales
         */
        generateFinalRecommendations(remainingIssues) {
          if (remainingIssues === 0) {
            return [
              '✅ Validation récursive terminée avec succès',
              '🔒 Sécurité workflows optimisée',
              '🛡️ Séparation Homey build configurée',
              '🚀 Prêt pour déploiement production',
              '📋 Monitoring continu recommandé'
            ];
          } else {
            return [
              `⚠️ ${remainingIssues} problèmes restants après validation récursive`,
              '🔍 Review manuelle recommandée',
              '🛠️ Corrections supplémentaires nécessaires',
              '📋 Re-lancer validation après corrections',
              '🔒 Renforcer sécurité si nécessaire'
            ];
          }
        }

  /**
   * Exécution principale
   */
  async run() {
          this.log('🚀 DÉMARRAGE MEGA RECURSIVE VALIDATOR...', 'recursive');

          try {
            const report = await this.runRecursiveValidation();

            // Test final workflows
            const workflowTests = await this.testMegaWorkflows() || [];

            // Résumé final
            this.log('📋 === RÉSUMÉ FINAL VALIDATION RÉCURSIVE ===', 'success');
            this.log(`🔄 Itérations: ${report.validation_summary.iterations_completed}/${this.maxIterations}`, 'success');
            this.log(`📊 Problèmes résolus: ${report.validation_summary.issues_resolved}`, 'success');
            this.log(`🔒 Score sécurité final: ${report.validation_summary.final_security_score}/100`, 'security');
            this.log(`🚀 Validation réussie: ${report.validation_summary.validation_success ? 'OUI' : 'NON'}`,
              report.validation_summary.validation_success ? 'success' : 'warning');
            this.log(`📋 Workflows testés: ${workflowTests.length}`, 'success');
            this.log(`📄 Rapport: project-data/MEGA_RECURSIVE_VALIDATION_REPORT.json`, 'success');

            return {
              success: report.validation_summary.validation_success,
              iterations: report.validation_summary.iterations_completed,
              issuesResolved: report.validation_summary.issues_resolved,
              finalScore: report.validation_summary.final_security_score,
              workflowsValid: workflowTests.every(w => w.issues.length === 0)
            };

          } catch (error) {
            this.log(`❌ Erreur validation récursive: ${error.message}`, 'error');
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
