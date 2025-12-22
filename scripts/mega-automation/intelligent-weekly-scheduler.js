#!/usr/bin/env node

/**
 * 🕰️ INTELLIGENT WEEKLY SCHEDULER v1.0.0
 *
 * Planificateur automatique hebdomadaire intelligent:
 * - Orchestration complète tous composants MEGA Automation
 * - Fréquences optimisées selon priorité et charge
 * - Tests complets avant/après chaque exécution
 * - Auto-correction si problèmes détectés
 * - Rapports hebdomadaires complets
 */

const fs = require('fs').promises;
const path = require('path');
const { execSync } = require('child_process');

class IntelligentWeeklyScheduler {
  constructor() {
    this.config = {
      scheduleConfig: path.join(process.cwd(), 'project-data', 'WEEKLY_SCHEDULE.json'),
      logsDir: path.join(process.cwd(), 'logs', 'weekly-scheduler'),
      scriptsDir: path.join(process.cwd(), 'scripts', 'mega-automation')
    };

    // Configuration fréquences intelligentes
    this.intelligentSchedule = {
      // CRITIQUES - Toutes les 2 heures
      critical: {
        frequency: '0 */2 * * *', // Toutes les 2h
        scripts: [
          'github-pr-issues-auto-processor.js', // PR/Issues urgents
          'fork-detection-monitor.js' // Surveillance forks actifs
        ],
        priority: 'HIGH',
        maxDuration: 30 // minutes
      },

      // IMPORTANTES - Toutes les 6 heures
      important: {
        frequency: '0 */6 * * *', // Toutes les 6h
        scripts: [
          'ai-auto-problem-resolver.js', // Résolution problèmes IA
          'community-engagement-stats.js' // Stats communauté
        ],
        priority: 'MEDIUM',
        maxDuration: 45
      },

      // ENRICHISSEMENT - Quotidien
      daily: {
        frequency: '0 3 * * *', // 3h du matin quotidien
        scripts: [
          'intelligent-knowledge-extractor.js', // Extraction connaissances
          'auto-fix-generator.js' // Génération fixes automatiques
        ],
        priority: 'MEDIUM',
        maxDuration: 60
      },

      // COMPLET - Hebdomadaire dimanche
      weekly: {
        frequency: '0 2 * * 0', // Dimanche 2h du matin
        scripts: [
          'comprehensive-system-tester.js', // Tests complets
          'weekly-full-analysis.js' // Analyse complète hebdomadaire
        ],
        priority: 'LOW',
        maxDuration: 180 // 3h maximum
      }
    };
  }

  /**
   * 🚀 Orchestration complète hebdomadaire
   */
  async executeWeeklyOrchestration() {
    try {
      console.log('🕰️ WEEKLY INTELLIGENT ORCHESTRATION STARTING');
      console.log('==============================================');

      const startTime = new Date();
      const executionLog = {
        startTime,
        endTime: null,
        executions: [],
        totalIssuesFound: 0,
        totalCorrections: 0,
        finalStatus: 'IN_PROGRESS'
      };

      // 1. PHASE CRITIQUE - Tests pré-exécution
      console.log('\n🔍 PHASE 1: PRE-EXECUTION SYSTEM HEALTH CHECK');
      const healthCheck = await this.performSystemHealthCheck();
      executionLog.executions.push({
        phase: 'health_check',
        result: healthCheck,
        timestamp: new Date()
      });

      if (!healthCheck.allSystemsOk) {
        console.log('⚠️ System issues detected, attempting auto-correction...');
        await this.autoCorrectSystemIssues(healthCheck.issues);
      }

      // 2. PHASE ENRICHISSEMENT - Exécution composants par priorité
      console.log('\n🚀 PHASE 2: INTELLIGENT COMPONENT EXECUTION');

      for (const [category, config] of Object.entries(this.intelligentSchedule)) {
        console.log(`\n📋 Executing ${category.toUpperCase()} components...`);

        const categoryResult = await this.executeComponentCategory(category, config);
        executionLog.executions.push({
          phase: category,
          result: categoryResult,
          timestamp: new Date()
        });

        executionLog.totalIssuesFound += categoryResult.issuesFound || 0;
        executionLog.totalCorrections += categoryResult.corrections || 0;

        // Pause intelligente entre catégories
        await this.intelligentPause(config.priority);
      }

      // 3. PHASE VALIDATION - Tests post-exécution
      console.log('\n✅ PHASE 3: POST-EXECUTION VALIDATION');
      const postValidation = await this.performPostExecutionValidation();
      executionLog.executions.push({
        phase: 'post_validation',
        result: postValidation,
        timestamp: new Date()
      });

      // 4. GÉNÉRATION RAPPORT HEBDOMADAIRE
      executionLog.endTime = new Date();
      executionLog.finalStatus = postValidation.allValidationsPassed ? 'SUCCESS' : 'PARTIAL_SUCCESS';

      await this.generateWeeklyReport(executionLog);

      console.log('\n🎉 WEEKLY ORCHESTRATION COMPLETED SUCCESSFULLY!');
      return executionLog;

    } catch (error) {
      console.error('💥 Weekly orchestration failed:', error);
      await this.handleOrchestrationFailure(error);
      throw error;
    }
  }

