#!/usr/bin/env node

const fs = require('fs');
const path = require('path');
const yaml = require('js-yaml');

/**
 * 🔧 VALIDATION GITHUB WORKFLOWS
 * Analyse et corriger tous les problèmes GitHub Actions/CI/CD
 */
class GitHubWorkflowValidator {
  constructor() {
    this.workflowsDir = path.join(process.cwd(), '.github', 'workflows');
    this.errors = [];
    this.warnings = [];
    this.fixes = [];
  }

  log(message, type = 'info') {
    const icons = { info: '📝', success: '✅', error: '❌', warning: '⚠️', fix: '🔧' };
    console.log(`${icons[type]} ${message}`);
  }

  /**
   * Analyser tous les workflows YAML
   */
  analyzeWorkflows() {
    this.log('🔍 ANALYSE DES WORKFLOWS GITHUB ACTIONS', 'info');

    if (!fs.existsSync(this.workflowsDir)) {
      this.errors.push('Directory .github/workflows not found');
      return false;
    }

    const workflowFiles = fs.readdirSync(this.workflowsDir)
      .filter(file => file.endsWith('.yml') || file.endsWith('.yaml'));

    this.log(`📂 Trouvé ${workflowFiles.length} fichiers workflow`, 'info');

    const results = {};
    for (const file of workflowFiles) {
      const filePath = path.join(this.workflowsDir, file);
      results[file] = this.analyzeWorkflow(filePath);
    }

    return results;
  }

  /**
   * Analyser un workflow individuel
   */
  analyzeWorkflow(filePath) {
    const fileName = path.basename(filePath);
    this.log(`🔍 Analyse: ${fileName}`, 'info');

    try {
      const content = fs.readFileSync(filePath, 'utf8');
      const workflow = yaml.load(content);

      const issues = {
        syntaxErrors: [],
        missingDependencies: [],
        invalidReferences: [],
        duplicateJobs: [],
        securityIssues: [],
        performanceIssues: []
      };

      // Vérifications syntaxiques
      this.checkSyntax(workflow, fileName, issues);

      // Vérifications des dépendances
      this.checkDependencies(workflow, fileName, issues);

      // Vérifications des références
      this.checkReferences(workflow, fileName, issues);

      // Vérifications de sécurité
      this.checkSecurity(workflow, fileName, issues);

      // Vérifications de performance
      this.checkPerformance(workflow, fileName, issues);

      return issues;

    } catch (error) {
      this.errors.push(`${fileName}: Erreur parsing YAML: ${error.message}`);
      return { syntaxErrors: [error.message] };
    }
  }

  checkSyntax(workflow, fileName, issues) {
    // Vérifier structure de base
    if (!workflow.name) {
      issues.syntaxErrors.push('Missing workflow name');
    }

    if (!workflow.on) {
      issues.syntaxErrors.push('Missing trigger configuration (on)');
    }

    if (!workflow.jobs) {
      issues.syntaxErrors.push('Missing jobs configuration');
    }

    // Vérifier jobs
    if (workflow.jobs) {
      const jobNames = Object.keys(workflow.jobs);
      const duplicates = jobNames.filter((name, index) => jobNames.indexOf(name) !== index);
      if (duplicates.length > 0) {
        issues.duplicateJobs.push(...duplicates);
      }

      for (const [jobName, jobConfig] of Object.entries(workflow.jobs)) {
        this.checkJob(jobName, jobConfig, issues, fileName);
      }
    }
  }

  checkJob(jobName, jobConfig, issues, fileName) {
    // Vérifier runs-on
    if (!jobConfig['runs-on']) {
      issues.syntaxErrors.push(`Job '${jobName}': Missing runs-on`);
    }

    // Vérifier needs dependencies
    if (jobConfig.needs) {
      const needs = Array.isArray(jobConfig.needs) ? jobConfig.needs : [jobConfig.needs];
      for (const need of needs) {
        // Cette vérification sera faite dans checkReferences
      }
    }

    // Vérifier steps
    if (!jobConfig.steps || !Array.isArray(jobConfig.steps)) {
      issues.syntaxErrors.push(`Job '${jobName}': Missing or invalid steps`);
    } else {
      jobConfig.steps.forEach((step, index) => {
        this.checkStep(step, index, jobName, issues);
      });
    }

    // Vérifier timeout
    if (jobConfig['timeout-minutes'] && jobConfig['timeout-minutes'] > 360) {
      issues.performanceIssues.push(`Job '${jobName}': Timeout très long (${jobConfig['timeout-minutes']}min)`);
    }
  }

