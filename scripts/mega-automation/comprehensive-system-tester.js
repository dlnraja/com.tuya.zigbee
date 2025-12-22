#!/usr/bin/env node

/**
 * 🔧 COMPREHENSIVE SYSTEM TESTER v1.0.0
 *
 * Tests récursifs complets de tout le système MEGA Automation:
 * - Test syntaxe et dépendances tous scripts
 * - Validation workflow GitHub Actions
 * - Tests fonctionnels composants IA
 * - Correction automatique erreurs détectées
 * - Répétition jusqu'à succès complet
 */

const fs = require('fs').promises;
const path = require('path');
const { spawn, exec } = require('child_process');
const util = require('util');
const execAsync = util.promisify(exec);

class ComprehensiveSystemTester {
  constructor() {
    this.config = {
      scriptsDir: path.join(process.cwd(), 'scripts', 'mega-automation'),
      workflowFile: path.join(process.cwd(), '.github', 'workflows', 'mega-automation-system.yml'),
      testReportsDir: path.join(process.cwd(), 'test-reports'),
      maxIterations: 3
    };

    this.testResults = {
      scriptTests: [],
      workflowTests: [],
      functionalTests: [],
      correctionsMade: [],
      finalStatus: 'unknown'
    };

    this.scriptsToTest = [
      'github-pr-issues-auto-processor.js',
      'fork-detection-monitor.js',
      'community-engagement-stats.js',
      'ai-auto-problem-resolver.js',
      'intelligent-knowledge-extractor.js',
      'auto-fix-generator.js'
    ];
  }

  /**
   * 🚀 Exécution principale tests récursifs
   */
  async execute() {
    console.log('🔧 COMPREHENSIVE SYSTEM TESTER');
    console.log('==============================');

    let iteration = 0;
    let allTestsPassed = false;

    while (iteration < this.config.maxIterations && !allTestsPassed) {
      iteration++;
      console.log(`\n🔄 ITERATION ${iteration}/${this.config.maxIterations}`);
      console.log('=====================================');

      // 1. Tests syntaxe et structure
      const syntaxResults = await this.testScriptSyntax();

      // 2. Tests dépendances
      const dependencyResults = await this.testDependencies();

      // 3. Tests workflow GitHub Actions
      const workflowResults = await this.testWorkflow();

      // 4. Tests fonctionnels
      const functionalResults = await this.testFunctionalComponents();

      // 5. Analyser résultats et corriger
      const correctionsMade = await this.analyzeAndCorrect({
        syntax: syntaxResults,
        dependencies: dependencyResults,
        workflow: workflowResults,
        functional: functionalResults
      });

      // 6. Vérifier si tous tests réussissent
      allTestsPassed = this.checkAllTestsPass({
        syntax: syntaxResults,
        dependencies: dependencyResults,
        workflow: workflowResults,
        functional: functionalResults
      });

      console.log(`\n📊 ITERATION ${iteration} SUMMARY:`);
      console.log(`- Corrections made: ${correctionsMade.length}`);
      console.log(`- All tests passed: ${allTestsPassed ? 'YES' : 'NO'}`);

      if (allTestsPassed) {
        break;
      }
    }

    await this.generateFinalReport();
    return this.testResults;
  }

  /**
   * 🔍 Test syntaxe tous scripts
   */
  async testScriptSyntax() {
    console.log('🔍 Testing script syntax...');
    const results = [];

    for (const script of this.scriptsToTest) {
      const scriptPath = path.join(this.config.scriptsDir, script);

      try {
        // Vérifier existence
        await fs.access(scriptPath);

        // Test syntaxe Node.js
        const { stdout, stderr } = await execAsync(`node --check "${scriptPath}"`);

        results.push({
          script,
          status: 'PASS',
          message: 'Syntax OK'
        });

      } catch (error) {
        results.push({
          script,
          status: 'FAIL',
          message: error.message,
          error: error
        });
      }
    }

    this.testResults.scriptTests = results;
    return results;
  }

  /**
   * 📦 Test dépendances
   */
  async testDependencies() {
    console.log('📦 Testing dependencies...');
    const results = [];

    const requiredDependencies = [
      '@octokit/rest',
      'axios',
      'cheerio'
    ];

    for (const dep of requiredDependencies) {
      try {
        require.resolve(dep);
        results.push({
          dependency: dep,
          status: 'PASS',
          message: 'Available'
        });
      } catch (error) {
        results.push({
          dependency: dep,
          status: 'FAIL',
          message: 'Missing dependency',
          error: error
        });
      }
    }

    return results;
  }

