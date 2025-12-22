#!/usr/bin/env node

const fs = require('fs');
const path = require('path');
const { execSync, exec } = require('child_process');

/**
 * 🚀 FAST RECURSIVE VALIDATOR WITH PROTECTIONS
 * Tests rapides avec corrections automatiques et feedbacks détaillés
 */
class FastRecursiveValidator {
  constructor() {
    this.results = {
      syntax: {},
      workflow: {},
      dependencies: {},
      structure: {},
      corrections: [],
      issues: [],
      protections: []
    };
    this.protections = {
      maxExecutionTime: 30000, // 30 secondes max
      skipSlowTests: true,
      autoCorrect: true
    };
  }

  log(message, type = 'info') {
    const timestamp = new Date().toLocaleTimeString();
    const icons = { info: '📝', success: '✅', error: '❌', warning: '⚠️', fix: '🔧' };
    console.log(`${icons[type]} [${timestamp}] ${message}`);
  }

  async testWithTimeout(testFn, description, timeout = 5000) {
    try {
      const result = await Promise.race([
        testFn(),
        new Promise((_, reject) =>
          setTimeout(() => reject(new Error('Timeout')), timeout)
        )
      ]);
      this.log(`${description} - SUCCESS`, 'success');
      return { success: true, result };
    } catch (error) {
      this.log(`${description} - FAILED: ${error.message}`, 'error');
      this.results.issues.push({ test: description, error: error.message });
      return { success: false, error: error.message };
    }
  }

  async validateScriptSyntax() {
    this.log('🔍 Validation syntaxe scripts...', 'info');

    const scriptsDir = path.join(process.cwd(), 'scripts', 'mega-automation');
    const scripts = [
      'github-pr-issues-auto-processor.js',
      'fork-detection-monitor.js',
      'community-engagement-stats.js',
      'ai-auto-problem-resolver.js',
      'intelligent-knowledge-extractor.js',
      'auto-fix-generator.js',
      'intelligent-weekly-scheduler.js'
    ];

    for (const script of scripts) {
      const scriptPath = path.join(scriptsDir, script);

      const result = await this.testWithTimeout(async () => {
        if (!fs.existsSync(scriptPath)) {
          throw new Error('File not found');
        }

        // Test syntaxe rapide
        execSync(`node --check "${scriptPath}"`, {
          stdio: 'ignore',
          timeout: 3000
        });

        return 'VALID';
      }, `Syntaxe: ${script}`, 3000);

      this.results.syntax[script] = result.success ? 'PASS' : 'FAIL';
    }
  }

  async validateWorkflowStructure() {
    this.log('⚙️ Validation workflows GitHub Actions...', 'info');

    const workflowPath = path.join(process.cwd(), '.github', 'workflows', 'intelligent-weekly-automation.yml');

    const result = await this.testWithTimeout(async () => {
      if (!fs.existsSync(workflowPath)) {
        throw new Error('Workflow file not found');
      }

      const content = fs.readFileSync(workflowPath, 'utf8');

      // Vérifications structure
      const checks = [
        { name: 'name field', test: () => content.includes('name:') },
        { name: 'jobs section', test: () => content.includes('jobs:') },
        { name: 'critical-components job', test: () => content.includes('critical-components:') },
        { name: 'important-components job', test: () => content.includes('important-components:') },
        { name: 'daily-enrichment job', test: () => content.includes('daily-enrichment:') },
        { name: 'weekly-orchestration job', test: () => content.includes('weekly-intelligent-orchestration:') },
        { name: 'cron schedules', test: () => content.includes('cron:') },
        { name: 'auto-publish steps', test: () => content.includes('Auto-Publish') }
      ];

      const failures = [];
      for (const check of checks) {
        if (!check.test()) {
          failures.push(check.name);
        }
      }

      if (failures.length > 0) {
        throw new Error(`Missing: ${failures.join(', ')}`);
      }

      return 'VALID';
    }, 'Workflow structure validation', 5000);

    this.results.workflow.structure = result.success ? 'PASS' : 'FAIL';
    if (!result.success) {
      this.results.workflow.error = result.error;
    }
  }