  checkStep(step, index, jobName, issues) {
    if (!step.name && !step.uses && !step.run) {
      issues.syntaxErrors.push(`Job '${jobName}' Step ${index}: Missing name, uses, or run`);
    }

    // Vérifier actions obsolètes
    if (step.uses) {
      const obsoleteActions = {
        'actions/setup-node@v2': 'actions/setup-node@v4',
        'actions/checkout@v2': 'actions/checkout@v4',
        'actions/checkout@v3': 'actions/checkout@v4'
      };

      for (const [obsolete, replacement] of Object.entries(obsoleteActions)) {
        if (step.uses.includes(obsolete.split('@')[0]) && step.uses.includes(obsolete.split('@')[1])) {
          issues.performanceIssues.push(`Step uses obsolete action: ${step.uses} → ${replacement}`);
        }
      }
    }
  }

  checkDependencies(workflow, fileName, issues) {
    if (workflow.jobs) {
      const jobNames = Object.keys(workflow.jobs);

      for (const [jobName, jobConfig] of Object.entries(workflow.jobs)) {
        if (jobConfig.needs) {
          const needs = Array.isArray(jobConfig.needs) ? jobConfig.needs : [jobConfig.needs];

          for (const need of needs) {
            if (!jobNames.includes(need)) {
              issues.missingDependencies.push(`Job '${jobName}' depends on unknown job '${need}'`);
            }
          }
        }
      }
    }
  }

