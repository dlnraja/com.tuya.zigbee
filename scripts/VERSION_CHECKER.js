#!/usr/bin/env node
'use strict';

/**
 * VERSION CONSISTENCY CHECKER v2.15.97
 * 
 * Checks and fixes version inconsistencies across:
 * - app.json
 * - package.json
 * - GitHub Actions workflows
 * - All scripts
 * 
 * Author: Dylan Rajasekaram
 * Date: 2025-10-15
 */

const fs = require('fs');
const path = require('path');

const ROOT_DIR = path.join(__dirname, '..');

class VersionChecker {
  constructor(targetVersion) {
    this.targetVersion = targetVersion || '2.15.97';
    this.issues = [];
    this.fixes = [];
  }
  
  log(message) {
    console.log(`[VERSION] ${message}`);
  }
  
  error(message) {
    console.error(`[VERSION] ❌ ${message}`);
    this.issues.push(message);
  }
  
  success(message) {
    console.log(`[VERSION] ✅ ${message}`);
    this.fixes.push(message);
  }
  
  checkAppJson() {
    this.log('Checking app.json...');
    
    const appJsonPath = path.join(ROOT_DIR, 'app.json');
    
    if (!fs.existsSync(appJsonPath)) {
      this.error('app.json not found');
      return false;
    }
    
    try {
      const appJson = JSON.parse(fs.readFileSync(appJsonPath, 'utf-8'));
      
      if (appJson.version !== this.targetVersion) {
        this.error(`app.json version mismatch: ${appJson.version} !== ${this.targetVersion}`);
        
        // Fix it
        appJson.version = this.targetVersion;
        fs.writeFileSync(appJsonPath, JSON.stringify(appJson, null, 2), 'utf-8');
        
        this.success(`Fixed app.json version to ${this.targetVersion}`);
        return true;
      } else {
        this.success('app.json version correct');
        return false;
      }
    } catch (err) {
      this.error(`Failed to check app.json: ${err.message}`);
      return false;
    }
  }
  
  checkPackageJson() {
    this.log('Checking package.json...');
    
    const packageJsonPath = path.join(ROOT_DIR, 'package.json');
    
    if (!fs.existsSync(packageJsonPath)) {
      this.error('package.json not found');
      return false;
    }
    
    try {
      const packageJson = JSON.parse(fs.readFileSync(packageJsonPath, 'utf-8'));
      
      if (packageJson.version !== this.targetVersion) {
        this.error(`package.json version mismatch: ${packageJson.version} !== ${this.targetVersion}`);
        
        // Fix it
        packageJson.version = this.targetVersion;
        fs.writeFileSync(packageJsonPath, JSON.stringify(packageJson, null, 2), 'utf-8');
        
        this.success(`Fixed package.json version to ${this.targetVersion}`);
        return true;
      } else {
        this.success('package.json version correct');
        return false;
      }
    } catch (err) {
      this.error(`Failed to check package.json: ${err.message}`);
      return false;
    }
  }
  
  checkWorkflows() {
    this.log('Checking GitHub Actions workflows...');
    
    const workflowsDir = path.join(ROOT_DIR, '.github', 'workflows');
    
    if (!fs.existsSync(workflowsDir)) {
      this.log('No workflows directory found, skipping');
      return false;
    }
    
    let fixed = false;
    const files = fs.readdirSync(workflowsDir);
    
    for (const file of files) {
      if (!file.endsWith('.yml') && !file.endsWith('.yaml')) continue;
      
      const filePath = path.join(workflowsDir, file);
      let content = fs.readFileSync(filePath, 'utf-8');
      
      // Check for version references
      const versionRegex = /version:\s*['"]?\d+\.\d+\.\d+['"]?/g;
      const matches = content.match(versionRegex);
      
      if (matches) {
        let updated = false;
        
        for (const match of matches) {
          if (!match.includes(this.targetVersion)) {
            content = content.replace(match, `version: "${this.targetVersion}"`);
            updated = true;
          }
        }
        
        if (updated) {
          fs.writeFileSync(filePath, content, 'utf-8');
          this.success(`Fixed workflow: ${file}`);
          fixed = true;
        }
      }
    }
    
    return fixed;
  }
  
  async run() {
    this.log(`\n🔍 VERSION CONSISTENCY CHECK v${this.targetVersion}\n`);
    
    let hasChanges = false;
    
    hasChanges = this.checkAppJson() || hasChanges;
    hasChanges = this.checkPackageJson() || hasChanges;
    hasChanges = this.checkWorkflows() || hasChanges;
    
    this.log('\n📊 SUMMARY\n');
    this.log(`Issues found: ${this.issues.length}`);
    this.log(`Fixes applied: ${this.fixes.length}`);
    
    if (hasChanges) {
      this.success('\n✅ Version consistency restored!');
      return true;
    } else {
      this.success('\n✅ All versions consistent!');
      return false;
    }
  }
}

// ========================================
// ENTRY POINT
// ========================================

if (require.main === module) {
  const targetVersion = process.argv[2] || '2.15.97';
  const checker = new VersionChecker(targetVersion);
  
  checker.run().then(hasChanges => {
    process.exit(hasChanges ? 0 : 0);
  }).catch(err => {
    console.error('Fatal error:', err);
    process.exit(1);
  });
}

module.exports = VersionChecker;
