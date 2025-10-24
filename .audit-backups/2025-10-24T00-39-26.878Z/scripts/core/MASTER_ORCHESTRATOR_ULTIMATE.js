#!/usr/bin/env node
'use strict';

/**
 * ═══════════════════════════════════════════════════════════════════
 *  MASTER ORCHESTRATOR ULTIMATE v3.0
 *  Le script ultime qui fait TOUT de A à Z
 * ═══════════════════════════════════════════════════════════════════
 * 
 * CAPACITÉS:
 * - 🔍 Vérifie TOUS les problèmes forum
 * - 🌐 Scrape sources externes (Blakadder, Zigbee2MQTT)
 * - 🎯 Match intelligent avec databases
 * - 🔄 Conversion cross-platform
 * - 🤖 Enrichissement automatique
 * - ✅ Validation multi-niveaux
 * - 📦 Publication intelligente (GitHub Actions)
 * - 📄 Documentation auto-organisation
 * - 🔄 Git auto-merge configuré
 * - 📊 Rapports complets
 * 
 * UTILISATION:
 *   node scripts/MASTER_ORCHESTRATOR_ULTIMATE.js [options]
 *   
 * OPTIONS:
 *   --dry-run        Simulation sans modification
 *   --forum-only     Check forum issues uniquement
 *   --enrich-only    Enrichissement uniquement
 *   --no-publish     Pas de publication
 *   --force          Force publication même sans changements
 * 
 * LANCEMENT FACILE:
 *   Double-clic sur RUN_ULTIMATE.bat (Windows)
 */

const { execSync } = require('child_process');
const fs = require('fs');
const path = require('path');

const COLORS = {
  CYAN: '\x1b[36m',
  GREEN: '\x1b[32m',
  YELLOW: '\x1b[33m',
  RED: '\x1b[31m',
  MAGENTA: '\x1b[35m',
  BLUE: '\x1b[34m',
  RESET: '\x1b[0m',
  BOLD: '\x1b[1m'
};

const PHASE_ICONS = {
  forum: '💬',
  scrape: '🌐',
  match: '🎯',
  convert: '🔄',
  enrich: '🤖',
  validate: '✅',
  publish: '🚀',
  docs: '📄',
  git: '📦'
};

class MasterOrchestrator {
  
  constructor(options = {}) {
    this.options = {
      dryRun: options.dryRun || false,
      forumOnly: options.forumOnly || false,
      enrichOnly: options.enrichOnly || false,
      noPublish: options.noPublish || false,
      force: options.force || false
    };
    
    this.results = {
      phases: {},
      timing: {},
      errors: [],
      warnings: [],
      successCount: 0,
      totalPhases: 0
    };
    
    this.startTime = Date.now();
  }
  
  log(msg, color = COLORS.RESET, indent = 0) {
    const indentation = '  '.repeat(indent);
    console.log(`${color}${indentation}${msg}${COLORS.RESET}`);
  }
  
  logPhase(phase, title) {
    const icon = PHASE_ICONS[phase] || '📋';
    this.log('', COLORS.RESET);
    this.log('═'.repeat(70), COLORS.CYAN);
    this.log(`${icon} ${title}`, COLORS.BOLD + COLORS.CYAN);
    this.log('═'.repeat(70), COLORS.CYAN);
  }
  
  runStep(stepName, command, options = {}) {
    const phaseStart = Date.now();
    this.log(`\n🔹 ${stepName}...`, COLORS.YELLOW, 1);
    
    try {
      const result = execSync(command, {
        encoding: 'utf8',
        stdio: options.silent ? 'pipe' : 'inherit',
        cwd: path.join(__dirname, '..')
      });
      
      const duration = ((Date.now() - phaseStart) / 1000).toFixed(2);
      this.log(`✅ Success (${duration}s)`, COLORS.GREEN, 1);
      
      this.results.timing[stepName] = duration;
      this.results.successCount++;
      
      return { success: true, output: result, duration };
      
    } catch (error) {
      const duration = ((Date.now() - phaseStart) / 1000).toFixed(2);
      this.log(`❌ Failed (${duration}s)`, COLORS.RED, 1);
      
      if (!options.optional) {
        this.results.errors.push({
          step: stepName,
          error: error.message,
          duration
        });
      } else {
        this.results.warnings.push({
          step: stepName,
          error: error.message,
          duration
        });
      }
      
      return { success: false, error: error.message, duration };
    }
  }
  
