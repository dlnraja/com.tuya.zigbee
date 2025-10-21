#!/usr/bin/env node
'use strict';

/**
 * AUTO-RECOVERY SYSTEM
 * 
 * Détecte les erreurs de publication et auto-corrige:
 * - Conflits de version
 * - Erreurs de validation
 * - Problèmes Git
 * - Relance automatique du workflow
 */

const { execSync } = require('child_process');
const fs = require('fs');
const path = require('path');

class AutoRecovery {
  constructor() {
    this.rootPath = path.join(__dirname, '..', '..');
  }
  
  // =========================================================================
  // DETECT ERROR TYPE FROM LOGS
  // =========================================================================
  
  detectErrorType(errorLog) {
    const errors = {
      versionConflict: /version.*already.*exists|tag.*already.*exists/i,
      validationError: /validation.*failed|invalid.*app/i,
      gitError: /failed.*push|rejected.*push|conflict/i,
      authError: /authentication.*failed|token.*invalid/i
    };
    
    for (const [type, regex] of Object.entries(errors)) {
      if (regex.test(errorLog)) {
        return type;
      }
    }
    
    return 'unknown';
  }
  
  // =========================================================================
  // FIX VERSION CONFLICT
  // =========================================================================
  
  fixVersionConflict() {
    console.log('\n🔧 FIXING VERSION CONFLICT');
    console.log('=' .repeat(60));
    
    try {
      // Run smart version manager in auto mode
      execSync('node scripts/automation/smart-version-manager.js auto', {
        cwd: this.rootPath,
        stdio: 'inherit'
      });
      
      console.log('\n✅ Version conflict fixed');
      return true;
    } catch (err) {
      console.error('\n❌ Failed to fix version conflict:', err.message);
      return false;
    }
  }
  
  // =========================================================================
  // FIX VALIDATION ERRORS
  // =========================================================================
  
  fixValidationErrors() {
    console.log('\n🔧 FIXING VALIDATION ERRORS');
    console.log('=' .repeat(60));
    
    try {
      // Run validation fix scripts
      const scripts = [
        'FIX_MISSING_IMAGES.js',
        'FIX_BATTERY_ENERGY.js'
      ];
      
      for (const script of scripts) {
        const scriptPath = path.join(this.rootPath, script);
        if (fs.existsSync(scriptPath)) {
          console.log(`\nRunning ${script}...`);
          execSync(`node ${scriptPath}`, {
            cwd: this.rootPath,
            stdio: 'inherit'
          });
        }
      }
      
      console.log('\n✅ Validation errors fixed');
      return true;
    } catch (err) {
      console.error('\n❌ Failed to fix validation errors:', err.message);
      return false;
    }
  }
  
  // =========================================================================
  // FIX GIT ERRORS
  // =========================================================================
  
  fixGitErrors() {
    console.log('\n🔧 FIXING GIT ERRORS');
    console.log('=' .repeat(60));
    
    try {
      // Reset and sync with remote
      execSync('git fetch origin', { cwd: this.rootPath, stdio: 'inherit' });
      execSync('git reset --hard origin/master', { cwd: this.rootPath, stdio: 'inherit' });
      
      console.log('\n✅ Git errors fixed');
      return true;
    } catch (err) {
      console.error('\n❌ Failed to fix git errors:', err.message);
      return false;
    }
  }
  
  // =========================================================================
  // TRIGGER WORKFLOW RETRY
  // =========================================================================
  
  triggerWorkflowRetry() {
    console.log('\n🔄 TRIGGERING WORKFLOW RETRY');
    console.log('=' .repeat(60));
    
    try {
      // Create empty commit to trigger workflow
      execSync('git commit --allow-empty -m "chore: Retry publication after auto-recovery [skip ci]"', {
        cwd: this.rootPath,
        stdio: 'inherit'
      });
      
      execSync('git push origin master', {
        cwd: this.rootPath,
        stdio: 'inherit'
      });
      
      console.log('\n✅ Workflow retry triggered');
      return true;
    } catch (err) {
      console.error('\n❌ Failed to trigger retry:', err.message);
      return false;
    }
  }
  
  // =========================================================================
  // MAIN RECOVERY PROCESS
  // =========================================================================
  
  async recover(errorLog = '') {
    console.log('\n🚨 AUTO-RECOVERY SYSTEM');
    console.log('=' .repeat(60));
    
    const errorType = this.detectErrorType(errorLog);
    console.log(`\n🔍 Detected error type: ${errorType}`);
    
    let fixed = false;
    
    switch (errorType) {
      case 'versionConflict':
        fixed = this.fixVersionConflict();
        break;
      
      case 'validationError':
        fixed = this.fixValidationErrors();
        break;
      
      case 'gitError':
        fixed = this.fixGitErrors();
        break;
      
      case 'authError':
        console.log('\n⚠️  Authentication error - manual intervention required');
        console.log('Please check HOMEY_TOKEN secret in GitHub');
        return false;
      
      default:
        console.log('\n⚠️  Unknown error - attempting all fixes');
        fixed = this.fixVersionConflict() && this.fixValidationErrors() && this.fixGitErrors();
    }
    
    if (fixed) {
      console.log('\n✅ Errors fixed - triggering retry');
      return this.triggerWorkflowRetry();
    } else {
      console.log('\n❌ Could not fix errors automatically');
      return false;
    }
  }
}

// ============================================================================
// CLI INTERFACE
// ============================================================================

async function main() {
  const recovery = new AutoRecovery();
  const errorLog = process.argv[2] || process.env.ERROR_LOG || '';
  
  const success = await recovery.recover(errorLog);
  process.exit(success ? 0 : 1);
}

// Run if called directly
if (require.main === module) {
  main().catch(err => {
    console.error('\n❌ Fatal error:', err);
    process.exit(1);
  });
}

module.exports = AutoRecovery;