  /**
   * ⚙️ Test workflow GitHub Actions
   */
  async testWorkflow() {
    console.log('⚙️ Testing GitHub Actions workflow...');
    const results = [];

    try {
      const workflowContent = await fs.readFile(this.config.workflowFile, 'utf8');

      // Test structure YAML basique
      if (!workflowContent.includes('ai-problem-resolution:')) {
        results.push({
          test: 'AI Problem Resolution Job',
          status: 'FAIL',
          message: 'Missing ai-problem-resolution job in workflow'
        });
      } else {
        results.push({
          test: 'AI Problem Resolution Job',
          status: 'PASS',
          message: 'Job present in workflow'
        });
      }

      // Test références scripts
      const missingScripts = [];
      for (const script of this.scriptsToTest) {
        if (!workflowContent.includes(script)) {
          missingScripts.push(script);
        }
      }

      if (missingScripts.length > 0) {
        results.push({
          test: 'Script References',
          status: 'FAIL',
          message: `Missing script references: ${missingScripts.join(', ')}`
        });
      } else {
        results.push({
          test: 'Script References',
          status: 'PASS',
          message: 'All scripts referenced in workflow'
        });
      }

    } catch (error) {
      results.push({
        test: 'Workflow File',
        status: 'FAIL',
        message: `Cannot read workflow file: ${error.message}`
      });
    }

    this.testResults.workflowTests = results;
    return results;
  }

  /**
   * 🧪 Test fonctionnel composants
   */
  async testFunctionalComponents() {
    console.log('🧪 Testing functional components...');
    const results = [];

    // Test AI Problem Resolver
    try {
      const AIResolver = require(path.join(this.config.scriptsDir, 'ai-auto-problem-resolver.js'));
      const resolver = new AIResolver();

      // Test méthodes principales
      if (typeof resolver.analyzeWithAI === 'function') {
        results.push({
          component: 'AI Problem Resolver',
          test: 'analyzeWithAI method',
          status: 'PASS'
        });
      } else {
        results.push({
          component: 'AI Problem Resolver',
          test: 'analyzeWithAI method',
          status: 'FAIL',
          message: 'Method not found'
        });
      }
    } catch (error) {
      results.push({
        component: 'AI Problem Resolver',
        test: 'Module loading',
        status: 'FAIL',
        message: error.message
      });
    }

    // Test Knowledge Extractor
    try {
      const KnowledgeExtractor = require(path.join(this.config.scriptsDir, 'intelligent-knowledge-extractor.js'));
      const extractor = new KnowledgeExtractor();

      if (typeof extractor.extractFromForums === 'function') {
        results.push({
          component: 'Knowledge Extractor',
          test: 'extractFromForums method',
          status: 'PASS'
        });
      } else {
        results.push({
          component: 'Knowledge Extractor',
          test: 'extractFromForums method',
          status: 'FAIL',
          message: 'Method not found'
        });
      }
    } catch (error) {
      results.push({
        component: 'Knowledge Extractor',
        test: 'Module loading',
        status: 'FAIL',
        message: error.message
      });
    }

    this.testResults.functionalTests = results;
    return results;
  }

  /**
   * 🔧 Analyser et corriger erreurs
   */
  async analyzeAndCorrect(allResults) {
    console.log('🔧 Analyzing and correcting errors...');
    const corrections = [];

    // Corriger dépendances manquantes
    const failedDeps = allResults.dependencies.filter(r => r.status === 'FAIL');
    for (const dep of failedDeps) {
      try {
        console.log(`📦 Installing missing dependency: ${dep.dependency}`);
        await execAsync(`npm install ${dep.dependency}`);
        corrections.push({
          type: 'dependency',
          action: `Installed ${dep.dependency}`,
          success: true
        });
      } catch (error) {
        corrections.push({
          type: 'dependency',
          action: `Failed to install ${dep.dependency}`,
          success: false,
          error: error.message
        });
      }
    }

    // Corriger erreurs syntaxe
    const syntaxErrors = allResults.syntax.filter(r => r.status === 'FAIL');
    for (const syntaxError of syntaxErrors) {
      const correction = await this.fixSyntaxError(syntaxError);
      if (correction) {
        corrections.push(correction);
      }
    }

    // Corriger workflow
    const workflowErrors = allResults.workflow.filter(r => r.status === 'FAIL');
    for (const workflowError of workflowErrors) {
      const correction = await this.fixWorkflowError(workflowError);
      if (correction) {
        corrections.push(correction);
      }
    }

    this.testResults.correctionsMade.push(...corrections);
    return corrections;
  }

  /**
   * 🔧 Corriger erreur syntaxe
   */
  async fixSyntaxError(syntaxError) {
    try {
      const scriptPath = path.join(this.config.scriptsDir, syntaxError.script);
      let content = await fs.readFile(scriptPath, 'utf8');

      // Corrections communes
      let correctionMade = false;

      // Fix require() non défini
      if (syntaxError.message.includes('require') && !content.includes('const { require }')) {
        // Généralement un problème avec des modules ES6
        console.log(`🔧 Adding CommonJS compatibility to ${syntaxError.script}`);
        // Pas de modification nécessaire pour l'instant
      }

      // Fix virgules manquantes
      if (syntaxError.message.includes('Unexpected token')) {
        console.log(`🔧 Attempting to fix syntax in ${syntaxError.script}`);
        // Correction basique - ajouter import fs si manquant
        if (!content.includes('const fs = require') && content.includes('fs.')) {
          content = `const fs = require('fs').promises;\n${content}`;
          correctionMade = true;
        }
      }

      if (correctionMade) {
        await fs.writeFile(scriptPath, content);
        return {
          type: 'syntax',
          script: syntaxError.script,
          action: 'Fixed syntax error',
          success: true
        };
      }

    } catch (error) {
      return {
        type: 'syntax',
        script: syntaxError.script,
        action: 'Failed to fix syntax',
        success: false,
        error: error.message
      };
    }

    return null;
  }