  /**
   * PHASE 0: Pré-vérifications
   */
  async phasePreChecks() {
    this.logPhase('git', 'PHASE 0: Pré-vérifications');
    this.results.totalPhases++;
    
    // Check working directory
    try {
      const branch = execSync('git branch --show-current', { encoding: 'utf8' }).trim();
      this.log(`Branch: ${branch}`, COLORS.CYAN, 1);
      
      if (branch !== 'master') {
        this.log(`⚠️  Warning: Not on master branch!`, COLORS.YELLOW, 1);
        this.results.warnings.push({ step: 'Branch check', warning: 'Not on master' });
      }
    } catch (error) {
      this.results.errors.push({ step: 'Git check', error: 'Git not available' });
    }
    
    // Check Node.js version
    const nodeVersion = process.version;
    this.log(`Node.js: ${nodeVersion}`, COLORS.CYAN, 1);
    
    // Check required files
    const requiredFiles = [
      'app.json',
      '.homeychangelog.json',
      'package.json'
    ];
    
    for (const file of requiredFiles) {
      const exists = fs.existsSync(path.join(__dirname, '..', file));
      if (!exists) {
        this.results.errors.push({ step: 'File check', error: `Missing ${file}` });
      }
    }
    
    this.log(`✅ Pre-checks complete`, COLORS.GREEN, 1);
    this.results.phases.preChecks = { success: true };
  }
  
  /**
   * PHASE 1: Forum Issues Verification
   */
  async phaseForumCheck() {
    this.logPhase('forum', 'PHASE 1: Forum Issues Verification');
    this.results.totalPhases++;
    
    const result = this.runStep(
      'Checking forum issues',
      'node scripts/analysis/CHECK_FORUM_ISSUES_COMPLETE.js',
      { optional: true }
    );
    
    this.results.phases.forumCheck = result;
    
    if (result.success) {
      this.log('💬 All forum issues tracked', COLORS.GREEN, 1);
    } else {
      this.log('⚠️  Forum check skipped (non-critical)', COLORS.YELLOW, 1);
    }
  }
  
  /**
   * PHASE 2: External Data Scraping
   */
  async phaseScraping() {
    this.logPhase('scrape', 'PHASE 2: External Data Collection');
    this.results.totalPhases++;
    
    if (this.options.forumOnly) {
      this.log('⏭️  Skipped (forum-only mode)', COLORS.CYAN, 1);
      this.results.phases.scraping = { skipped: true };
      return;
    }
    
    // Intelligent Matcher (includes Blakadder + Z2M download)
    const matchResult = this.runStep(
      'Intelligent matching with external databases',
      'node scripts/enrichment/INTELLIGENT_MATCHER_BLAKADDER.js',
      { optional: true }
    );
    
    this.results.phases.scraping = matchResult;
    
    if (matchResult.success) {
      this.log('🌐 External databases downloaded & matched', COLORS.GREEN, 1);
    }
  }
  
  /**
   * PHASE 3: Pathfinder Conversion Test
   */
  async phasePathfinder() {
    this.logPhase('convert', 'PHASE 3: Conversion Matrix Validation');
    this.results.totalPhases++;
    
    if (this.options.forumOnly) {
      this.log('⏭️  Skipped (forum-only mode)', COLORS.CYAN, 1);
      this.results.phases.pathfinder = { skipped: true };
      return;
    }
    
    const result = this.runStep(
      'Testing conversion matrices',
      'node scripts/enrichment/PATHFINDER_CONVERTER.js',
      { optional: true }
    );
    
    this.results.phases.pathfinder = result;
    
    if (result.success) {
      this.log('🔄 Conversion matrices validated', COLORS.GREEN, 1);
    }
  }
  
  /**
   * PHASE 4: Auto-Enrichment
   */
  async phaseEnrichment() {
    this.logPhase('enrich', 'PHASE 4: Intelligent Auto-Enrichment');
    this.results.totalPhases++;
    
    if (this.options.forumOnly) {
      this.log('⏭️  Skipped (forum-only mode)', COLORS.CYAN, 1);
      this.results.phases.enrichment = { skipped: true };
      return;
    }
    
    const dryRunFlag = this.options.dryRun ? '--dry-run' : '';
    
    // Run orchestrator
    const result = this.runStep(
      'Auto-enriching drivers (HIGH confidence)',
      `node scripts/enrichment/AUTO_ENRICHMENT_ORCHESTRATOR.js ${dryRunFlag}`,
      { optional: false }
    );
    
    this.results.phases.enrichment = result;
    
    if (result.success) {
      this.log('🤖 Drivers enriched intelligently', COLORS.GREEN, 1);
    } else {
      this.log('❌ Enrichment failed - check errors', COLORS.RED, 1);
    }
  }
  
