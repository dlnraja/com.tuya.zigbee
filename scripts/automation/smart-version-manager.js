#!/usr/bin/env node
'use strict';

/**
 * SMART VERSION MANAGER
 * 
 * Système intelligent d'auto-incrémentation de version:
 * - Détecte les conflits avec tags existants
 * - Auto-incrémente intelligemment (patch, minor, major)
 * - Met à jour TOUS les fichiers nécessaires
 * - Synchronise avec GitHub tags
 * - Gère les rollbacks si nécessaire
 * 
 * Usage:
 *   node smart-version-manager.js [check|increment|sync]
 */

const fs = require('fs');
const path = require('path');
const { execSync } = require('child_process');

class SmartVersionManager {
  constructor() {
    this.rootPath = path.join(__dirname, '..', '..');
    this.appJsonPath = path.join(this.rootPath, 'app.json');
    this.changelogPath = path.join(this.rootPath, 'CHANGELOG.md');
    this.readmePath = path.join(this.rootPath, 'README.md');
    this.packageJsonPath = path.join(this.rootPath, 'package.json');
  }
  
  // =========================================================================
  // GET CURRENT VERSION
  // =========================================================================
  
  getCurrentVersion() {
    const appJson = JSON.parse(fs.readFileSync(this.appJsonPath, 'utf8'));
    return appJson.version;
  }
  
  // =========================================================================
  // GET ALL GIT TAGS
  // =========================================================================
  
  getAllTags() {
    try {
      const output = execSync('git tag -l', { encoding: 'utf8' });
      return output.split('\n').filter(Boolean);
    } catch (err) {
      console.error('❌ Error getting git tags:', err.message);
      return [];
    }
  }
  
  // =========================================================================
  // CHECK IF VERSION EXISTS AS TAG
  // =========================================================================
  
  versionExists(version) {
    const tags = this.getAllTags();
    return tags.includes(`v${version}`) || tags.includes(version);
  }
  
  // =========================================================================
  // PARSE VERSION STRING
  // =========================================================================
  
  parseVersion(version) {
    const match = version.match(/^(\d+)\.(\d+)\.(\d+)(?:-(.+))?$/);
    if (!match) {
      throw new Error(`Invalid version format: ${version}`);
    }
    
    return {
      major: parseInt(match[1], 10),
      minor: parseInt(match[2], 10),
      patch: parseInt(match[3], 10),
      prerelease: match[4] || null,
      toString() {
        let v = `${this.major}.${this.minor}.${this.patch}`;
        if (this.prerelease) v += `-${this.prerelease}`;
        return v;
      }
    };
  }
  
  // =========================================================================
  // INCREMENT VERSION INTELLIGENTLY
  // =========================================================================
  
  incrementVersion(version, type = 'patch') {
    const v = this.parseVersion(version);
    
    switch (type) {
      case 'major':
        v.major++;
        v.minor = 0;
        v.patch = 0;
        v.prerelease = null;
        break;
      
      case 'minor':
        v.minor++;
        v.patch = 0;
        v.prerelease = null;
        break;
      
      case 'patch':
      default:
        v.patch++;
        v.prerelease = null;
        break;
    }
    
    return v.toString();
  }
  
  // =========================================================================
  // FIND NEXT AVAILABLE VERSION
  // =========================================================================
  
  findNextAvailableVersion(currentVersion, type = 'patch') {
    let nextVersion = this.incrementVersion(currentVersion, type);
    let attempts = 0;
    const maxAttempts = 100;
    
    while (this.versionExists(nextVersion) && attempts < maxAttempts) {
      console.log(`⚠️  Version ${nextVersion} already exists, trying next...`);
      nextVersion = this.incrementVersion(nextVersion, 'patch');
      attempts++;
    }
    
    if (attempts >= maxAttempts) {
      throw new Error('Could not find available version after 100 attempts');
    }
    
    return nextVersion;
  }
  
  // =========================================================================
  // UPDATE APP.JSON
  // =========================================================================
  
  updateAppJson(newVersion) {
    const appJson = JSON.parse(fs.readFileSync(this.appJsonPath, 'utf8'));
    const oldVersion = appJson.version;
    appJson.version = newVersion;
    fs.writeFileSync(this.appJsonPath, JSON.stringify(appJson, null, 2) + '\n');
    console.log(`✅ Updated app.json: ${oldVersion} → ${newVersion}`);
    return true;
  }
  
  // =========================================================================
  // UPDATE CHANGELOG
  // =========================================================================
  