  checkReferences(workflow, fileName, issues) {
    const content = JSON.stringify(workflow);

    // Vérifier références aux outputs
    const outputRefs = content.match(/\$\{\{\s*needs\.[^.]+\.outputs\.[^}\s]+\s*\}\}/g);
    if (outputRefs) {
      for (const ref of outputRefs) {
        // Extraire job et output name
        const match = ref.match(/needs\.([^.]+)\.outputs\.([^}\s]+)/);
        if (match) {
          const [, jobName, outputName] = match;
          if (workflow.jobs && workflow.jobs[jobName]) {
            if (!workflow.jobs[jobName].outputs || !workflow.jobs[jobName].outputs[outputName]) {
              issues.invalidReferences.push(`Invalid output reference: ${ref}`);
            }
          }
        }
      }
    }

    // Vérifier secrets utilisés
    const secretRefs = content.match(/\$\{\{\s*secrets\.[^}\s]+\s*\}\}/g);
    if (secretRefs) {
      const commonSecrets = ['GITHUB_TOKEN', 'HOMEY_TOKEN', 'HOMEY_PAT'];
      for (const ref of secretRefs) {
        const secretName = ref.match(/secrets\.([^}\s]+)/)?.[1];
        if (secretName && !commonSecrets.includes(secretName)) {
          issues.securityIssues.push(`Uncommon secret: ${secretName}`);
        }
      }
    }
  }

  checkSecurity(workflow, fileName, issues) {
    // Vérifier permissions
    if (workflow.permissions) {
      if (workflow.permissions === 'write-all' ||
        (typeof workflow.permissions === 'object' && workflow.permissions.contents === 'write')) {
        issues.securityIssues.push('Broad write permissions - consider limiting scope');
      }
    }

    // Vérifier injection dans run commands
    const content = JSON.stringify(workflow);
    if (content.includes('${{') && content.includes('github.event')) {
      issues.securityIssues.push('Potential injection risk with github.event data');
    }
  }

  checkPerformance(workflow, fileName, issues) {
    // Vérifier caches
    if (workflow.jobs) {
      for (const [jobName, jobConfig] of Object.entries(workflow.jobs)) {
        if (jobConfig.steps) {
          const hasNodeSetup = jobConfig.steps.some(step =>
            step.uses && step.uses.includes('setup-node'));
          const hasCache = jobConfig.steps.some(step =>
            step.uses && (step.uses.includes('setup-node') && step.with && step.with.cache));

          if (hasNodeSetup && !hasCache) {
            issues.performanceIssues.push(`Job '${jobName}': setup-node without cache`);
          }
        }
      }
    }

    // Vérifier schedules trop fréquents
    if (workflow.on && workflow.on.schedule) {
      const schedules = Array.isArray(workflow.on.schedule) ? workflow.on.schedule : [workflow.on.schedule];
      for (const schedule of schedules) {
        if (schedule.cron && schedule.cron.includes('* *')) {
          issues.performanceIssues.push('Very frequent schedule detected');
        }
      }
    }
  }

  /**
   * Générer rapport détaillé
   */
  generateReport(results) {
    const timestamp = new Date().toISOString();

    let report = `# 🔧 RAPPORT VALIDATION GITHUB WORKFLOWS

**Généré**: ${timestamp}
**Fichiers analysés**: ${Object.keys(results).length}

## 📊 RÉSUMÉ GLOBAL

`;

    let totalIssues = 0;
    const categories = {
      'Erreurs Syntaxiques': 'syntaxErrors',
      'Dépendances Manquantes': 'missingDependencies',
      'Références Invalides': 'invalidReferences',
      'Jobs Dupliqués': 'duplicateJobs',
      'Problèmes Sécurité': 'securityIssues',
      'Problèmes Performance': 'performanceIssues'
    };

    for (const [categoryName, categoryKey] of Object.entries(categories)) {
      const count = Object.values(results).reduce((sum, result) =>
        sum + (result[categoryKey]?.length || 0), 0);
      report += `- **${categoryName}**: ${count}\n`;
      totalIssues += count;
    }

    report += `\n**TOTAL PROBLÈMES**: ${totalIssues}\n\n`;

    // Détail par fichier
    for (const [fileName, issues] of Object.entries(results)) {
      const hasIssues = Object.values(issues).some(arr => arr.length > 0);

      if (hasIssues) {
        report += `## ❌ ${fileName}\n\n`;

        for (const [categoryName, categoryKey] of Object.entries(categories)) {
          if (issues[categoryKey] && issues[categoryKey].length > 0) {
            report += `### ${categoryName}\n`;
            for (const issue of issues[categoryKey]) {
              report += `- ${issue}\n`;
            }
            report += '\n';
          }
        }
      } else {
        report += `## ✅ ${fileName}\n\nAucun problème détecté.\n\n`;
      }
    }

    return report;
  }

  /**
   * Correction automatique des problèmes
   */
  autoFixWorkflows(results) {
    this.log('🔧 CORRECTION AUTOMATIQUE DES WORKFLOWS', 'fix');

    const fixes = [];

    for (const [fileName, issues] of Object.entries(results)) {
      const filePath = path.join(this.workflowsDir, fileName);

      try {
        let content = fs.readFileSync(filePath, 'utf8');
        let modified = false;

        // Corriger actions obsolètes
        const actionReplacements = {
          'actions/setup-node@v2': 'actions/setup-node@v4',
          'actions/checkout@v2': 'actions/checkout@v4',
          'actions/checkout@v3': 'actions/checkout@v4'
        };

        for (const [old, replacement] of Object.entries(actionReplacements)) {
          if (content.includes(old)) {
            content = content.replace(new RegExp(old, 'g'), replacement);
            modified = true;
            fixes.push(`${fileName}: ${old} → ${replacement}`);
          }
        }

        // Ajouter cache manquant pour setup-node
        if (content.includes('setup-node@v4') && !content.includes('cache:')) {
          content = content.replace(
            /(uses:\s*actions\/setup-node@v4\s*\n\s*with:\s*\n\s*node-version:)/g,
            '$1\n          cache: "npm"'
          );
          modified = true;
          fixes.push(`${fileName}: Ajouté cache npm pour setup-node`);
        }

        if (modified) {
          fs.writeFileSync(filePath, content);
          this.log(`🔧 Corrigé: ${fileName}`, 'fix');
        }

      } catch (error) {
        this.log(`❌ Erreur correction ${fileName}: ${error.message}`, 'error');
      }
    }

    return fixes;
  }

  /**
   * Exécution complète
   */
  run() {
    this.log('🚀 VALIDATION COMPLÈTE GITHUB WORKFLOWS', 'info');

    const results = this.analyzeWorkflows();
    if (!results) {
      this.log('❌ Impossible d\'analyser les workflows', 'error');
      return false;
    }

    // Générer rapport
    const report = this.generateReport(results);
    const reportPath = path.join(process.cwd(), 'GITHUB-WORKFLOWS-VALIDATION-REPORT.md');
    fs.writeFileSync(reportPath, report);
    this.log(`📄 Rapport généré: ${reportPath}`, 'success');

    // Corrections automatiques
    const fixes = this.autoFixWorkflows(results);

    if (fixes.length > 0) {
      this.log(`🔧 ${fixes.length} corrections appliquées:`, 'fix');
      fixes.forEach(fix => this.log(`  - ${fix}`, 'fix'));
    }

    // Résumé
    const totalIssues = Object.values(results).reduce((sum, issues) =>
      sum + Object.values(issues).reduce((s, arr) => s + arr.length, 0), 0);

    if (totalIssues === 0) {
      this.log('🎉 TOUS LES WORKFLOWS SONT VALIDES!', 'success');
      return true;
    } else {
      this.log(`⚠️ ${totalIssues} problèmes détectés - voir rapport`, 'warning');
      return false;
    }
  }
}

// Exécution directe
if (require.main === module) {
  const validator = new GitHubWorkflowValidator();
  const success = validator.run();
  process.exit(success ? 0 : 1);
}

module.exports = GitHubWorkflowValidator;