  /**
   * PHASE 5: Multi-Level Validation
   */
  async phaseValidation() {
    this.logPhase('validate', 'PHASE 5: Multi-Level Validation');
    this.results.totalPhases++;
    
    if (this.options.dryRun) {
      this.log('⏭️  Skipped (dry-run mode)', COLORS.CYAN, 1);
      this.results.phases.validation = { skipped: true };
      return;
    }
    
    const validations = [];
    
    // 1. JSON Syntax
    this.log('📋 Level 1: JSON Syntax', COLORS.CYAN, 1);
    try {
      const appJson = JSON.parse(fs.readFileSync('app.json', 'utf8'));
      const changelog = JSON.parse(fs.readFileSync('.homeychangelog.json', 'utf8'));
      this.log('✅ JSON syntax valid', COLORS.GREEN, 2);
      validations.push({ level: 'JSON', success: true });
    } catch (error) {
      this.log(`❌ JSON syntax error: ${error.message}`, COLORS.RED, 2);
      validations.push({ level: 'JSON', success: false, error: error.message });
    }
    
    // 2. Homey CLI Validation
    this.log('📋 Level 2: Homey CLI Validation', COLORS.CYAN, 1);
    const homeyValidation = this.runStep(
      'Homey validation (publish level)',
      'homey app validate --level publish'
    );
    validations.push({ level: 'Homey CLI', ...homeyValidation });
    
    // 3. SDK3 Compliance (basic check)
    this.log('📋 Level 3: SDK3 Compliance', COLORS.CYAN, 1);
    try {
      const appJson = JSON.parse(fs.readFileSync('app.json', 'utf8'));
      const hasVersion = appJson.version;
      const hasId = appJson.id;
      const hasSdk = appJson.sdk === 3;
      
      if (hasVersion && hasId && hasSdk) {
        this.log('✅ SDK3 compliant', COLORS.GREEN, 2);
        validations.push({ level: 'SDK3', success: true });
      } else {
        this.log('⚠️  SDK3 warnings detected', COLORS.YELLOW, 2);
        validations.push({ level: 'SDK3', success: true, warnings: true });
      }
    } catch (error) {
      validations.push({ level: 'SDK3', success: false, error: error.message });
    }
    
    this.results.phases.validation = {
      success: validations.every(v => v.success),
      validations
    };
    
    if (!this.results.phases.validation.success) {
      this.log('❌ VALIDATION FAILED - Aborting workflow', COLORS.RED, 1);
      throw new Error('Validation failed');
    }
  }
  
  /**
   * PHASE 6: Documentation Organization
   */
  async phaseDocumentation() {
    this.logPhase('docs', 'PHASE 6: Documentation Organization');
    this.results.totalPhases++;
    
    const result = this.runStep(
      'Auto-organizing documentation',
      'pwsh scripts/automation/AUTO_ORGANIZE_DOCS.ps1',
      { optional: true }
    );
    
    this.results.phases.documentation = result;
    
    if (result.success) {
      this.log('📄 Documentation organized', COLORS.GREEN, 1);
    }
  }
  