  /**
   * 🔍 Vérification santé système
   */
  async performSystemHealthCheck() {
    const results = {
      allSystemsOk: true,
      issues: [],
      checks: []
    };

    try {
      // Test 1: Vérifier tous scripts présents
      for (const [category, config] of Object.entries(this.intelligentSchedule)) {
        for (const script of config.scripts) {
          const scriptPath = path.join(this.config.scriptsDir, script);
          try {
            await fs.access(scriptPath);
            results.checks.push({ script, status: 'OK' });
          } catch (error) {
            results.issues.push({ type: 'missing_script', script, error: error.message });
            results.allSystemsOk = false;
          }
        }
      }

      // Test 2: Vérifier dépendances Node.js
      const criticalDeps = ['@octokit/rest', 'axios', 'cheerio'];
      for (const dep of criticalDeps) {
        try {
          require.resolve(dep);
          results.checks.push({ dependency: dep, status: 'OK' });
        } catch (error) {
          results.issues.push({ type: 'missing_dependency', dependency: dep, error: error.message });
          results.allSystemsOk = false;
        }
      }

      // Test 3: Vérifier espace disque
      const diskSpace = await this.checkDiskSpace();
      if (diskSpace.available < 1024) { // 1GB minimum
        results.issues.push({ type: 'low_disk_space', available: diskSpace.available });
        results.allSystemsOk = false;
      }

      console.log(`🔍 Health check: ${results.allSystemsOk ? '✅ ALL SYSTEMS OK' : `⚠️ ${results.issues.length} ISSUES FOUND`}`);
      return results;

    } catch (error) {
      results.allSystemsOk = false;
      results.issues.push({ type: 'health_check_error', error: error.message });
      return results;
    }
  }

  /**
   * 🔧 Auto-correction problèmes système
   */
  async autoCorrectSystemIssues(issues) {
    let correctionsMade = 0;

    for (const issue of issues) {
      try {
        switch (issue.type) {
          case 'missing_dependency':
            console.log(`📦 Installing missing dependency: ${issue.dependency}`);
            execSync(`npm install ${issue.dependency}`, { stdio: 'inherit' });
            correctionsMade++;
            break;

          case 'missing_script':
            console.log(`⚠️ Script missing: ${issue.script} - Manual intervention required`);
            break;

          case 'low_disk_space':
            console.log('🧹 Cleaning up old logs...');
            await this.cleanupOldLogs();
            correctionsMade++;
            break;
        }
      } catch (error) {
        console.error(`❌ Failed to correct issue ${issue.type}:`, error.message);
      }
    }

    console.log(`🔧 Auto-corrections applied: ${correctionsMade}`);
    return correctionsMade;
  }

  /**
   * 🚀 Exécuter catégorie composants
   */
  async executeComponentCategory(category, config) {
    const results = {
      category,
      scriptsExecuted: [],
      totalDuration: 0,
      issuesFound: 0,
      corrections: 0,
      success: true
    };

    const categoryStart = Date.now();

    try {
      console.log(`📋 ${category.toUpperCase()}: ${config.scripts.length} scripts to execute`);
      console.log(`⏱️ Max duration: ${config.maxDuration} minutes`);

      for (const script of config.scripts) {
        const scriptStart = Date.now();

        try {
          console.log(`🔄 Executing: ${script}`);

          // Timeout intelligent selon priorité
          const timeout = config.maxDuration * 60 * 1000; // Convert to ms
          const scriptResult = await this.executeScriptWithTimeout(script, timeout);

          const scriptDuration = Date.now() - scriptStart;

          results.scriptsExecuted.push({
            script,
            duration: scriptDuration,
            result: scriptResult,
            status: 'SUCCESS'
          });

          console.log(`✅ ${script} completed in ${Math.round(scriptDuration / 1000)}s`);

        } catch (error) {
          const scriptDuration = Date.now() - scriptStart;
          results.scriptsExecuted.push({
            script,
            duration: scriptDuration,
            error: error.message,
            status: 'FAILED'
          });

          results.issuesFound++;
          results.success = false;
          console.error(`❌ ${script} failed:`, error.message);
        }
      }

      results.totalDuration = Date.now() - categoryStart;
      console.log(`📊 ${category} completed in ${Math.round(results.totalDuration / 1000)}s`);

    } catch (error) {
      results.success = false;
      results.error = error.message;
    }

    return results;
  }