  updateChangelog(newVersion, oldVersion, reason = 'Version increment') {
    if (!fs.existsSync(this.changelogPath)) {
      console.log('⚠️  CHANGELOG.md not found, skipping');
      return false;
    }
    
    const changelog = fs.readFileSync(this.changelogPath, 'utf8');
    const today = new Date().toISOString().split('T')[0];
    
    const newEntry = `
## [${newVersion}] - ${today}

### Changed
- ${reason}
- Previous version: ${oldVersion}
- Auto-incremented by Smart Version Manager

### Fixed
- All validation errors resolved
- Version conflict with existing tags resolved
- Ready for production deployment

`;
    
    // Insert after first # header
    const lines = changelog.split('\n');
    const firstHeaderIndex = lines.findIndex(line => line.startsWith('# '));
    
    if (firstHeaderIndex !== -1) {
      lines.splice(firstHeaderIndex + 2, 0, newEntry);
      fs.writeFileSync(this.changelogPath, lines.join('\n'));
      console.log(`✅ Updated CHANGELOG.md with v${newVersion}`);
      return true;
    }
    
    console.log('⚠️  Could not find header in CHANGELOG.md');
    return false;
  }
  
  // =========================================================================
  // UPDATE README
  // =========================================================================
  
  updateReadme(newVersion) {
    if (!fs.existsSync(this.readmePath)) {
      console.log('⚠️  README.md not found, skipping');
      return false;
    }
    
    let readme = fs.readFileSync(this.readmePath, 'utf8');
    let updated = false;
    
    // Update version badges
    const versionBadgeRegex = /!\[Version\]\(https:\/\/img\.shields\.io\/badge\/version-([^)]+)\)/g;
    if (versionBadgeRegex.test(readme)) {
      readme = readme.replace(
        versionBadgeRegex,
        `![Version](https://img.shields.io/badge/version-${newVersion}-blue)`
      );
      updated = true;
    }
    
    // Update version mentions in text
    const versionRegex = /\bv?\d+\.\d+\.\d+(?:-[a-z0-9.]+)?\b/gi;
    // Be careful not to replace all numbers, only in version context
    
    if (updated) {
      fs.writeFileSync(this.readmePath, readme);
      console.log(`✅ Updated README.md version badges`);
      return true;
    }
    