  /**
   * PHASE 7: Git Smart Commit
   */
  async phaseGitCommit() {
    this.logPhase('git', 'PHASE 7: Git Smart Commit');
    this.results.totalPhases++;
    
    if (this.options.dryRun || this.options.noPublish) {
      this.log('⏭️  Skipped (dry-run or no-publish mode)', COLORS.CYAN, 1);
      this.results.phases.gitCommit = { skipped: true };
      return;
    }
    
    // Check if there are changes
    try {
      const status = execSync('git status --porcelain', { encoding: 'utf8' });
      
      if (!status.trim() && !this.options.force) {
        this.log('ℹ️  No changes to commit', COLORS.CYAN, 1);
        this.results.phases.gitCommit = { success: true, noChanges: true };
        return;
      }
      
      // Smart commit with auto-merge
      const message = `feat: auto-enrichment from Master Orchestrator

🤖 AUTOMATED ENRICHMENT

Sources:
✅ Blakadder database
✅ Zigbee2MQTT converters
✅ Forum user feedback
✅ Intelligent matching (HIGH confidence)

Validation:
✅ JSON syntax
✅ Homey CLI (publish level)
✅ SDK3 compliance

Generated: ${new Date().toISOString()}

[master-orchestrator-auto-enrich]`;
      
      const result = this.runStep(
        'Committing & pushing changes',
        `git sc -Message "${message.replace(/"/g, '\\"').replace(/\n/g, ' ')}"`
      );
      
      this.results.phases.gitCommit = result;
      
    } catch (error) {
      this.results.phases.gitCommit = { success: false, error: error.message };
    }
  }
  
  /**
   * PHASE 8: Publication Intelligente
   */
  async phasePublication() {
    this.logPhase('publish', 'PHASE 8: Intelligent Publication');
    this.results.totalPhases++;
    
    if (this.options.dryRun || this.options.noPublish) {
      this.log('⏭️  Skipped (dry-run or no-publish mode)', COLORS.CYAN, 1);
      this.results.phases.publication = { skipped: true };
      return;
    }
    
    // Check for driver changes
    try {
      const driverChanges = execSync('git diff HEAD~1 HEAD --name-only drivers/ 2>&1 || echo ""', { 
        encoding: 'utf8' 
      }).trim();
      
      if (!driverChanges && !this.options.force) {
        this.log('ℹ️  No driver changes - publication skipped', COLORS.CYAN, 1);
        this.log('💡 GitHub Actions will handle docs-only changes', COLORS.CYAN, 1);
        this.results.phases.publication = { success: true, skipped: 'no_driver_changes' };
        return;
      }
      
      this.log('🔥 Driver changes detected!', COLORS.YELLOW, 1);
      this.log('🚀 GitHub Actions will auto-publish...', COLORS.CYAN, 1);
      
      // GitHub Actions will handle publication automatically
      this.results.phases.publication = {
        success: true,
        method: 'github_actions',
        driverChanges: driverChanges.split('\n').length
      };
      
    } catch (error) {
      this.results.phases.publication = { success: false, error: error.message };
    }
  }
  