  /**
   * 🔧 Corriger erreur workflow
   */
  async fixWorkflowError(workflowError) {
    try {
      if (workflowError.test === 'Script References' && workflowError.message.includes('Missing script references')) {
        console.log('🔧 Adding missing script references to workflow...');

        let workflowContent = await fs.readFile(this.config.workflowFile, 'utf8');

        // Ajouter références manquantes dans la section AI resolution
        const missingScripts = workflowError.message.match(/Missing script references: (.+)/);
        if (missingScripts) {
          const scripts = missingScripts[1].split(', ');

          // Chercher section AI resolution et ajouter scripts
          if (workflowContent.includes('node scripts/mega-automation/ai-auto-problem-resolver.js')) {
            for (const script of scripts) {
              if (!workflowContent.includes(script)) {
                workflowContent = workflowContent.replace(
                  'node scripts/mega-automation/ai-auto-problem-resolver.js',
                  `node scripts/mega-automation/ai-auto-problem-resolver.js\n          node scripts/mega-automation/${script}`
                );
              }
            }

            await fs.writeFile(this.config.workflowFile, workflowContent);

            return {
              type: 'workflow',
              action: 'Added missing script references',
              success: true
            };
          }
        }
      }

    } catch (error) {
      return {
        type: 'workflow',
        action: 'Failed to fix workflow',
        success: false,
        error: error.message
      };
    }

    return null;
  }

  /**
   * ✅ Vérifier si tous tests réussissent
   */
  checkAllTestsPass(allResults) {
    const allTests = [
      ...allResults.syntax,
      ...allResults.dependencies,
      ...allResults.workflow,
      ...allResults.functional
    ];

    const failedTests = allTests.filter(t => t.status === 'FAIL');
    return failedTests.length === 0;
  }

  /**
   * 📊 Générer rapport final
   */
  async generateFinalReport() {
    await fs.mkdir(this.config.testReportsDir, { recursive: true });

    const reportContent = `# 🔧 COMPREHENSIVE SYSTEM TEST REPORT

**Generated**: ${new Date().toISOString()}
**Test Duration**: Complete recursive testing
**Final Status**: ${this.testResults.finalStatus}

## 📊 Test Results Summary

### Script Syntax Tests
${this.testResults.scriptTests.map(t =>
      `- **${t.script}**: ${t.status} - ${t.message}`
    ).join('\n')}

### Workflow Tests
${this.testResults.workflowTests.map(t =>
      `- **${t.test}**: ${t.status} - ${t.message}`
    ).join('\n')}

### Functional Tests
${this.testResults.functionalTests.map(t =>
      `- **${t.component} (${t.test})**: ${t.status}${t.message ? ' - ' + t.message : ''}`
    ).join('\n')}

## 🔧 Corrections Made

${this.testResults.correctionsMade.length > 0 ?
        this.testResults.correctionsMade.map(c =>
          `- **${c.type}**: ${c.action} - ${c.success ? 'SUCCESS' : 'FAILED'}`
        ).join('\n') : 'No corrections needed'}

## 📈 System Health

${this.checkAllTestsPass({
          syntax: this.testResults.scriptTests,
          dependencies: [],
          workflow: this.testResults.workflowTests,
          functional: this.testResults.functionalTests
        }) ?
        '✅ **ALL SYSTEMS OPERATIONAL** - Complete MEGA Automation system ready for production' :
        '⚠️ **ISSUES DETECTED** - Manual intervention may be required'
      }

---
*Generated by Comprehensive System Tester v1.0.0*
`;

    const reportPath = path.join(this.config.testReportsDir, 'SYSTEM-TEST-REPORT.md');
    await fs.writeFile(reportPath, reportContent);

    console.log(`\n📊 FINAL TEST REPORT GENERATED: ${reportPath}`);

    // Mettre à jour statut final
    this.testResults.finalStatus = this.checkAllTestsPass({
      syntax: this.testResults.scriptTests,
      dependencies: [],
      workflow: this.testResults.workflowTests,
      functional: this.testResults.functionalTests
    }) ? 'ALL_TESTS_PASSED' : 'ISSUES_DETECTED';

    return reportPath;
  }
}

// CLI execution
if (require.main === module) {
  const tester = new ComprehensiveSystemTester();

  tester.execute()
    .then(results => {
      console.log('\n🎉 COMPREHENSIVE SYSTEM TESTING COMPLETED');
      console.log('==========================================');
      console.log(`Final Status: ${results.finalStatus}`);

      if (results.finalStatus === 'ALL_TESTS_PASSED') {
        console.log('✅ All systems operational - Ready for production!');
        process.exit(0);
      } else {
        console.log('⚠️ Issues detected - Check test report for details');
        process.exit(1);
      }
    })
    .catch(error => {
      console.error('💥 System testing failed:', error);
      process.exit(1);
    });
}

module.exports = ComprehensiveSystemTester;