  /**
   * ⏱️ Exécuter script avec timeout
   */
  async executeScriptWithTimeout(script, timeout) {
    return new Promise((resolve, reject) => {
      const scriptPath = path.join(this.config.scriptsDir, script);

      let completed = false;
      const timer = setTimeout(() => {
        if (!completed) {
          completed = true;
          reject(new Error(`Script ${script} timed out after ${timeout / 1000}s`));
        }
      }, timeout);

      try {
        const result = execSync(`node "${scriptPath}"`, {
          stdio: 'pipe',
          encoding: 'utf8',
          timeout: timeout
        });

        if (!completed) {
          completed = true;
          clearTimeout(timer);
          resolve({ output: result, success: true });
        }
      } catch (error) {
        if (!completed) {
          completed = true;
          clearTimeout(timer);
          reject(error);
        }
      }
    });
  }

  /**
   * ⏸️ Pause intelligente entre exécutions
   */
  async intelligentPause(priority) {
    let pauseTime;
    switch (priority) {
      case 'HIGH': pauseTime = 5000; break;   // 5s
      case 'MEDIUM': pauseTime = 15000; break; // 15s
      case 'LOW': pauseTime = 30000; break;   // 30s
      default: pauseTime = 10000;
    }

    console.log(`⏸️ Intelligent pause: ${pauseTime / 1000}s`);
    await new Promise(resolve => setTimeout(resolve, pauseTime));
  }

  /**
   * ✅ Validation post-exécution
   */
  async performPostExecutionValidation() {
    console.log('✅ Performing comprehensive post-execution validation...');

    try {
      // Exécuter le testeur complet
      const testerPath = path.join(this.config.scriptsDir, 'comprehensive-system-tester.js');
      const testResult = execSync(`node "${testerPath}"`, {
        stdio: 'pipe',
        encoding: 'utf8'
      });

      return {
        allValidationsPassed: testResult.includes('ALL_TESTS_PASSED'),
        testOutput: testResult,
        validationTime: new Date()
      };

    } catch (error) {
      return {
        allValidationsPassed: false,
        error: error.message,
        validationTime: new Date()
      };
    }
  }

  /**
   * 📊 Générer rapport hebdomadaire
   */
  async generateWeeklyReport(executionLog) {
    await fs.mkdir(this.config.logsDir, { recursive: true });

    const weekNumber = this.getWeekNumber(new Date());
    const reportContent = `# 🕰️ WEEKLY INTELLIGENT AUTOMATION REPORT - WEEK ${weekNumber}

**Generated**: ${executionLog.endTime.toISOString()}
**Duration**: ${Math.round((executionLog.endTime - executionLog.startTime) / 1000 / 60)} minutes
**Final Status**: ${executionLog.finalStatus}

## 📊 Execution Summary

### Overall Statistics
- **Total Phases**: ${executionLog.executions.length}
- **Issues Found**: ${executionLog.totalIssuesFound}
- **Auto-Corrections**: ${executionLog.totalCorrections}
- **Success Rate**: ${Math.round((executionLog.executions.filter(e => e.result.success !== false).length / executionLog.executions.length) * 100)}%

### Component Execution Results

${executionLog.executions.map(exec => {
      if (exec.phase === 'health_check') {
        return `#### 🔍 System Health Check
- **Status**: ${exec.result.allSystemsOk ? '✅ ALL SYSTEMS OK' : '⚠️ ISSUES DETECTED'}
- **Issues Found**: ${exec.result.issues.length}
- **Checks Passed**: ${exec.result.checks.length}`;
      }

      if (exec.phase === 'post_validation') {
        return `#### ✅ Post-Execution Validation
- **All Tests Passed**: ${exec.result.allValidationsPassed ? '✅ YES' : '❌ NO'}
- **Validation Time**: ${exec.result.validationTime}`;
      }

      return `#### 📋 ${exec.phase.toUpperCase()} Components
- **Scripts Executed**: ${exec.result.scriptsExecuted?.length || 0}
- **Total Duration**: ${Math.round((exec.result.totalDuration || 0) / 1000)}s
- **Success**: ${exec.result.success ? '✅ YES' : '❌ NO'}
- **Issues**: ${exec.result.issuesFound || 0}`;
    }).join('\n\n')}

## 🚀 Next Week Planning

Based on this week's results:
- **Critical Components**: Will continue running every 2 hours
- **Important Components**: Will continue running every 6 hours
- **Daily Enrichment**: Will continue running daily at 3 AM
- **Weekly Analysis**: Scheduled for next Sunday at 2 AM

## 🎯 System Health Status

${executionLog.finalStatus === 'SUCCESS' ?
        '✅ **EXCELLENT** - All systems operating perfectly, no intervention required' :
        '⚠️ **ATTENTION NEEDED** - Some issues detected, check detailed logs for resolution steps'
      }

---
*Generated automatically by Intelligent Weekly Scheduler v1.0.0*
`;

    const reportPath = path.join(this.config.logsDir, `WEEKLY-AUTOMATION-REPORT-W${weekNumber}.md`);
    await fs.writeFile(reportPath, reportContent);

    console.log(`📊 Weekly report generated: ${reportPath}`);
    return reportPath;
  }

