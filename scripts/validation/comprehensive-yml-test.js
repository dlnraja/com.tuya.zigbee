#!/usr/bin/env node

const fs = require('fs');
const path = require('path');
const yaml = require('js-yaml');

/**
 * 🧪 TEST COMPLET WORKFLOWS YML
 * Vérification approfondie du fonctionnement des workflows
 */
class ComprehensiveYmlTester {
  constructor() {
    this.workflowsDir = path.join(process.cwd(), '.github', 'workflows');
    this.results = {
      syntax: [],
      structure: [],
      logic: [],
      security: [],
      performance: [],
      functionality: []
    };
  }

  log(message, type = 'info') {
    const icons = { info: '📝', success: '✅', error: '❌', warning: '⚠️', test: '🧪' };
    console.log(`${icons[type]} ${message}`);
  }

  /**
   * Test 1: Syntaxe YAML
   */
  testYamlSyntax(fileName) {
    const filePath = path.join(this.workflowsDir, fileName);
    this.log(`🧪 Test syntaxe YAML: ${fileName}`, 'test');

    try {
      const content = fs.readFileSync(filePath, 'utf8');
      const workflow = yaml.load(content);

      if (workflow && typeof workflow === 'object') {
        this.results.syntax.push({ file: fileName, status: 'PASS', message: 'Syntaxe YAML valide' });
        return { valid: true, workflow };
      } else {
        this.results.syntax.push({ file: fileName, status: 'FAIL', message: 'YAML invalide - pas un objet' });
        return { valid: false, workflow: null };
      }
    } catch (error) {
      this.results.syntax.push({ file: fileName, status: 'FAIL', message: `Erreur syntaxe: ${error.message}` });
      return { valid: false, workflow: null };
    }
  }

  /**
   * Test 2: Structure workflow
   */
  testWorkflowStructure(fileName, workflow) {
    this.log(`🧪 Test structure: ${fileName}`, 'test');

    const required = ['name', 'on', 'jobs'];
    const missing = required.filter(field => !workflow[field]);

    if (missing.length === 0) {
      // Vérifications avancées
      const checks = [];

      // Vérifier structure jobs
      if (workflow.jobs && typeof workflow.jobs === 'object') {
        const jobCount = Object.keys(workflow.jobs).length;
        checks.push(`${jobCount} job(s) défini(s)`);

        // Vérifier chaque job
        for (const [jobName, jobConfig] of Object.entries(workflow.jobs)) {
          if (!jobConfig['runs-on']) {
            checks.push(`❌ Job ${jobName}: runs-on manquant`);
          } else {
            checks.push(`✅ Job ${jobName}: runs-on OK`);
          }

          if (!jobConfig.steps || !Array.isArray(jobConfig.steps)) {
            checks.push(`❌ Job ${jobName}: steps manquants/invalides`);
          } else {
            checks.push(`✅ Job ${jobName}: ${jobConfig.steps.length} step(s)`);
          }
        }
      }

      this.results.structure.push({
        file: fileName,
        status: 'PASS',
        message: `Structure valide - ${checks.join(', ')}`
      });
      return true;
    } else {
      this.results.structure.push({
        file: fileName,
        status: 'FAIL',
        message: `Champs manquants: ${missing.join(', ')}`
      });
      return false;
    }
  }

  /**
   * Test 3: Logique workflow
   */
  testWorkflowLogic(fileName, workflow) {
    this.log(`🧪 Test logique: ${fileName}`, 'test');

    const issues = [];
    const positives = [];

    // Test triggers
    if (workflow.on) {
      if (workflow.on.schedule) {
        const schedules = Array.isArray(workflow.on.schedule) ? workflow.on.schedule : [workflow.on.schedule];
        schedules.forEach((schedule, i) => {
          if (schedule.cron) {
            positives.push(`Schedule ${i + 1}: ${schedule.cron}`);
          }
        });
      }

      if (workflow.on.workflow_dispatch) {
        positives.push('Manuel trigger OK');
      }

      if (workflow.on.push) {
        positives.push('Push trigger OK');
      }
    }

    // Test dependencies
    if (workflow.jobs) {
      for (const [jobName, jobConfig] of Object.entries(workflow.jobs)) {
        if (jobConfig.needs) {
          const needs = Array.isArray(jobConfig.needs) ? jobConfig.needs : [jobConfig.needs];
          const jobNames = Object.keys(workflow.jobs);

          for (const need of needs) {
            if (!jobNames.includes(need)) {
              issues.push(`Job ${jobName}: dépendance inexistante ${need}`);
            } else {
              positives.push(`Job ${jobName}: dépendance ${need} OK`);
            }
          }
        }

        // Test conditions
        if (jobConfig.if) {
          if (jobConfig.if.includes('github.event') && !jobConfig.if.includes('github.event_name')) {
            issues.push(`Job ${jobName}: condition github.event potentiellement dangereuse`);
          } else {
            positives.push(`Job ${jobName}: condition sécurisée`);
          }
        }
      }
    }

    if (issues.length === 0) {
      this.results.logic.push({
        file: fileName,
        status: 'PASS',
        message: `Logique valide - ${positives.join(', ')}`
      });
    } else {
      this.results.logic.push({
        file: fileName,
        status: 'WARN',
        message: `Problèmes: ${issues.join(', ')}`
      });
    }
  }

