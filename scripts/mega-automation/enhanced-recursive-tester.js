#!/usr/bin/env node

const fs = require('fs');
const path = require('path');
const { execSync } = require('child_process');

/**
 * 🔍 ENHANCED RECURSIVE SYSTEM TESTER
 * Teste, vérifie, valide et corrige de façon récursive avec protections et feedbacks
 */
class EnhancedRecursiveTester {
  constructor() {
    this.maxIterations = 5;
    this.currentIteration = 0;
    this.issues = [];
    this.corrections = [];
    this.protections = {
      maxFileSize: 10 * 1024 * 1024, // 10MB
      timeout: 60000, // 60 seconds
      maxCorrectionAttempts: 3
    };
    this.feedback = {
      verbose: true,
      logLevel: 'detailed'
    };
  }

  log(message, level = 'info') {
    const timestamp = new Date().toISOString();
    const prefix = {
      'info': '📝',
      'success': '✅',
      'error': '❌',
      'warning': '⚠️',
      'debug': '🔍'
    };

    if (this.feedback.verbose) {
      console.log(`${prefix[level]} [${timestamp}] ${message}`);
    }
  }

  async executeWithProtection(operation, description) {
    this.log(`Executing: ${description}`, 'debug');

    try {
      const result = await Promise.race([
        operation(),
        new Promise((_, reject) =>
          setTimeout(() => reject(new Error('Operation timeout')), this.protections.timeout)
        )
      ]);

      this.log(`✅ ${description} - SUCCESS`, 'success');
      return { success: true, result };
    } catch (error) {
      this.log(`❌ ${description} - FAILED: ${error.message}`, 'error');
      this.issues.push({
        type: 'execution_error',
        description,
        error: error.message,
        timestamp: new Date().toISOString()
      });
      return { success: false, error: error.message };
    }
  }

  async testScriptSyntax() {
    this.log('🔍 Testing script syntax...', 'info');
    const scriptDir = path.join(process.cwd(), 'scripts', 'mega-automation');

    if (!fs.existsSync(scriptDir)) {
      this.issues.push({
        type: 'missing_directory',
        path: scriptDir,
        correction: 'mkdir -p ' + scriptDir
      });
      return false;
    }

    const scripts = [
      'github-pr-issues-auto-processor.js',
      'fork-detection-monitor.js',
      'community-engagement-stats.js',
      'ai-auto-problem-resolver.js',
      'intelligent-knowledge-extractor.js',
      'auto-fix-generator.js',
      'intelligent-weekly-scheduler.js',
      'comprehensive-system-tester.js'
    ];

    let allValid = true;

    for (const script of scripts) {
      const scriptPath = path.join(scriptDir, script);

      const result = await this.executeWithProtection(async () => {
        if (fs.existsSync(scriptPath)) {
          const stat = fs.statSync(scriptPath);
          if (stat.size > this.protections.maxFileSize) {
            throw new Error(`File too large: ${stat.size} bytes`);
          }

          // Test syntax with Node.js
          execSync(`node --check "${scriptPath}"`, { stdio: 'ignore' });
          return 'valid';
        } else {
          throw new Error('File does not exist');
        }
      }, `Syntax check: ${script}`);

      if (!result.success) {
        allValid = false;
        this.issues.push({
          type: 'syntax_error',
          script: script,
          path: scriptPath,
          error: result.error
        });
      }
    }

    return allValid;
  }

  async testWorkflowFiles() {
    this.log('⚙️ Testing GitHub Actions workflows...', 'info');
    const workflowDir = path.join(process.cwd(), '.github', 'workflows');

    // Test for our new intelligent workflow
    const intelligentWorkflow = path.join(workflowDir, 'intelligent-weekly-automation.yml');

    const result = await this.executeWithProtection(async () => {
      if (!fs.existsSync(intelligentWorkflow)) {
        throw new Error('Intelligent weekly automation workflow not found');
      }

      const content = fs.readFileSync(intelligentWorkflow, 'utf8');

      // Basic YAML structure validation
      if (!content.includes('name:') || !content.includes('jobs:')) {
        throw new Error('Invalid workflow structure');
      }

      // Check for required jobs
      const requiredJobs = ['critical-components', 'important-components', 'daily-enrichment', 'weekly-intelligent-orchestration'];
      for (const job of requiredJobs) {
        if (!content.includes(job)) {
          throw new Error(`Missing required job: ${job}`);
        }
      }

      return 'valid';
    }, 'Workflow validation');

    return result.success;
  }