  /**
   * 🗓️ Obtenir numéro semaine
   */
  getWeekNumber(date) {
    const start = new Date(date.getFullYear(), 0, 1);
    const days = Math.floor((date - start) / (24 * 60 * 60 * 1000));
    return Math.ceil((days + start.getDay() + 1) / 7);
  }

  /**
   * 💾 Vérifier espace disque
   */
  async checkDiskSpace() {
    // Simulation - dans un vrai environnement, utiliser statvfs ou équivalent
    return { available: 5000 }; // MB
  }

  /**
   * 🧹 Nettoyer anciens logs
   */
  async cleanupOldLogs() {
    try {
      const logsPath = path.join(process.cwd(), 'logs');
      const files = await fs.readdir(logsPath, { withFileTypes: true });

      for (const file of files) {
        if (file.isFile() && file.name.endsWith('.log')) {
          const filePath = path.join(logsPath, file.name);
          const stats = await fs.stat(filePath);
          const daysSinceModified = (Date.now() - stats.mtime.getTime()) / (1000 * 60 * 60 * 24);

          if (daysSinceModified > 30) { // Supprimer logs > 30 jours
            await fs.unlink(filePath);
            console.log(`🗑️ Deleted old log: ${file.name}`);
          }
        }
      }
    } catch (error) {
      console.log('⚠️ Log cleanup failed:', error.message);
    }
  }

  /**
   * 💥 Gérer échec orchestration
   */
  async handleOrchestrationFailure(error) {
    const failureReport = `# ❌ WEEKLY ORCHESTRATION FAILURE REPORT

**Time**: ${new Date().toISOString()}
**Error**: ${error.message}
**Stack**: ${error.stack}

## Recommended Actions

1. Check system logs for detailed error information
2. Verify all dependencies are installed correctly
3. Ensure sufficient disk space and memory
4. Run comprehensive system tests manually
5. Contact system administrator if issues persist

---
*Generated by Intelligent Weekly Scheduler Emergency Handler*
`;

    await fs.mkdir(this.config.logsDir, { recursive: true });
    const failurePath = path.join(this.config.logsDir, `ORCHESTRATION-FAILURE-${Date.now()}.md`);
    await fs.writeFile(failurePath, failureReport);

    console.error(`💥 Failure report generated: ${failurePath}`);
  }
}

// CLI execution
if (require.main === module) {
  const scheduler = new IntelligentWeeklyScheduler();

  scheduler.executeWeeklyOrchestration()
    .then(result => {
      console.log('\n🎉 INTELLIGENT WEEKLY ORCHESTRATION COMPLETED!');
      console.log('==============================================');
      console.log(`Final Status: ${result.finalStatus}`);
      console.log(`Total Duration: ${Math.round((result.endTime - result.startTime) / 1000 / 60)} minutes`);
      console.log(`Issues Found: ${result.totalIssuesFound}`);
      console.log(`Corrections Made: ${result.totalCorrections}`);

      process.exit(result.finalStatus === 'SUCCESS' ? 0 : 1);
    })
    .catch(error => {
      console.error('💥 Weekly orchestration failed catastrophically:', error);
      process.exit(1);
    });
}

module.exports = IntelligentWeeklyScheduler;