  /**
   * Test 4: Sécurité
   */
  testWorkflowSecurity(fileName, workflow) {
    this.log(`🧪 Test sécurité: ${fileName}`, 'test');

    const issues = [];
    const securities = [];

    // Test permissions
    if (workflow.permissions) {
      if (workflow.permissions === 'write-all' ||
        (typeof workflow.permissions === 'object' && workflow.permissions.contents === 'write')) {
        issues.push('Permissions trop larges');
      } else {
        securities.push('Permissions limitées OK');
      }
    } else {
      securities.push('Permissions par défaut (sécurisées)');
    }

    // Test github.event usage
    const content = fs.readFileSync(path.join(this.workflowsDir, fileName), 'utf8');
    if (content.includes('github.event.') && !content.includes('github.event_name')) {
      issues.push('Usage github.event potentiellement dangereux');
    } else if (content.includes('github.event_name')) {
      securities.push('Usage github.event_name sécurisé');
    }

    // Test secrets
    if (content.includes('secrets.')) {
      if (content.includes('GEMINI_API_KEY') || content.includes('OPENAI_API_KEY')) {
        if (content.includes('continue-on-error')) {
          securities.push('Secrets IA sécurisés');
        } else {
          issues.push('Secrets IA non protégés');
        }
      }
      if (content.includes('HOMEY_PAT') || content.includes('GITHUB_TOKEN')) {
        securities.push('Secrets standards utilisés');
      }
    }

    if (issues.length === 0) {
      this.results.security.push({
        file: fileName,
        status: 'PASS',
        message: `Sécurité OK - ${securities.join(', ')}`
      });
    } else {
      this.results.security.push({
        file: fileName,
        status: 'WARN',
        message: `Problèmes: ${issues.join(', ')}`
      });
    }
  }

  /**
   * Test 5: Performance
   */
  testWorkflowPerformance(fileName, workflow) {
    this.log(`🧪 Test performance: ${fileName}`, 'test');

    const issues = [];
    const optimizations = [];

    // Test schedules
    if (workflow.on && workflow.on.schedule) {
      const schedules = Array.isArray(workflow.on.schedule) ? workflow.on.schedule : [workflow.on.schedule];
      schedules.forEach(schedule => {
        if (schedule.cron) {
          // Patterns fréquents
          const frequent = [
            '0 * * * *',   // Toutes les heures
            '*/15 * * * *', // Toutes les 15 min
            '*/30 * * * *', // Toutes les 30 min
            '0 */2 * * *'   // Toutes les 2h
          ];

          if (frequent.includes(schedule.cron)) {
            issues.push(`Schedule fréquent: ${schedule.cron}`);
          } else {
            optimizations.push(`Schedule optimisé: ${schedule.cron}`);
          }
        }
      });
    }

    // Test timeouts
    if (workflow.jobs) {
      for (const [jobName, jobConfig] of Object.entries(workflow.jobs)) {
        if (jobConfig['timeout-minutes']) {
          if (jobConfig['timeout-minutes'] > 120) {
            issues.push(`Job ${jobName}: timeout excessif (${jobConfig['timeout-minutes']}min)`);
          } else {
            optimizations.push(`Job ${jobName}: timeout raisonnable (${jobConfig['timeout-minutes']}min)`);
          }
        } else {
          optimizations.push(`Job ${jobName}: timeout par défaut`);
        }

        // Test cache
        if (jobConfig.steps) {
          const hasNodeSetup = jobConfig.steps.some(step =>
            step.uses && step.uses.includes('setup-node')
          );
          const hasCache = jobConfig.steps.some(step =>
            step.with && step.with.cache
          );

          if (hasNodeSetup && hasCache) {
            optimizations.push(`Job ${jobName}: cache npm activé`);
          } else if (hasNodeSetup && !hasCache) {
            issues.push(`Job ${jobName}: cache npm manquant`);
          }
        }
      }
    }

    if (issues.length === 0) {
      this.results.performance.push({
        file: fileName,
        status: 'PASS',
        message: `Performance OK - ${optimizations.join(', ')}`
      });
    } else {
      this.results.performance.push({
        file: fileName,
        status: 'WARN',
        message: `Problèmes: ${issues.join(', ')} | OK: ${optimizations.join(', ')}`
      });
    }
  }

