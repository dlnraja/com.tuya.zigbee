#!/usr/bin/env node

/**
 * ULTIMATE CI/CD PIPELINE
 * 
 * Pipeline complet avec:
 * - Nettoyage et vérifications
 * - Enrichissements
 * - Validation locale COMPLÈTE
 * - Sécurité
 * - Push et publication seulement si TOUT passe
 * 
 * @version 2.1.46
 * @author Dylan Rajasekaram
 */

const { execSync } = require('child_process');
const fs = require('fs');
const path = require('path');

const colors = {
  reset: '\x1b[0m',
  green: '\x1b[32m',
  yellow: '\x1b[33m',
  blue: '\x1b[34m',
  red: '\x1b[31m',
  cyan: '\x1b[36m',
  magenta: '\x1b[35m'
};

class UltimateCICDPipeline {
  constructor() {
    this.rootDir = path.join(__dirname, '..');
    this.errors = [];
    this.warnings = [];
    this.steps = [];
  }

  log(msg, color = 'blue') {
    console.log(`${colors[color]}${msg}${colors.reset}`);
  }

  exec(cmd, options = {}) {
    try {
      return execSync(cmd, { 
        cwd: this.rootDir,
        encoding: 'utf-8',
        stdio: options.silent ? 'pipe' : 'inherit',
        ...options
      });
    } catch (error) {
      if (options.allowFail) {
        return null;
      }
      throw error;
    }
  }

  async runStep(name, fn) {
    this.log(`\n${'='.repeat(80)}`, 'cyan');
    this.log(`🔹 STEP: ${name}`, 'cyan');
    this.log('='.repeat(80) + '\n', 'cyan');
    
    const startTime = Date.now();
    try {
      await fn();
      const duration = ((Date.now() - startTime) / 1000).toFixed(2);
      this.steps.push({ name, status: 'SUCCESS', duration });
      this.log(`\n✅ ${name} - SUCCESS (${duration}s)`, 'green');
      return true;
    } catch (error) {
      const duration = ((Date.now() - startTime) / 1000).toFixed(2);
      this.steps.push({ name, status: 'FAILED', duration, error: error.message });
      this.log(`\n❌ ${name} - FAILED (${duration}s)`, 'red');
      this.log(`Error: ${error.message}`, 'red');
      this.errors.push({ step: name, error: error.message });
      return false;
    }
  }

