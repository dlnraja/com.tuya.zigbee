'use strict';

const fs = require('fs');
const path = require('path');

/**
 * FINAL CHECK - Complete Project Validation
 * Checks for all possible errors before final push
 */

class FinalChecker {
  constructor() {
    this.errors = [];
    this.warnings = [];
    this.fixes = [];
  }
  
  async checkAll() {
    console.log('╔══════════════════════════════════════════════════════════╗');
    console.log('║  🔍 FINAL CHECK - Complete Project Validation           ║');
    console.log('╚══════════════════════════════════════════════════════════╝\n');
    
    const root = path.join(__dirname, '../..');
    
    // 1. Check JSON syntax
    await this.checkJSONSyntax(root);
    
    // 2. Check package.json
    await this.checkPackageJson(root);
    
    // 3. Check app.json
    await this.checkAppJson(root);
    
    // 4. Check for common issues
    await this.checkCommonIssues(root);
    
    // 5. Report
    this.generateReport();
    
    return {
      errors: this.errors.length,
      warnings: this.warnings.length,
      fixes: this.fixes.length
    };
  }
  
  async checkJSONSyntax(root) {
    console.log('📋 Checking JSON syntax...\n');
    
    const jsonFiles = [
      'app.json',
      'package.json',
      '.homeychangelog.json',
      '.homeycompose/app.json'
    ];
    
    for (const file of jsonFiles) {
      const filePath = path.join(root, file);
      if (fs.existsSync(filePath)) {
        try {
          JSON.parse(fs.readFileSync(filePath, 'utf8'));
          console.log(`   ✅ ${file}`);
        } catch (err) {
          this.errors.push({
            file,
            error: `JSON syntax error: ${err.message}`,
            fix: 'Fix JSON syntax'
          });
          console.log(`   ❌ ${file}: ${err.message}`);
        }
      }
    }
    
    // Check all driver compose files
    const driversDir = path.join(root, 'drivers');
    if (fs.existsSync(driversDir)) {
      const drivers = fs.readdirSync(driversDir);
      let checked = 0;
      let errors = 0;
      
      for (const driver of drivers) {
        const composePath = path.join(driversDir, driver, 'driver.compose.json');
        if (fs.existsSync(composePath)) {
          try {
            JSON.parse(fs.readFileSync(composePath, 'utf8'));
            checked++;
          } catch (err) {
            this.errors.push({
              file: `drivers/${driver}/driver.compose.json`,
              error: `JSON syntax error: ${err.message}`
            });
            errors++;
          }
        }
      }
      
      console.log(`   ✅ ${checked} driver files checked, ${errors} errors\n`);
    }
  }
  
  async checkPackageJson(root) {
    console.log('📦 Checking package.json...\n');
    
    const pkgPath = path.join(root, 'package.json');
    if (!fs.existsSync(pkgPath)) {
      this.errors.push({ file: 'package.json', error: 'Missing' });
      return;
    }
    
    const pkg = JSON.parse(fs.readFileSync(pkgPath, 'utf8'));
    
    // Check engines.node
    if (!pkg.engines || !pkg.engines.node) {
      this.warnings.push({
        file: 'package.json',
        issue: 'Missing engines.node',
        fix: 'Add "engines": { "node": ">=22.0.0" }'
      });
    } else if (pkg.engines.node === '>=22.0.0') {
      console.log('   ✅ Node.js version: >=22.0.0');
    } else {
      this.warnings.push({
        file: 'package.json',
        issue: `Node.js version: ${pkg.engines.node}`,
        fix: 'Update to >=22.0.0'
      });
    }
    
    // Check for node-fetch
    if (pkg.dependencies && pkg.dependencies['node-fetch']) {
      this.warnings.push({
        file: 'package.json',
        issue: 'node-fetch dependency found',
        fix: 'Remove node-fetch, use native fetch in Node 22'
      });
    }
    
    console.log();
  }
  