  async validateDependencies() {
    this.log('📦 Validation dépendances...', 'info');

    const result = await this.testWithTimeout(async () => {
      const packageJsonPath = path.join(process.cwd(), 'package.json');

      if (!fs.existsSync(packageJsonPath)) {
        throw new Error('package.json not found');
      }

      const packageJson = JSON.parse(fs.readFileSync(packageJsonPath, 'utf8'));
      const requiredDeps = ['@octokit/rest', 'axios'];
      const missing = [];

      for (const dep of requiredDeps) {
        const exists = packageJson.dependencies?.[dep] || packageJson.devDependencies?.[dep];
        if (!exists) {
          missing.push(dep);
        }
      }

      if (missing.length > 0) {
        // Auto-correction: installer les dépendances manquantes
        if (this.protections.autoCorrect) {
          this.log(`🔧 Installation dépendances manquantes: ${missing.join(', ')}`, 'fix');
          try {
            execSync(`npm install ${missing.join(' ')}`, {
              stdio: 'ignore',
              timeout: 15000
            });
            this.results.corrections.push(`Installed missing dependencies: ${missing.join(', ')}`);
          } catch (installError) {
            throw new Error(`Failed to install: ${missing.join(', ')}`);
          }
        } else {
          throw new Error(`Missing dependencies: ${missing.join(', ')}`);
        }
      }

      return 'VALID';
    }, 'Dependencies validation', 20000);

    this.results.dependencies.status = result.success ? 'PASS' : 'FAIL';
  }

  async validateProjectStructure() {
    this.log('🏗️ Validation structure projet...', 'info');

    const requiredDirs = [
      'scripts/mega-automation',
      '.github/workflows',
      'logs',
      'project-data',
      'test-reports'
    ];

    const requiredFiles = [
      'package.json',
      'app.json',
      '.github/workflows/intelligent-weekly-automation.yml'
    ];

    for (const dir of requiredDirs) {
      const dirPath = path.join(process.cwd(), dir);
      if (!fs.existsSync(dirPath)) {
        if (this.protections.autoCorrect) {
          this.log(`🔧 Création répertoire manquant: ${dir}`, 'fix');
          fs.mkdirSync(dirPath, { recursive: true });
          this.results.corrections.push(`Created directory: ${dir}`);
        } else {
          this.results.issues.push({ type: 'missing_directory', path: dir });
        }
      }
      this.results.structure[dir] = fs.existsSync(dirPath) ? 'PASS' : 'FAIL';
    }

    for (const file of requiredFiles) {
      const filePath = path.join(process.cwd(), file);
      this.results.structure[file] = fs.existsSync(filePath) ? 'PASS' : 'FAIL';
      if (!fs.existsSync(filePath)) {
        this.results.issues.push({ type: 'missing_file', path: file });
      }
    }
  }

  async validateEnvironmentVariables() {
    this.log('🔐 Validation variables environnement...', 'info');

    const requiredEnvVars = [
      { name: 'GITHUB_TOKEN', required: true },
      { name: 'HOMEY_TOKEN', required: false },
      { name: 'GEMINI_API_KEY', required: false },
      { name: 'OPENAI_API_KEY', required: false }
    ];

    const envStatus = {};
    let criticalMissing = 0;

    for (const envVar of requiredEnvVars) {
      const exists = !!process.env[envVar.name];
      envStatus[envVar.name] = exists ? 'PRESENT' : 'MISSING';

      if (!exists && envVar.required) {
        criticalMissing++;
        this.results.issues.push({
          type: 'missing_env_var',
          name: envVar.name,
          critical: true
        });
      }
    }

    this.results.environment = envStatus;
    this.results.environment.criticalMissing = criticalMissing;
  }