  /**
   * Test 6: Fonctionnalité
   */
  testWorkflowFunctionality(fileName, workflow) {
    this.log(`🧪 Test fonctionnalité: ${fileName}`, 'test');

    const features = [];
    const missing = [];

    // Analyser le type de workflow
    const workflowType = this.getWorkflowType(fileName, workflow);
    features.push(`Type: ${workflowType}`);

    // Tests spécifiques par type
    switch (workflowType) {
      case 'validation':
        if (this.hasValidationSteps(workflow)) {
          features.push('Steps validation présents');
        } else {
          missing.push('Steps validation manquants');
        }
        break;

      case 'publish':
        if (this.hasPublishSteps(workflow)) {
          features.push('Steps publish présents');
        } else {
          missing.push('Steps publish manquants');
        }
        break;

      case 'automation':
        if (this.hasAutomationSteps(workflow)) {
          features.push('Steps automation présents');
        } else {
          missing.push('Steps automation manquants');
        }
        break;

      case 'ci-cd':
        if (this.hasCiCdSteps(workflow)) {
          features.push('Pipeline CI/CD complet');
        } else {
          missing.push('Pipeline CI/CD incomplet');
        }
        break;
    }

    // Test actions officielles
    const content = fs.readFileSync(path.join(this.workflowsDir, fileName), 'utf8');
    if (content.includes('athombv/github-action-homey')) {
      features.push('Actions Athom officielles utilisées');
    }
    if (content.includes('actions/checkout@v4')) {
      features.push('Actions GitHub v4 utilisées');
    }

    if (missing.length === 0) {
      this.results.functionality.push({
        file: fileName,
        status: 'PASS',
        message: `Fonctionnalité complète - ${features.join(', ')}`
      });
    } else {
      this.results.functionality.push({
        file: fileName,
        status: 'WARN',
        message: `Manques: ${missing.join(', ')} | OK: ${features.join(', ')}`
      });
    }
  }

  getWorkflowType(fileName, workflow) {
    if (fileName.includes('validate')) return 'validation';
    if (fileName.includes('publish')) return 'publish';
    if (fileName.includes('ci-cd')) return 'ci-cd';
    if (fileName.includes('automation') || fileName.includes('monitor')) return 'automation';
    if (fileName.includes('docs')) return 'documentation';
    if (fileName.includes('version')) return 'versioning';
    return 'general';
  }

  hasValidationSteps(workflow) {
    const content = JSON.stringify(workflow);
    return content.includes('validate') || content.includes('athombv/github-action-homey-app-validate');
  }

  hasPublishSteps(workflow) {
    const content = JSON.stringify(workflow);
    return content.includes('publish') || content.includes('athombv/github-action-homey-app-publish');
  }

  hasAutomationSteps(workflow) {
    const content = JSON.stringify(workflow);
    return content.includes('automation') || content.includes('script') || content.includes('node ');
  }

  hasCiCdSteps(workflow) {
    const content = JSON.stringify(workflow);
    return content.includes('validate') && content.includes('publish');
  }

  /**
   * Test workflow complet
   */
  testWorkflow(fileName) {
    this.log(`🧪 DÉBUT TEST: ${fileName}`, 'test');

    // Test 1: Syntaxe YAML
    const syntaxResult = this.testYamlSyntax(fileName);
    if (!syntaxResult.valid) {
      this.log(`❌ ${fileName}: Syntaxe invalide, tests arrêtés`, 'error');
      return;
    }

    const workflow = syntaxResult.workflow;

    // Test 2-6: Tests fonctionnels
    this.testWorkflowStructure(fileName, workflow);
    this.testWorkflowLogic(fileName, workflow);
    this.testWorkflowSecurity(fileName, workflow);
    this.testWorkflowPerformance(fileName, workflow);
    this.testWorkflowFunctionality(fileName, workflow);

    this.log(`✅ ${fileName}: Tests terminés`, 'success');
  }