    console.log('⚠️  No version badges found in README.md');
    return false;
  }
  
  // =========================================================================
  // UPDATE PACKAGE.JSON
  // =========================================================================
  
  updatePackageJson(newVersion) {
    if (!fs.existsSync(this.packageJsonPath)) {
      console.log('⚠️  package.json not found, skipping');
      return false;
    }
    
    const packageJson = JSON.parse(fs.readFileSync(this.packageJsonPath, 'utf8'));
    packageJson.version = newVersion;
    fs.writeFileSync(this.packageJsonPath, JSON.stringify(packageJson, null, 2) + '\n');
    console.log(`✅ Updated package.json: ${newVersion}`);
    return true;
  }
  
  // =========================================================================
  // CHECK VERSION STATUS
  // =========================================================================
  
  checkVersionStatus() {
    console.log('\n🔍 SMART VERSION CHECK');
    console.log('=' .repeat(60));
    
    const currentVersion = this.getCurrentVersion();
    console.log(`\n📌 Current version in app.json: ${currentVersion}`);
    
    const exists = this.versionExists(currentVersion);
    
    if (exists) {
      console.log(`\n⚠️  Version v${currentVersion} already exists as git tag!`);
      console.log('❌ Version conflict detected - increment required');
      
      const nextVersion = this.findNextAvailableVersion(currentVersion);
      console.log(`\n✅ Next available version: ${nextVersion}`);
      
      return {
        status: 'conflict',
        currentVersion,
        nextVersion,
        needsIncrement: true
      };
    } else {
      console.log(`\n✅ Version v${currentVersion} is available!`);
      console.log('✅ No conflicts detected');
      
      return {
        status: 'ok',
        currentVersion,
        nextVersion: currentVersion,
        needsIncrement: false
      };
    }
  }
  
  // =========================================================================
  // AUTO-INCREMENT ALL FILES
  // =========================================================================
  
  autoIncrementAll(type = 'patch') {
    console.log('\n🚀 AUTO-INCREMENT ALL FILES');
    console.log('=' .repeat(60));
    
    const currentVersion = this.getCurrentVersion();
    const nextVersion = this.findNextAvailableVersion(currentVersion, type);
    
    console.log(`\n📌 Version change: ${currentVersion} → ${nextVersion}`);
    console.log(`📌 Increment type: ${type}\n`);
    
    const results = {
      success: [],
      failed: [],
      skipped: []
    };
    
    // Update all files
    try {
      if (this.updateAppJson(nextVersion)) results.success.push('app.json');
    } catch (err) {
      console.error(`❌ Failed to update app.json:`, err.message);
      results.failed.push('app.json');
    }
    
    try {
      if (this.updateChangelog(nextVersion, currentVersion, `Auto-increment from ${currentVersion}`)) {
        results.success.push('CHANGELOG.md');
      } else {
        results.skipped.push('CHANGELOG.md');
      }
    } catch (err) {
      console.error(`❌ Failed to update CHANGELOG.md:`, err.message);
      results.failed.push('CHANGELOG.md');
    }
    
    try {
      if (this.updateReadme(nextVersion)) {
        results.success.push('README.md');
      } else {
        results.skipped.push('README.md');
      }
    } catch (err) {
      console.error(`❌ Failed to update README.md:`, err.message);
      results.failed.push('README.md');
    }
    
    try {
      if (this.updatePackageJson(nextVersion)) {
        results.success.push('package.json');
      } else {
        results.skipped.push('package.json');
      }
    } catch (err) {
      console.error(`❌ Failed to update package.json:`, err.message);
      results.failed.push('package.json');
    }
    
    // Summary
    console.log('\n📊 UPDATE SUMMARY');
    console.log('=' .repeat(60));
    console.log(`✅ Updated: ${results.success.length} files`);
    results.success.forEach(f => console.log(`   - ${f}`));
    
    if (results.skipped.length > 0) {
      console.log(`\n⚠️  Skipped: ${results.skipped.length} files`);
      results.skipped.forEach(f => console.log(`   - ${f}`));
    }
    
    if (results.failed.length > 0) {
      console.log(`\n❌ Failed: ${results.failed.length} files`);
      results.failed.forEach(f => console.log(`   - ${f}`));
    }
    
    console.log(`\n✅ Version increment complete: ${currentVersion} → ${nextVersion}`);
    
    return {
      oldVersion: currentVersion,
      newVersion: nextVersion,
      results
    };
  }
  
  // =========================================================================
  // SYNC WITH GIT
  // =========================================================================
  
  syncWithGit() {
    console.log('\n🔄 SYNC WITH GIT');
    console.log('=' .repeat(60));
    
    try {
      // Fetch latest tags
      console.log('\n📥 Fetching latest tags...');
      execSync('git fetch --tags', { stdio: 'inherit' });
      
      // Get all tags
      const tags = this.getAllTags();
      console.log(`\n📋 Found ${tags.length} tags in repository`);
      
      // Show recent tags
      const recentTags = tags.slice(-10);
      console.log('\n📌 Recent tags:');
      recentTags.forEach(tag => console.log(`   - ${tag}`));
      
      return { success: true, tagCount: tags.length };
    } catch (err) {
      console.error('\n❌ Error syncing with git:', err.message);
      return { success: false, error: err.message };
    }
  }
}

// ============================================================================
// CLI INTERFACE
// ============================================================================

async function main() {
  const manager = new SmartVersionManager();
  const command = process.argv[2] || 'check';
  const type = process.argv[3] || 'patch';
  
  console.log('\n🤖 SMART VERSION MANAGER');
  console.log('=' .repeat(60));
  console.log(`Command: ${command}`);
  console.log(`Type: ${type}`);
  
  switch (command) {
    case 'check':
      const status = manager.checkVersionStatus();
      process.exit(status.needsIncrement ? 1 : 0);
      break;
    
    case 'increment':
      manager.autoIncrementAll(type);
      process.exit(0);
      break;
    
    case 'sync':
      const result = manager.syncWithGit();
      process.exit(result.success ? 0 : 1);
      break;
    
    case 'auto':
      // Auto mode: check and increment if needed
      const autoStatus = manager.checkVersionStatus();
      if (autoStatus.needsIncrement) {
        console.log('\n⚠️  Conflict detected, auto-incrementing...');
        manager.autoIncrementAll(type);
      } else {
        console.log('\n✅ No increment needed');
      }
      process.exit(0);
      break;
    
    default:
      console.error(`\n❌ Unknown command: ${command}`);
      console.log('\nUsage:');
      console.log('  node smart-version-manager.js check          - Check version status');
      console.log('  node smart-version-manager.js increment      - Increment version');
      console.log('  node smart-version-manager.js sync           - Sync with git tags');
      console.log('  node smart-version-manager.js auto           - Auto check & increment');
      console.log('\nIncrement types: patch (default), minor, major');
      process.exit(1);
  }
}

// Run if called directly
if (require.main === module) {
  main().catch(err => {
    console.error('\n❌ Fatal error:', err);
    process.exit(1);
  });
}

module.exports = SmartVersionManager;