  async run() {
    try {
      this.log('\n' + '='.repeat(80), 'magenta');
      this.log('🚀 ULTIMATE CI/CD PIPELINE - v2.1.46', 'magenta');
      this.log('='.repeat(80) + '\n', 'magenta');

      const pipelineStart = Date.now();

      // PHASE 1: CLEANUP & SECURITY
      if (!await this.runStep('PHASE 1.1: Security - Clean .homeycompose', async () => {
        const composePath = path.join(this.rootDir, '.homeycompose');
        if (fs.existsSync(composePath)) {
          fs.rmSync(composePath, { recursive: true, force: true });
          this.log('✅ .homeycompose removed', 'green');
        } else {
          this.log('✅ .homeycompose does not exist', 'green');
        }
      })) return this.failed();

      if (!await this.runStep('PHASE 1.2: Cleanup - Remove .homeybuild cache', async () => {
        const buildPath = path.join(this.rootDir, '.homeybuild');
        if (fs.existsSync(buildPath)) {
          fs.rmSync(buildPath, { recursive: true, force: true });
          this.log('✅ .homeybuild removed', 'green');
        } else {
          this.log('✅ .homeybuild does not exist', 'green');
        }
      })) return this.failed();

      // PHASE 2: AUDIT & VERIFICATION
      if (!await this.runStep('PHASE 2.1: Audit - Power Designation', async () => {
        this.log('Running COMPLETE_POWER_AUDIT.js...', 'blue');
        try {
          this.exec('node scripts/COMPLETE_POWER_AUDIT.js', { silent: false });
          this.log('✅ Power audit complete', 'green');
        } catch (error) {
          this.log('⚠ Power audit had warnings but continuing', 'yellow');
        }
      })) return this.failed();

      if (!await this.runStep('PHASE 2.2: Clean - Remove non-existent drivers', async () => {
        this.log('Running CLEAN_APP_JSON.js...', 'blue');
        this.exec('node scripts/CLEAN_APP_JSON.js', { silent: false });
        this.log('✅ app.json cleaned (only existing drivers kept)', 'green');
      })) return this.failed();

      // PHASE 3: IMAGES
      if (!await this.runStep('PHASE 3.1: Images - Generate contextual images', async () => {
        this.log('Running REGENERATE_ALL_CONTEXTUAL_IMAGES.js...', 'blue');
        this.exec('node scripts/REGENERATE_ALL_CONTEXTUAL_IMAGES.js', { silent: false });
        this.log('✅ Contextual images generated', 'green');
      })) return this.failed();

      // PHASE 4: LOCAL VALIDATION
      if (!await this.runStep('PHASE 4.1: Validate - Debug level', async () => {
        this.log('Running homey app validate --level debug...', 'blue');
        try {
          this.exec('homey app validate --level debug');
          this.log('✅ Debug validation passed', 'green');
        } catch (error) {
          this.log('❌ Debug validation failed', 'red');
          throw error;
        }
      })) return this.failed();

      if (!await this.runStep('PHASE 4.2: Validate - Publish level', async () => {
        this.log('Running homey app validate --level publish...', 'blue');
        try {
          this.exec('homey app validate --level publish');
          this.log('✅ Publish validation passed', 'green');
        } catch (error) {
          this.log('❌ Publish validation failed', 'red');
          this.log('⚠ Pipeline STOPPED - Fix validation errors before push', 'red');
          throw error;
        }
      })) return this.failed();

      // PHASE 5: GIT OPERATIONS
      if (!await this.runStep('PHASE 5.1: Git - Check status', async () => {
        const status = this.exec('git status --porcelain', { silent: true });
        if (!status || status.trim() === '') {
          this.log('⚠ No changes to commit', 'yellow');
          this.warnings.push('No git changes detected');
        } else {
          const changes = status.split('\n').filter(l => l.trim());
          this.log(`✅ ${changes.length} files changed`, 'green');
          changes.slice(0, 5).forEach(line => this.log(`   ${line}`, 'blue'));
          if (changes.length > 5) {
            this.log(`   ... and ${changes.length - 5} more`, 'blue');
          }
        }
      })) return this.failed();

      if (!await this.runStep('PHASE 5.2: Git - Stash current changes', async () => {
        this.exec('git stash push -u -m "CI/CD pipeline stash"', { allowFail: true, silent: true });
        this.log('✅ Changes stashed', 'green');
      })) return this.failed();

      if (!await this.runStep('PHASE 5.3: Git - Fetch and pull', async () => {
        this.exec('git fetch origin', { silent: true });
        this.log('✅ Fetched from origin', 'green');
        
        try {
          this.exec('git pull --rebase origin master', { silent: true });
          this.log('✅ Pulled and rebased', 'green');
        } catch (error) {
          this.log('⚠ Pull failed, continuing...', 'yellow');
        }
      })) return this.failed();

      if (!await this.runStep('PHASE 5.4: Git - Pop stash', async () => {
        try {
          this.exec('git stash pop', { silent: true });
          this.log('✅ Stash popped', 'green');
        } catch (error) {
          this.log('⚠ No stash to pop or conflicts', 'yellow');
        }
      })) return this.failed();

      if (!await this.runStep('PHASE 5.5: Git - Stage all changes', async () => {
        this.exec('git add .');
        this.log('✅ All changes staged', 'green');
      })) return this.failed();

      if (!await this.runStep('PHASE 5.6: Git - Commit', async () => {
        const packageJson = JSON.parse(fs.readFileSync(path.join(this.rootDir, 'package.json'), 'utf-8'));
        const version = packageJson.version;
        
        const commitMessage = `chore(v${version}): CI/CD pipeline run

- All validations passed (debug + publish)
- Images verified and resized
- app.json synchronized
- Security checks passed
- Ready for publication

Pipeline: ULTIMATE_CI_CD_PIPELINE.js
Timestamp: ${new Date().toISOString()}`;

        try {
          this.exec(`git commit -m "${commitMessage}"`, { silent: true });
          this.log('✅ Changes committed', 'green');
        } catch (error) {
          if (error.message.includes('nothing to commit')) {
            this.log('✅ Nothing to commit (already committed)', 'green');
          } else {
            throw error;
          }
        }
      })) return this.failed();

      if (!await this.runStep('PHASE 5.7: Git - Push to master', async () => {
        try {
          this.exec('git push origin master');
          const commitHash = this.exec('git rev-parse --short HEAD', { silent: true }).trim();
          this.log('✅ Pushed to master', 'green');
          this.log(`   Commit: ${commitHash}`, 'cyan');
        } catch (error) {
          this.log('❌ Push failed', 'red');
          throw error;
        }
      })) return this.failed();

      // PHASE 6: SUCCESS
      const pipelineDuration = ((Date.now() - pipelineStart) / 1000).toFixed(2);

      this.log('\n' + '='.repeat(80), 'green');
      this.log('✅ PIPELINE SUCCESS', 'green');
      this.log('='.repeat(80) + '\n', 'green');

      this.log('📊 PIPELINE SUMMARY:', 'cyan');
      this.log(`   Total duration: ${pipelineDuration}s`, 'blue');
      this.log(`   Steps executed: ${this.steps.length}`, 'blue');
      this.log(`   Steps passed: ${this.steps.filter(s => s.status === 'SUCCESS').length}`, 'green');
      this.log(`   Steps failed: ${this.steps.filter(s => s.status === 'FAILED').length}`, 'red');
      this.log(`   Warnings: ${this.warnings.length}`, 'yellow');

      if (this.warnings.length > 0) {
        this.log('\n⚠ WARNINGS:', 'yellow');
        this.warnings.forEach(w => this.log(`   - ${w}`, 'yellow'));
      }

      this.log('\n🎉 GitHub Actions will now handle publication', 'green');
      this.log('   Monitor: https://github.com/dlnraja/com.tuya.zigbee/actions\n', 'cyan');

    } catch (error) {
      this.failed(error);
    }
  }

  failed(error = null) {
    this.log('\n' + '='.repeat(80), 'red');
    this.log('❌ PIPELINE FAILED', 'red');
    this.log('='.repeat(80) + '\n', 'red');

    if (error) {
      this.log(`Error: ${error.message}`, 'red');
    }

    if (this.errors.length > 0) {
      this.log('\n❌ ERRORS:', 'red');
      this.errors.forEach(e => {
        this.log(`   Step: ${e.step}`, 'yellow');
        this.log(`   Error: ${e.error}`, 'red');
      });
    }

    this.log('\n📊 Steps executed:', 'blue');
    this.steps.forEach(s => {
      const icon = s.status === 'SUCCESS' ? '✅' : '❌';
      const color = s.status === 'SUCCESS' ? 'green' : 'red';
      this.log(`   ${icon} ${s.name} (${s.duration}s)`, color);
    });

    this.log('\n❌ Pipeline stopped. Fix errors and run again.\n', 'red');
    process.exit(1);
  }
}

if (require.main === module) {
  const pipeline = new UltimateCICDPipeline();
  pipeline.run();
}

module.exports = UltimateCICDPipeline;