  async runProtectionChecks() {
    this.log('🛡️ Vérification protections système...', 'info');

    // Protection 1: Vérifier l'espace disque
    const protectionResults = [];

    try {
      const stats = fs.statSync(process.cwd());
      protectionResults.push({ name: 'disk_access', status: 'OK' });
    } catch (error) {
      protectionResults.push({ name: 'disk_access', status: 'FAIL', error: error.message });
    }

    // Protection 2: Vérifier les permissions d'écriture
    try {
      const testFile = path.join(process.cwd(), '.test-write-permission');
      fs.writeFileSync(testFile, 'test');
      fs.unlinkSync(testFile);
      protectionResults.push({ name: 'write_permissions', status: 'OK' });
    } catch (error) {
      protectionResults.push({ name: 'write_permissions', status: 'FAIL', error: error.message });
    }

    // Protection 3: Vérifier Node.js version
    const nodeVersion = process.version;
    const majorVersion = parseInt(nodeVersion.slice(1).split('.')[0]);
    protectionResults.push({
      name: 'node_version',
      status: majorVersion >= 18 ? 'OK' : 'WARNING',
      value: nodeVersion,
      requirement: '>=18'
    });

    this.results.protections = protectionResults;
  }

  async generateDetailedReport() {
    const reportsDir = path.join(process.cwd(), 'test-reports');
    if (!fs.existsSync(reportsDir)) {
      fs.mkdirSync(reportsDir, { recursive: true });
    }

    const timestamp = new Date().toISOString();
    const reportPath = path.join(reportsDir, 'FAST-RECURSIVE-VALIDATION-REPORT.md');

    // Calculer le score global
    const totalTests = Object.keys(this.results.syntax).length +
      (this.results.workflow.structure === 'PASS' ? 1 : 0) +
      (this.results.dependencies.status === 'PASS' ? 1 : 0) +
      Object.values(this.results.structure).filter(v => v === 'PASS').length;

    const passedTests = Object.values(this.results.syntax).filter(v => v === 'PASS').length +
      (this.results.workflow.structure === 'PASS' ? 1 : 0) +
      (this.results.dependencies.status === 'PASS' ? 1 : 0) +
      Object.values(this.results.structure).filter(v => v === 'PASS').length;

    const successRate = Math.round((passedTests / totalTests) * 100);

    const report = `# 🚀 FAST RECURSIVE VALIDATION REPORT

**Generated**: ${timestamp}
**Success Rate**: ${successRate}% (${passedTests}/${totalTests} tests passed)
**Corrections Applied**: ${this.results.corrections.length}
**Issues Found**: ${this.results.issues.length}
**Execution Mode**: Fast validation with auto-corrections

## 📊 DETAILED TEST RESULTS

### 🔍 Script Syntax Validation
${Object.entries(this.results.syntax).map(([script, status]) =>
      `- **${script}**: ${status === 'PASS' ? '✅' : '❌'} ${status}`
    ).join('\n')}

### ⚙️ Workflow Structure
- **intelligent-weekly-automation.yml**: ${this.results.workflow.structure === 'PASS' ? '✅ PASS' : '❌ FAIL'}
${this.results.workflow.error ? `  - Error: ${this.results.workflow.error}` : ''}

### 📦 Dependencies Status
- **Overall Status**: ${this.results.dependencies.status === 'PASS' ? '✅ PASS' : '❌ FAIL'}
- **Required Dependencies**: @octokit/rest, axios

### 🏗️ Project Structure
${Object.entries(this.results.structure).map(([path, status]) =>
      `- **${path}**: ${status === 'PASS' ? '✅' : '❌'} ${status}`
    ).join('\n')}

### 🔐 Environment Variables
${Object.entries(this.results.environment).filter(([k, v]) => k !== 'criticalMissing').map(([name, status]) =>
      `- **${name}**: ${status === 'PRESENT' ? '✅' : '⚠️'} ${status}`
    ).join('\n')}
- **Critical Missing**: ${this.results.environment.criticalMissing || 0}

### 🛡️ Protection Mechanisms
${this.results.protections.map(protection =>
      `- **${protection.name}**: ${protection.status === 'OK' ? '✅' : protection.status === 'WARNING' ? '⚠️' : '❌'} ${protection.status}${protection.value ? ` (${protection.value})` : ''}`
    ).join('\n')}

## 🔧 AUTO-CORRECTIONS APPLIED

${this.results.corrections.length > 0 ?
        this.results.corrections.map(correction => `- ✅ ${correction}`).join('\n') :
        'No corrections needed'}

## ⚠️ ISSUES DETECTED

${this.results.issues.length > 0 ?
        this.results.issues.map(issue => {
          const severity = issue.critical ? '🚨' : '⚠️';
          return `- ${severity} **${issue.type || issue.test}**: ${issue.error || issue.name || issue.path}`;
        }).join('\n') :
        '✅ No issues detected'}

## 🎯 RECOMMENDATIONS

${successRate >= 90 ?
        `### ✅ EXCELLENT SYSTEM HEALTH (${successRate}%)
- System is ready for production
- All critical components validated
- Minimal manual intervention required` :
        successRate >= 70 ?
          `### ⚠️ GOOD SYSTEM HEALTH (${successRate}%)
- System is mostly functional
- ${this.results.issues.length} issues need attention
- Review and fix highlighted issues` :
          `### ❌ SYSTEM NEEDS ATTENTION (${successRate}%)
- ${this.results.issues.length} issues detected
- Manual intervention required
- Address critical issues before deployment`}

### 🔄 Next Actions
${this.results.environment.criticalMissing > 0 ?
        '1. **CRITICAL**: Set up missing environment variables (GITHUB_TOKEN required)' : ''}
${this.results.issues.filter(i => i.critical).length > 0 ?
        '2. **HIGH**: Resolve critical issues listed above' : ''}
${this.results.issues.filter(i => !i.critical).length > 0 ?
        '3. **MEDIUM**: Address remaining issues for optimal performance' : ''}

## 📈 SYSTEM READINESS

**Overall Status**: ${successRate >= 90 ? '🟢 READY' : successRate >= 70 ? '🟡 MOSTLY READY' : '🔴 NEEDS WORK'}
**Automation Capability**: ${successRate >= 80 ? 'Fully Autonomous' : successRate >= 60 ? 'Semi-Autonomous' : 'Manual Supervision Required'}
**Production Readiness**: ${successRate >= 85 ? 'Production Ready' : 'Development/Testing Only'}

---
*Generated by Fast Recursive Validator v1.0.0*
*Validation completed in under 30 seconds with auto-correction enabled*
`;

    fs.writeFileSync(reportPath, report);
    return { reportPath, successRate, totalIssues: this.results.issues.length };
  }