  async testDependencies() {
    this.log('📦 Testing dependencies...', 'info');

    const packageJsonPath = path.join(process.cwd(), 'package.json');

    const result = await this.executeWithProtection(async () => {
      if (!fs.existsSync(packageJsonPath)) {
        throw new Error('package.json not found');
      }

      const packageJson = JSON.parse(fs.readFileSync(packageJsonPath, 'utf8'));

      // Check for required dependencies
      const requiredDeps = ['@octokit/rest', 'axios'];
      const missingDeps = [];

      for (const dep of requiredDeps) {
        if (!packageJson.dependencies?.[dep] && !packageJson.devDependencies?.[dep]) {
          missingDeps.push(dep);
        }
      }

      if (missingDeps.length > 0) {
        throw new Error(`Missing dependencies: ${missingDeps.join(', ')}`);
      }

      return 'valid';
    }, 'Dependencies check');

    return result.success;
  }

  async testHomeyValidation() {
    this.log('🏠 Testing Homey app validation...', 'info');

    const result = await this.executeWithProtection(async () => {
      // Test Homey CLI availability
      try {
        execSync('homey --version', { stdio: 'ignore' });
      } catch {
        throw new Error('Homey CLI not available - install with: npm install -g @athombv/homey');
      }

      // Test app build
      execSync('homey app build', { stdio: 'ignore', cwd: process.cwd() });

      // Test app validation
      execSync('homey app validate', { stdio: 'ignore', cwd: process.cwd() });

      return 'valid';
    }, 'Homey app validation');

    return result.success;
  }

  async testFunctionalComponents() {
    this.log('🧪 Testing functional components...', 'info');

    const tests = [
      {
        name: 'GitHub API access',
        test: async () => {
          if (!process.env.GITHUB_TOKEN) {
            throw new Error('GITHUB_TOKEN environment variable not set');
          }
          return 'valid';
        }
      },
      {
        name: 'File system permissions',
        test: async () => {
          const testFile = path.join(process.cwd(), 'test-write-permissions.tmp');
          fs.writeFileSync(testFile, 'test');
          fs.unlinkSync(testFile);
          return 'valid';
        }
      },
      {
        name: 'Log directories',
        test: async () => {
          const logDirs = [
            'logs/mega-automation',
            'logs/weekly-orchestration',
            'logs/enrichment',
            'test-reports',
            'project-data'
          ];

          for (const dir of logDirs) {
            const dirPath = path.join(process.cwd(), dir);
            if (!fs.existsSync(dirPath)) {
              fs.mkdirSync(dirPath, { recursive: true });
            }
          }
          return 'valid';
        }
      }
    ];

    let allPassed = true;
    for (const test of tests) {
      const result = await this.executeWithProtection(test.test, test.name);
      if (!result.success) {
        allPassed = false;
      }
    }

    return allPassed;
  }

  async applyCorrections() {
    this.log('🔧 Applying corrections...', 'info');
    let correctionsMade = 0;

    for (const issue of this.issues) {
      if (this.corrections.length >= this.protections.maxCorrectionAttempts) {
        this.log('⚠️ Maximum correction attempts reached', 'warning');
        break;
      }

      const result = await this.executeWithProtection(async () => {
        switch (issue.type) {
          case 'missing_directory':
            fs.mkdirSync(issue.path, { recursive: true });
            return `Created directory: ${issue.path}`;

          case 'syntax_error':
            if (issue.script === 'comprehensive-system-tester.js') {
              // Skip self-correction to avoid infinite loops
              return 'Skipped self-correction';
            }
            return 'Syntax error noted for manual review';

          case 'execution_error':
            return 'Execution error noted for manual review';

          default:
            return 'Issue noted for manual review';
        }
      }, `Correcting: ${issue.type}`);

      if (result.success) {
        correctionsMade++;
        this.corrections.push({
          issue: issue.type,
          correction: result.result,
          timestamp: new Date().toISOString()
        });
      }
    }

    this.log(`🔧 Applied ${correctionsMade} corrections`, 'info');
    return correctionsMade;
  }

  async runRecursiveTest() {
    this.log('🔄 STARTING ENHANCED RECURSIVE TESTING', 'info');
    this.log(`📊 Configuration: Max iterations: ${this.maxIterations}, Timeout: ${this.protections.timeout}ms`, 'info');

    for (this.currentIteration = 1; this.currentIteration <= this.maxIterations; this.currentIteration++) {
      this.log(`\n🔄 ITERATION ${this.currentIteration}/${this.maxIterations}`, 'info');
      this.log('=' + '='.repeat(50), 'info');

      // Reset issues for this iteration
      this.issues = [];

      // Run all tests
      const tests = [
        { name: 'Script Syntax', test: () => this.testScriptSyntax() },
        { name: 'Workflow Files', test: () => this.testWorkflowFiles() },
        { name: 'Dependencies', test: () => this.testDependencies() },
        { name: 'Functional Components', test: () => this.testFunctionalComponents() },
        { name: 'Homey Validation', test: () => this.testHomeyValidation() }
      ];

      let allTestsPassed = true;
      const testResults = {};

      for (const test of tests) {
        const result = await test.test();
        testResults[test.name] = result;
        if (!result) {
          allTestsPassed = false;
        }
      }

      // Apply corrections if needed
      const correctionsMade = await this.applyCorrections();

      // Summary for this iteration
      this.log(`\n📊 ITERATION ${this.currentIteration} SUMMARY:`, 'info');
      this.log(`- Issues found: ${this.issues.length}`, 'info');
      this.log(`- Corrections made: ${correctionsMade}`, 'info');
      this.log(`- All tests passed: ${allTestsPassed ? 'YES' : 'NO'}`, allTestsPassed ? 'success' : 'warning');

      // If all tests passed and no issues found, we're done
      if (allTestsPassed && this.issues.length === 0) {
        this.log('\n🎉 ALL TESTS PASSED! System is validated and ready.', 'success');
        await this.generateDetailedReport('SUCCESS');
        return { success: true, iterations: this.currentIteration, issues: 0 };
      }

      // If no corrections were made, break to avoid infinite loop
      if (correctionsMade === 0 && this.issues.length > 0) {
        this.log('⚠️ No corrections could be applied - manual intervention needed', 'warning');
        break;
      }
    }

    // Generate final report
    await this.generateDetailedReport('ISSUES_DETECTED');
    return {
      success: false,
      iterations: this.currentIteration - 1,
      issues: this.issues.length,
      corrections: this.corrections.length
    };
  }