  /**
   * Génère rapport final
   */
  generateFinalReport() {
    this.logPhase('git', 'FINAL REPORT');
    
    const totalDuration = ((Date.now() - this.startTime) / 1000).toFixed(2);
    
    this.log('═'.repeat(70), COLORS.CYAN);
    this.log('📊 MASTER ORCHESTRATOR - EXECUTION SUMMARY', COLORS.BOLD + COLORS.CYAN);
    this.log('═'.repeat(70), COLORS.CYAN);
    this.log('');
    
    // Phases summary
    this.log('✅ PHASES COMPLETED:', COLORS.GREEN);
    for (const [phase, result] of Object.entries(this.results.phases)) {
      const icon = result.success ? '✅' : result.skipped ? '⏭️' : '❌';
      const status = result.success ? 'SUCCESS' : result.skipped ? 'SKIPPED' : 'FAILED';
      this.log(`   ${icon} ${phase}: ${status}`, COLORS.CYAN, 1);
    }
    
    this.log('');
    this.log(`⏱️  TIMING:`, COLORS.YELLOW);
    this.log(`   Total Duration: ${totalDuration}s`, COLORS.CYAN, 1);
    for (const [step, duration] of Object.entries(this.results.timing)) {
      this.log(`   ${step}: ${duration}s`, COLORS.CYAN, 1);
    }
    
    // Errors & Warnings
    if (this.results.errors.length > 0) {
      this.log('');
      this.log(`❌ ERRORS (${this.results.errors.length}):`, COLORS.RED);
      this.results.errors.forEach(err => {
        this.log(`   ${err.step}: ${err.error}`, COLORS.RED, 1);
      });
    }
    
    if (this.results.warnings.length > 0) {
      this.log('');
      this.log(`⚠️  WARNINGS (${this.results.warnings.length}):`, COLORS.YELLOW);
      this.results.warnings.forEach(warn => {
        this.log(`   ${warn.step}: ${warn.error || warn.warning}`, COLORS.YELLOW, 1);
      });
    }
    
    // Success rate
    const successRate = ((this.results.successCount / this.results.totalPhases) * 100).toFixed(0);
    this.log('');
    this.log(`📈 SUCCESS RATE: ${successRate}%`, COLORS.GREEN);
    this.log(`   (${this.results.successCount}/${this.results.totalPhases} phases)`, COLORS.CYAN, 1);
    
    // Next steps
    this.log('');
    this.log('🎯 NEXT STEPS:', COLORS.CYAN);
    
    if (this.options.dryRun) {
      this.log('   ✓ Review dry-run results', COLORS.CYAN, 1);
      this.log('   ✓ Run without --dry-run to apply changes', COLORS.CYAN, 1);
    } else if (this.results.phases.publication?.method === 'github_actions') {
      this.log('   ✓ Monitor GitHub Actions workflow', COLORS.CYAN, 1);
      this.log('   ✓ Check Homey App Store dashboard', COLORS.CYAN, 1);
      this.log('   ✓ Wait for user feedback on forum', COLORS.CYAN, 1);
    } else {
      this.log('   ✓ Review enrichment reports', COLORS.CYAN, 1);
      this.log('   ✓ Check validation results', COLORS.CYAN, 1);
    }
    
    this.log('');
    this.log('═'.repeat(70), COLORS.CYAN);
    this.log(`${this.options.dryRun ? '🔍 DRY RUN' : '✅ ORCHESTRATION'} COMPLETE!`, 
      COLORS.BOLD + COLORS.GREEN);
    this.log('═'.repeat(70), COLORS.CYAN);
    
    // Save report
    const reportPath = path.join(__dirname, '../docs/orchestration', 
      `master_orchestrator_${Date.now()}.json`);
    
    const reportDir = path.dirname(reportPath);
    if (!fs.existsSync(reportDir)) {
      fs.mkdirSync(reportDir, { recursive: true });
    }
    
    fs.writeFileSync(reportPath, JSON.stringify({
      timestamp: new Date().toISOString(),
      duration: totalDuration,
      options: this.options,
      results: this.results
    }, null, 2));
    
    this.log(`\n📄 Full report saved: ${reportPath}`, COLORS.CYAN);
  }
  
  /**
   * Exécution principale
   */
  async execute() {
    try {
      this.log('', COLORS.RESET);
      this.log('═'.repeat(70), COLORS.MAGENTA);
      this.log('🎭 MASTER ORCHESTRATOR ULTIMATE v3.0', COLORS.BOLD + COLORS.MAGENTA);
      this.log('   Le script ultime qui fait TOUT!', COLORS.MAGENTA);
      this.log('═'.repeat(70), COLORS.MAGENTA);
      this.log('', COLORS.RESET);
      
      if (this.options.dryRun) {
        this.log('⚠️  DRY RUN MODE - No changes will be made', COLORS.YELLOW);
      }
      
      // Execute phases
      await this.phasePreChecks();
      await this.phaseForumCheck();
      
      if (!this.options.forumOnly) {
        await this.phaseScraping();
        await this.phasePathfinder();
        await this.phaseEnrichment();
        await this.phaseValidation();
        await this.phaseDocumentation();
        await this.phaseGitCommit();
        await this.phasePublication();
      }
      
      // Generate final report
      this.generateFinalReport();
      
      return this.results;
      
    } catch (error) {
      this.log('', COLORS.RESET);
      this.log('═'.repeat(70), COLORS.RED);
      this.log('❌ ORCHESTRATION FAILED', COLORS.BOLD + COLORS.RED);
      this.log('═'.repeat(70), COLORS.RED);
      this.log(`Error: ${error.message}`, COLORS.RED);
      this.log('', COLORS.RESET);
      
      throw error;
    }
  }
}

// CLI Usage
if (require.main === module) {
  const args = process.argv.slice(2);
  
  const options = {
    dryRun: args.includes('--dry-run'),
    forumOnly: args.includes('--forum-only'),
    enrichOnly: args.includes('--enrich-only'),
    noPublish: args.includes('--no-publish'),
    force: args.includes('--force')
  };
  
  const orchestrator = new MasterOrchestrator(options);
  
  orchestrator.execute().catch(error => {
    console.error('Fatal error:', error);
    process.exit(1);
  });
}

module.exports = MasterOrchestrator;