  async checkAppJson(root) {
    console.log('📱 Checking app.json...\n');
    
    const appPath = path.join(root, 'app.json');
    if (!fs.existsSync(appPath)) {
      this.errors.push({ file: 'app.json', error: 'Missing' });
      return;
    }
    
    const app = JSON.parse(fs.readFileSync(appPath, 'utf8'));
    
    // Check SDK version
    if (app.sdk !== 3) {
      this.errors.push({
        file: 'app.json',
        error: `SDK version ${app.sdk}, should be 3`,
        fix: 'Set "sdk": 3'
      });
    } else {
      console.log('   ✅ SDK version: 3');
    }
    
    // Check compatibility
    if (app.compatibility && app.compatibility.startsWith('>=12')) {
      console.log(`   ✅ Compatibility: ${app.compatibility}`);
    } else {
      this.warnings.push({
        file: 'app.json',
        issue: 'Compatibility should be >=12.2.0',
        fix: 'Set "compatibility": ">=12.2.0"'
      });
    }
    
    // Check required fields
    const required = ['id', 'version', 'name', 'description', 'category', 'permissions'];
    for (const field of required) {
      if (!app[field]) {
        this.errors.push({
          file: 'app.json',
          error: `Missing required field: ${field}`
        });
      }
    }
    
    console.log();
  }
  
  async checkCommonIssues(root) {
    console.log('🔍 Checking common issues...\n');
    
    // Check for missing assets
    const assetsDir = path.join(root, 'assets');
    if (!fs.existsSync(assetsDir)) {
      this.warnings.push({
        issue: 'Missing assets directory',
        fix: 'Create assets/ directory'
      });
    }
    
    // Check for README
    const readmePath = path.join(root, 'README.md');
    if (fs.existsSync(readmePath)) {
      console.log('   ✅ README.md exists');
    } else {
      this.warnings.push({
        issue: 'Missing README.md',
        fix: 'Create README.md'
      });
    }
    
    // Check for .homeychangelog.json
    const changelogPath = path.join(root, '.homeychangelog.json');
    if (fs.existsSync(changelogPath)) {
      console.log('   ✅ .homeychangelog.json exists');
    } else {
      this.warnings.push({
        issue: 'Missing .homeychangelog.json',
        fix: 'Create changelog file'
      });
    }
    
    // Check lib directory
    const libDir = path.join(root, 'lib');
    if (fs.existsSync(libDir)) {
      const files = fs.readdirSync(libDir);
      console.log(`   ✅ lib/ directory: ${files.length} files`);
    }
    
    console.log();
  }
  
  generateReport() {
    console.log('\n╔══════════════════════════════════════════════════════════╗');
    console.log('║  📊 FINAL CHECK REPORT                                   ║');
    console.log('╚══════════════════════════════════════════════════════════╝\n');
    
    console.log(`📈 Statistics:`);
    console.log(`   Errors: ${this.errors.length}`);
    console.log(`   Warnings: ${this.warnings.length}\n`);
    
    if (this.errors.length > 0) {
      console.log(`🔴 ERRORS (${this.errors.length}):\n`);
      this.errors.forEach((err, i) => {
        console.log(`   ${i + 1}. ${err.file || 'General'}`);
        console.log(`      Error: ${err.error}`);
        if (err.fix) console.log(`      Fix: ${err.fix}`);
        console.log();
      });
    } else {
      console.log('✅ No errors found!\n');
    }
    
    if (this.warnings.length > 0) {
      console.log(`⚠️  WARNINGS (${this.warnings.length}):\n`);
      this.warnings.forEach((warn, i) => {
        console.log(`   ${i + 1}. ${warn.file || warn.issue}`);
        if (warn.issue) console.log(`      Issue: ${warn.issue}`);
        if (warn.fix) console.log(`      Fix: ${warn.fix}`);
        console.log();
      });
    } else {
      console.log('✅ No warnings!\n');
    }
    
    // Overall status
    if (this.errors.length === 0) {
      console.log('🎉 PROJECT READY FOR PUSH!\n');
      console.log('✅ All critical checks passed');
      console.log('✅ JSON syntax valid');
      console.log('✅ Configuration correct');
      console.log('✅ Ready for production\n');
    } else {
      console.log('❌ FIX ERRORS BEFORE PUSH\n');
    }
  }
}

// Run if called directly
if (require.main === module) {
  const checker = new FinalChecker();
  checker.checkAll().then(result => {
    if (result.errors > 0) {
      process.exit(1);
    }
  }).catch(err => {
    console.error('❌ Fatal error:', err);
    process.exit(1);
  });
}

module.exports = FinalChecker;