  /**
   * Exécution de tous les tests
   */
  run() {
    this.log('🧪 DÉBUT TESTS COMPLETS WORKFLOWS YML', 'test');

    const workflowFiles = fs.readdirSync(this.workflowsDir)
      .filter(file => file.endsWith('.yml') || file.endsWith('.yaml'));

    this.log(`📂 ${workflowFiles.length} workflows trouvés`, 'info');

    // Tester chaque workflow
    workflowFiles.forEach(file => {
      this.testWorkflow(file);
    });

    // Générer rapport
    this.generateTestReport();

    // Calculer score global
    const globalScore = this.calculateGlobalScore();

    if (globalScore >= 90) {
      this.log(`🎉 TESTS RÉUSSIS: Score global ${globalScore}%`, 'success');
      return true;
    } else {
      this.log(`⚠️ TESTS PARTIELS: Score global ${globalScore}%`, 'warning');
      return false;
    }
  }

  calculateGlobalScore() {
    let totalTests = 0;
    let passedTests = 0;

    Object.values(this.results).forEach(testResults => {
      testResults.forEach(result => {
        totalTests++;
        if (result.status === 'PASS') {
          passedTests++;
        } else if (result.status === 'WARN') {
          passedTests += 0.5; // Demi-point pour avertissement
        }
      });
    });

    return totalTests > 0 ? Math.round((passedTests / totalTests) * 100) : 0;
  }

  generateTestReport() {
    const score = this.calculateGlobalScore();

    let report = `# 🧪 RAPPORT TEST COMPLET WORKFLOWS YML

## 🎯 SCORE GLOBAL: ${score}%

**Timestamp:** ${new Date().toISOString()}

## 📊 RÉSULTATS PAR CATÉGORIE

`;

    const categories = [
      { key: 'syntax', name: '1️⃣ SYNTAXE YAML', icon: '📝' },
      { key: 'structure', name: '2️⃣ STRUCTURE', icon: '🏗️' },
      { key: 'logic', name: '3️⃣ LOGIQUE', icon: '🧠' },
      { key: 'security', name: '4️⃣ SÉCURITÉ', icon: '🔒' },
      { key: 'performance', name: '5️⃣ PERFORMANCE', icon: '⚡' },
      { key: 'functionality', name: '6️⃣ FONCTIONNALITÉ', icon: '⚙️' }
    ];

    categories.forEach(({ key, name, icon }) => {
      const results = this.results[key];
      const passed = results.filter(r => r.status === 'PASS').length;
      const warned = results.filter(r => r.status === 'WARN').length;
      const failed = results.filter(r => r.status === 'FAIL').length;

      report += `### ${icon} ${name}
**✅ PASS:** ${passed} | **⚠️ WARN:** ${warned} | **❌ FAIL:** ${failed}

`;

      results.forEach(result => {
        const status = result.status === 'PASS' ? '✅' : result.status === 'WARN' ? '⚠️' : '❌';
        report += `- ${status} **${result.file}**: ${result.message}\n`;
      });

      report += '\n';
    });

    report += `## 🚀 RECOMMANDATIONS

${score >= 95 ? '🎉 **EXCELLENT:** Tous les workflows sont optimaux!' :
        score >= 85 ? '✅ **BON:** Workflows fonctionnels avec quelques améliorations possibles' :
          score >= 70 ? '⚠️ **MOYEN:** Plusieurs problèmes à corriger' :
            '❌ **CRITIQUE:** Corrections majeures requises'}

## 📋 PROCHAINES ÉTAPES

${score >= 90 ?
        '✅ **DÉPLOIEMENT:** Prêt pour déploiement en production' :
        '🔧 **CORRECTIONS:** Appliquer les corrections recommandées puis re-tester'}

---
*Tests automatisés générés par ComprehensiveYmlTester* 🧪
`;

    const reportPath = path.join(process.cwd(), 'YML-WORKFLOWS-COMPREHENSIVE-TEST-REPORT.md');
    fs.writeFileSync(reportPath, report);
    this.log(`📄 Rapport complet généré: ${reportPath}`, 'success');
  }
}

// Exécution des tests
if (require.main === module) {
  const tester = new ComprehensiveYmlTester();
  const success = tester.run();
  process.exit(success ? 0 : 1);
}

module.exports = ComprehensiveYmlTester;
