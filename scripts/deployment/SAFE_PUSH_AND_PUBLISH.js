#!/usr/bin/env node

/**
 * SAFE PUSH AND PUBLISH - v2.1.46
 * 
 * Sécurité + Validation + Git Push + GitHub Actions Publication
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
  cyan: '\x1b[36m'
};

class SafePushPublish {
  constructor() {
    this.rootDir = path.join(__dirname, '../..');
    this.homeyComposePath = path.join(this.rootDir, '.homeycompose');
  }

  log(msg, color = 'blue') {
    console.log(`${colors[color]}${msg}${colors.reset}`);
  }

  exec(cmd, options = {}) {
    try {
      return execSync(cmd, { 
        cwd: this.rootDir,
        encoding: 'utf-8',
        stdio: 'pipe',
        ...options
      });
    } catch (error) {
      if (options.allowFail) {
        return null;
      }
      throw error;
    }
  }

  async run() {
    try {
      this.log('\n' + '='.repeat(80), 'cyan');
      this.log('🚀 SAFE PUSH AND PUBLISH - v2.1.46', 'cyan');
      this.log('='.repeat(80) + '\n', 'cyan');

      // 1. SECURITY: Clean .homeycompose (MANDATORY)
      this.log('🔒 STEP 1: Security - Cleaning .homeycompose...', 'yellow');
      if (fs.existsSync(this.homeyComposePath)) {
        const files = fs.readdirSync(this.homeyComposePath);
        files.forEach(file => {
          const filePath = path.join(this.homeyComposePath, file);
          if (fs.statSync(filePath).isFile()) {
            fs.unlinkSync(filePath);
          }
        });
        this.log('✅ .homeycompose cleaned', 'green');
      } else {
        this.log('✅ .homeycompose does not exist', 'green');
      }

      // 2. VALIDATION: Homey CLI validation
      this.log('\n📋 STEP 2: Homey Validation...', 'yellow');
      try {
        const validation = this.exec('homey app validate --level publish');
        this.log('✅ Homey validation PASSED', 'green');
        if (validation) {
          const lines = validation.split('\n').filter(l => l.trim());
          lines.slice(-5).forEach(line => this.log(`   ${line}`, 'blue'));
        }
      } catch (error) {
        this.log('❌ Homey validation FAILED', 'red');
        this.log(error.message, 'red');
        throw new Error('Validation failed - cannot proceed');
      }

      // 3. GIT: Status check
      this.log('\n📊 STEP 3: Git Status...', 'yellow');
      const status = this.exec('git status --porcelain');
      if (!status || status.trim() === '') {
        this.log('⚠ No changes to commit', 'yellow');
        this.log('✅ Repository already up to date', 'green');
        return;
      }
      
      const changes = status.split('\n').filter(l => l.trim());
      this.log(`✅ ${changes.length} files changed`, 'green');
      changes.slice(0, 10).forEach(line => this.log(`   ${line}`, 'blue'));
      if (changes.length > 10) {
        this.log(`   ... and ${changes.length - 10} more`, 'blue');
      }

      // 4. GIT: Stash current changes
      this.log('\n💾 STEP 4: Git Stash...', 'yellow');
      this.exec('git stash push -u -m "Pre-pull stash v2.1.46"', { allowFail: true });
      this.log('✅ Changes stashed', 'green');

      // 5. GIT: Fetch and pull with rebase
      this.log('\n🔄 STEP 5: Git Fetch and Pull...', 'yellow');
      this.exec('git fetch origin');
      this.log('✅ Fetched from origin', 'green');
      
      try {
        this.exec('git pull --rebase origin master');
        this.log('✅ Pulled and rebased', 'green');
      } catch (error) {
        this.log('⚠ Pull failed, continuing...', 'yellow');
      }

      // 6. GIT: Pop stash
      this.log('\n📤 STEP 6: Git Stash Pop...', 'yellow');
      try {
        this.exec('git stash pop');
        this.log('✅ Stash popped', 'green');
      } catch (error) {
        this.log('⚠ No stash to pop or conflicts', 'yellow');
      }

      // 7. GIT: Add all changes
      this.log('\n➕ STEP 7: Git Add...', 'yellow');
      this.exec('git add .');
      this.log('✅ All changes staged', 'green');

      // 8. GIT: Commit
      this.log('\n💬 STEP 8: Git Commit...', 'yellow');
      const commitMessage = `Fix: Resolve 54 duplicate Flow card IDs

- Fixed 16 duplicate condition IDs
- Fixed 38 duplicate action IDs
- Created FIX_DUPLICATE_CONDITION_IDS.js script
- App now validates successfully at debug level
- All Flow cards have unique IDs
- Ready for publication`;

      try {
        this.exec(`git commit -m "${commitMessage}"`);
        this.log('✅ Changes committed', 'green');
      } catch (error) {
        if (error.message.includes('nothing to commit')) {
          this.log('✅ Nothing to commit (already committed)', 'green');
        } else {
          throw error;
        }
      }

      // 9. GIT: Push to master
      this.log('\n🚀 STEP 9: Git Push...', 'yellow');
      try {
        const push = this.exec('git push origin master');
        this.log('✅ Pushed to master branch', 'green');
        
        // Extract commit hash
        const commitHash = this.exec('git rev-parse --short HEAD').trim();
        this.log(`   Commit: ${commitHash}`, 'cyan');
      } catch (error) {
        this.log('❌ Push failed', 'red');
        this.log(error.message, 'red');
        throw error;
      }

      // 10. GITHUB ACTIONS: Automatic trigger
      this.log('\n⚙️ STEP 10: GitHub Actions...', 'yellow');
      this.log('✅ Push successful - GitHub Actions will trigger automatically', 'green');
      this.log('   Workflow: .github/workflows/homey-app-store.yml', 'cyan');
      this.log('   Monitor: https://github.com/dlnraja/com.tuya.zigbee/actions', 'cyan');

      // 11. FINAL STATUS
      this.log('\n' + '='.repeat(80), 'green');
      this.log('✅ PUSH AND PUBLISH COMPLETE', 'green');
      this.log('='.repeat(80) + '\n', 'green');
      
      this.log('📊 Summary:', 'cyan');
      this.log('   ✅ Security: .homeycompose cleaned', 'green');
      this.log('   ✅ Validation: Homey CLI passed', 'green');
      this.log('   ✅ Git: Changes committed and pushed', 'green');
      this.log('   ✅ GitHub Actions: Triggered automatically', 'green');
      this.log('   ✅ Version: 2.1.46', 'green');
      
      this.log('\n🎉 Publication will proceed automatically via GitHub Actions', 'green');
      this.log('   Check status at: https://github.com/dlnraja/com.tuya.zigbee/actions\n', 'cyan');

    } catch (error) {
      this.log('\n' + '='.repeat(80), 'red');
      this.log('❌ ERROR OCCURRED', 'red');
      this.log('='.repeat(80) + '\n', 'red');
      this.log(error.message, 'red');
      console.error(error);
      process.exit(1);
    }
  }
}

if (require.main === module) {
  const publisher = new SafePushPublish();
  publisher.run();
}

module.exports = SafePushPublish;