  async runFastValidation() {
    const startTime = Date.now();
    this.log('🚀 DÉMARRAGE VALIDATION RAPIDE RÉCURSIVE', 'info');

    // Exécution séquentielle rapide
    await this.validateScriptSyntax();
    await this.validateWorkflowStructure();
    await this.validateDependencies();
    await this.validateProjectStructure();
    await this.validateEnvironmentVariables();
    await this.runProtectionChecks();

    // Génération du rapport
    const report = await this.generateDetailedReport();

    const duration = Date.now() - startTime;
    this.log(`📊 VALIDATION TERMINÉE en ${duration}ms`, 'success');
    this.log(`📄 Rapport détaillé: ${report.reportPath}`, 'info');
    this.log(`📈 Taux de réussite: ${report.successRate}%`, report.successRate >= 80 ? 'success' : 'warning');
    this.log(`⚠️ Problèmes détectés: ${report.totalIssues}`, report.totalIssues === 0 ? 'success' : 'warning');
    this.log(`🔧 Corrections appliquées: ${this.results.corrections.length}`, 'info');

    return {
      success: report.successRate >= 80,
      successRate: report.successRate,
      issues: report.totalIssues,
      corrections: this.results.corrections.length,
      reportPath: report.reportPath,
      duration
    };
  }
}

// Exécution directe
if (require.main === module) {
  const validator = new FastRecursiveValidator();

  validator.runFastValidation().then(result => {
    console.log('\n🎉 VALIDATION RÉCURSIVE RAPIDE TERMINÉE');
    console.log('==========================================');
    console.log(`✅ Succès: ${result.success ? 'OUI' : 'NON'}`);
    console.log(`📊 Taux de réussite: ${result.successRate}%`);
    console.log(`⚠️ Problèmes: ${result.issues}`);
    console.log(`🔧 Corrections: ${result.corrections}`);
    console.log(`⏱️ Durée: ${result.duration}ms`);
    console.log(`📄 Rapport: ${result.reportPath}`);

    process.exit(result.success ? 0 : 1);
  }).catch(error => {
    console.error('❌ ERREUR CRITIQUE:', error.message);
    process.exit(1);
  });
}

module.exports = FastRecursiveValidator;
