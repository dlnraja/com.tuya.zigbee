#!/usr/bin/env node
'use strict';

/**
 * VERSION SYNC ALL - Synchronise les versions partout
 * Vérifie et corrige les incohérences de version dans:
 * - app.json
 * - package.json
 * - Tous les workflows YAML
 * - Tous les scripts
 */

const fs = require('fs');
const path = require('path');
const { execSync } = require('child_process');

const ROOT = path.join(__dirname, '..');
const TARGET_VERSION = '2.15.98';

class VersionSynchronizer {
  constructor() {
    this.issues = [];
    this.fixes = [];
  }

  log(message) {
    console.log(`✓ ${message}`);
  }

  error(message) {
    console.error(`✗ ${message}`);
    this.issues.push(message);
  }

  success(message) {
    console.log(`✅ ${message}`);
    this.fixes.push(message);
  }

  // Vérifier app.json
  checkAppJson() {
    this.log('Checking app.json version...');
    const appJsonPath = path.join(ROOT, 'app.json');
    const appJson = JSON.parse(fs.readFileSync(appJsonPath, 'utf8'));
    
    if (appJson.version !== TARGET_VERSION) {
      this.error(`app.json version mismatch: ${appJson.version} !== ${TARGET_VERSION}`);
      appJson.version = TARGET_VERSION;
      fs.writeFileSync(appJsonPath, JSON.stringify(appJson, null, 2) + '\n');
      this.success(`Fixed app.json version to ${TARGET_VERSION}`);
      return false;
    }
    
    this.log(`app.json version correct: ${TARGET_VERSION}`);
    return true;
  }

  // Vérifier package.json
  checkPackageJson() {
    this.log('Checking package.json version...');
    const pkgPath = path.join(ROOT, 'package.json');
    const pkg = JSON.parse(fs.readFileSync(pkgPath, 'utf8'));
    
    if (pkg.version !== TARGET_VERSION) {
      this.error(`package.json version mismatch: ${pkg.version} !== ${TARGET_VERSION}`);
      pkg.version = TARGET_VERSION;
      fs.writeFileSync(pkgPath, JSON.stringify(pkg, null, 2) + '\n');
      this.success(`Fixed package.json version to ${TARGET_VERSION}`);
      return false;
    }
    
    this.log(`package.json version correct: ${TARGET_VERSION}`);
    return true;
  }

  // Vérifier tous les workflows YAML
  checkWorkflows() {
    this.log('Checking all GitHub workflows...');
    const workflowsDir = path.join(ROOT, '.github', 'workflows');
    
    if (!fs.existsSync(workflowsDir)) {
      this.error('Workflows directory not found');
      return false;
    }

    const yamlFiles = fs.readdirSync(workflowsDir).filter(f => f.endsWith('.yml') || f.endsWith('.yaml'));
    let allCorrect = true;

    for (const file of yamlFiles) {
      const filePath = path.join(workflowsDir, file);
      let content = fs.readFileSync(filePath, 'utf8');
      let modified = false;

      // Remplacer les anciennes versions hardcodées
      const oldVersions = ['2.15.98', '2.15.98', '2.15.98', '2.15.98', '2.15.92', '2.15.89', '2.15.87'];
      
      for (const oldVer of oldVersions) {
        if (content.includes(oldVer)) {
          content = String(content).replace(new RegExp(String(oldVer).replace(/\./g, '\\.'), 'g'), TARGET_VERSION);
          modified = true;
          this.error(`Found old version ${oldVer} in ${file}`);
        }
      }

      if (modified) {
        fs.writeFileSync(filePath, content);
        this.success(`Updated ${file} to version ${TARGET_VERSION}`);
        allCorrect = false;
      } else {
        this.log(`${file} is up to date`);
      }
    }

    return allCorrect;
  }

  // Vérifier les scripts
  checkScripts() {
    this.log('Checking scripts for version references...');
    const scriptsDir = path.join(ROOT, 'scripts');
    
    if (!fs.existsSync(scriptsDir)) {
      return true;
    }

    const scriptFiles = this.getAllFiles(scriptsDir).filter(f => 
      f.endsWith('.js') || f.endsWith('.ps1')
    );

    let allCorrect = true;
    const oldVersions = ['2.15.98', '2.15.98', '2.15.98', '2.15.98'];

    for (const file of scriptFiles) {
      let content = fs.readFileSync(file, 'utf8');
      let modified = false;

      for (const oldVer of oldVersions) {
        if (content.includes(oldVer)) {
          content = String(content).replace(new RegExp(String(oldVer).replace(/\./g, '\\.'), 'g'), TARGET_VERSION);
          modified = true;
          this.error(`Found old version ${oldVer} in ${path.relative(ROOT, file)}`);
        }
      }

      if (modified) {
        fs.writeFileSync(file, content);
        this.success(`Updated ${path.relative(ROOT, file)}`);
        allCorrect = false;
      }
    }

    return allCorrect;
  }

  // Récupérer tous les fichiers récursivement
  getAllFiles(dir, fileList = []) {
    const files = fs.readdirSync(dir);
    
    for (const file of files) {
      const filePath = path.join(dir, file);
      const stat = fs.statSync(filePath);
      
      if (stat.isDirectory()) {
        if (!file.startsWith('.') && file !== 'node_modules') {
          this.getAllFiles(filePath, fileList);
        }
      } else {
        fileList.push(filePath);
      }
    }
    
    return fileList;
  }

  // Exécuter toutes les vérifications
  async run() {
    console.log('╔════════════════════════════════════════════════════════════╗');
    console.log('║     VERSION SYNCHRONIZER - v2.15.98                        ║');
    console.log('╚════════════════════════════════════════════════════════════╝\n');

    const checks = [
      this.checkAppJson(),
      this.checkPackageJson(),
      this.checkWorkflows(),
      this.checkScripts()
    ];

    const allCorrect = checks.every(Boolean);

    console.log('\n' + '═'.repeat(60));
    console.log('SUMMARY');
    console.log('═'.repeat(60));

    if (this.issues.length > 0) {
      console.log(`\n⚠️  Found ${this.issues.length} version inconsistencies:`);
      this.issues.forEach(issue => console.log(`   - ${issue}`));
    }

    if (this.fixes.length > 0) {
      console.log(`\n✅ Applied ${this.fixes.length} fixes:`);
      this.fixes.forEach(fix => console.log(`   - ${fix}`));
    }

    if (allCorrect && this.fixes.length === 0) {
      console.log('\n✅ All versions are consistent: ' + TARGET_VERSION);
    } else if (this.fixes.length > 0) {
      console.log('\n✅ All versions synchronized to: ' + TARGET_VERSION);
    }

    console.log('═'.repeat(60) + '\n');

    return this.issues.length === 0 || this.fixes.length > 0;
  }
}

// Exécuter si appelé directement
if (require.main === module) {
  const sync = new VersionSynchronizer();
  sync.run().then(success => {
    process.exit(success ? 0 : 1);
  }).catch(err => {
    console.error('Fatal error:', err);
    process.exit(1);
  });
}

module.exports = VersionSynchronizer;