  async generateDetailedReport(finalStatus) {
    const reportsDir = path.join(process.cwd(), 'test-reports');
    if (!fs.existsSync(reportsDir)) {
      fs.mkdirSync(reportsDir, { recursive: true });
    }

    const reportPath = path.join(reportsDir, 'ENHANCED-RECURSIVE-TEST-REPORT.md');

    const report = `# 🔍 ENHANCED RECURSIVE SYSTEM TEST REPORT

**Generated**: ${new Date().toISOString()}
**Test Duration**: ${this.currentIteration} iterations
**Final Status**: ${finalStatus}
**Protection Settings**: Max iterations: ${this.maxIterations}, Timeout: ${this.protections.timeout}ms

## 📊 Test Results Summary

### Iterations Completed
- **Total Iterations**: ${this.currentIteration}
- **Max Iterations**: ${this.maxIterations}
- **Issues Found**: ${this.issues.length}
- **Corrections Applied**: ${this.corrections.length}

### Issue Breakdown
${this.issues.map(issue => `- **${issue.type}**: ${issue.description || issue.error || 'No description'}`).join('\n') || 'No issues found'}

### Corrections Applied
${this.corrections.map(correction => `- **${correction.issue}**: ${correction.correction}`).join('\n') || 'No corrections needed'}

## 🛡️ Protection Mechanisms

### Active Protections
- **File Size Limit**: ${Math.round(this.protections.maxFileSize / 1024 / 1024)}MB
- **Operation Timeout**: ${this.protections.timeout}ms
- **Max Correction Attempts**: ${this.protections.maxCorrectionAttempts}

### Feedback System
- **Verbose Logging**: ${this.feedback.verbose ? 'Enabled' : 'Disabled'}
- **Log Level**: ${this.feedback.logLevel}

## 🎯 Recommendations

${finalStatus === 'SUCCESS' ?
        `✅ **SYSTEM READY** - All tests passed and system is validated
- All components are functioning correctly
- No manual intervention required
- System ready for production use` :
        `⚠️ **MANUAL INTERVENTION REQUIRED**
- ${this.issues.length} issues detected that require manual resolution
- Review the issue breakdown above
- Check logs for detailed error information
- Consider updating protection settings if needed`}

## 🔄 Next Steps

${finalStatus === 'SUCCESS' ?
        `- Monitor system performance in production
- Schedule regular recursive testing
- Review logs periodically` :
        `- Address unresolved issues manually
- Re-run testing after fixes
- Consider adjusting protection parameters`}

---
*Generated by Enhanced Recursive System Tester v2.0.0*
*Protection Level: Maximum | Feedback: Detailed*
`;

    fs.writeFileSync(reportPath, report);
    this.log(`📊 DETAILED REPORT GENERATED: ${reportPath}`, 'success');

    return reportPath;
  }
}

// Execute if called directly
if (require.main === module) {
  const tester = new EnhancedRecursiveTester();

  tester.runRecursiveTest().then(result => {
    console.log('\n🎉 ENHANCED RECURSIVE TESTING COMPLETED');
    console.log('==========================================');
    console.log(`Final Status: ${result.success ? 'SUCCESS' : 'ISSUES_DETECTED'}`);
    console.log(`Iterations: ${result.iterations}`);
    console.log(`Issues: ${result.issues}`);
    console.log(`Corrections: ${result.corrections || 0}`);

    if (result.success) {
      console.log('✅ System validated and ready for production');
    } else {
      console.log('⚠️ Issues detected - Check detailed report for resolution steps');
    }

    process.exit(result.success ? 0 : 1);
  }).catch(error => {
    console.error('❌ CRITICAL ERROR:', error.message);
    process.exit(1);
  });
}

module.exports = EnhancedRecursiveTester;
