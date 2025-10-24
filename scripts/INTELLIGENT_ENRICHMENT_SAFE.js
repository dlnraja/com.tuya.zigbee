#!/usr/bin/env node
'use strict';

/**
 * INTELLIGENT ENRICHMENT ORCHESTRATOR - SAFE MODE
 * 
 * Lance tous les enrichissements de manière intelligente:
 * - Backup automatique avant modification
 * - Validation après chaque étape
 * - Rollback si erreur détectée
 * - Logs détaillés
 * - Protection des drivers fonctionnels
 */

const fs = require('fs');
const path = require('path');
const { execSync } = require('child_process');

const ROOT = path.join(__dirname, '..');
const BACKUP_DIR = path.join(ROOT, '.backup-enrichment');

class IntelligentEnrichment {
  
  constructor() {
    this.stats = {
      started: new Date(),
      steps: [],
      errors: [],
      warnings: [],
      success: 0,
      failed: 0
    };
  }
  
  /**
   * Créer un backup complet avant enrichissement
   */
  createBackup() {
    console.log('📦 Creating backup before enrichment...');
    
    const timestamp = new Date().toISOString().replace(/[:.]/g, '-');
    const backupPath = path.join(BACKUP_DIR, timestamp);
    
    if (!fs.existsSync(BACKUP_DIR)) {
      fs.mkdirSync(BACKUP_DIR, { recursive: true });
    }
    
    fs.mkdirSync(backupPath, { recursive: true });
    
    // Backup critical directories
    const criticalDirs = ['drivers', 'lib', 'app.json', 'package.json'];
    
    for (const dir of criticalDirs) {
      const src = path.join(ROOT, dir);
      const dest = path.join(backupPath, dir);
      
      if (fs.existsSync(src)) {
        this.copyRecursive(src, dest);
        console.log(`  ✓ Backed up: ${dir}`);
      }
    }
    
    console.log(`✅ Backup created: ${backupPath}\n`);
    return backupPath;
  }
  
  /**
   * Copie récursive
   */
  copyRecursive(src, dest) {
    const stat = fs.statSync(src);
    
    if (stat.isDirectory()) {
      if (!fs.existsSync(dest)) {
        fs.mkdirSync(dest, { recursive: true });
      }
      
      const files = fs.readdirSync(src);
      for (const file of files) {
        this.copyRecursive(path.join(src, file), path.join(dest, file));
      }
    } else {
      fs.copyFileSync(src, dest);
    }
  }
  
  /**
   * Valider l'état du projet
   */
  validate() {
    console.log('🔍 Validating project state...');
    
    try {
      // Test homey app validate
      execSync('homey app validate', { 
        cwd: ROOT, 
        stdio: 'pipe',
        encoding: 'utf8'
      });
      
      console.log('✅ Validation: PASSED\n');
      return true;
    } catch (error) {
      console.log('❌ Validation: FAILED');
      console.log(error.stdout || error.message);
      return false;
    }
  }
  
  /**
   * Exécuter un script d'enrichissement de manière safe
   */
  runEnrichmentScript(scriptName, description) {
    console.log(`\n${'='.repeat(60)}`);
    console.log(`🚀 Running: ${scriptName}`);
    console.log(`📝 ${description}`);
    console.log('='.repeat(60));
    
    const step = {
      script: scriptName,
      description,
      startTime: new Date(),
      status: 'running'
    };
    
    try {
      // Exécuter le script
      const result = execSync(`node ${scriptName}`, {
        cwd: ROOT,
        stdio: 'inherit',
        encoding: 'utf8'
      });
      
      step.status = 'success';
      step.endTime = new Date();
      step.duration = step.endTime - step.startTime;
      
      this.stats.success++;
      this.stats.steps.push(step);
      
      console.log(`✅ ${scriptName} completed successfully`);
      
      // Valider après chaque étape
      if (!this.validate()) {
        throw new Error('Validation failed after enrichment');
      }
      
      return true;
      
    } catch (error) {
      step.status = 'failed';
      step.error = error.message;
      step.endTime = new Date();
      
      this.stats.failed++;
      this.stats.errors.push({
        script: scriptName,
        error: error.message
      });
      this.stats.steps.push(step);
      
      console.log(`❌ ${scriptName} failed:`, error.message);
      
      return false;
    }
  }
  
  /**
   * Restaurer depuis backup
   */
  restoreFromBackup(backupPath) {
    console.log('\n⚠️  ROLLBACK: Restoring from backup...');
    
    const criticalDirs = ['drivers', 'lib', 'app.json', 'package.json'];
    
    for (const dir of criticalDirs) {
      const src = path.join(backupPath, dir);
      const dest = path.join(ROOT, dir);
      
      if (fs.existsSync(src)) {
        // Delete current
        if (fs.existsSync(dest)) {
          fs.rmSync(dest, { recursive: true, force: true });
        }
        
        // Restore backup
        this.copyRecursive(src, dest);
        console.log(`  ✓ Restored: ${dir}`);
      }
    }
    
    console.log('✅ Rollback completed\n');
  }
  
  /**
   * Générer rapport
   */
  generateReport() {
    console.log('\n' + '='.repeat(60));
    console.log('📊 ENRICHMENT REPORT');
    console.log('='.repeat(60));
    
    console.log(`\n⏱️  Duration: ${new Date() - this.stats.started}ms`);
    console.log(`✅ Success: ${this.stats.success}`);
    console.log(`❌ Failed: ${this.stats.failed}`);
    console.log(`⚠️  Warnings: ${this.stats.warnings.length}`);
    
    if (this.stats.errors.length > 0) {
      console.log('\n❌ ERRORS:');
      this.stats.errors.forEach(err => {
        console.log(`  - ${err.script}: ${err.error}`);
      });
    }
    
    console.log('\n📝 STEPS:');
    this.stats.steps.forEach(step => {
      const icon = step.status === 'success' ? '✅' : '❌';
      const duration = step.duration ? ` (${step.duration}ms)` : '';
      console.log(`  ${icon} ${step.script}${duration}`);
    });
    
    console.log('\n' + '='.repeat(60));
  }
  
  /**
   * Pipeline d'enrichissement intelligent
   */
  async run() {
    console.log('🎯 INTELLIGENT ENRICHMENT - SAFE MODE\n');
    
    // 1. Validation initiale
    console.log('📋 Step 1: Initial validation');
    if (!this.validate()) {
      console.log('❌ Project has validation errors. Fix them first!');
      return false;
    }
    
    // 2. Backup
    console.log('📋 Step 2: Creating backup');
    const backupPath = this.createBackup();
    
    // 3. Liste des enrichissements à exécuter (ordre intelligent)
    const enrichments = [
      {
        script: 'scripts/automation/generate-device-matrix.js',
        description: 'Generate device compatibility matrix',
        critical: false
      },
      {
        script: 'scripts/enrichment/intelligent-driver-enrichment.js',
        description: 'Intelligent driver metadata enrichment',
        critical: true
      },
      {
        script: 'scripts/enrichment/SIMPLE_FLOW_ENRICHMENT.js',
        description: 'Add flow cards to drivers',
        critical: false
      },
      {
        script: 'scripts/automation/generate-drivers-list.js',
        description: 'Update README with drivers list',
        critical: false
      }
    ];
    
    // 4. Exécution séquentielle avec validation
    console.log('\n📋 Step 3: Running enrichments\n');
    
    let allSuccess = true;
    let criticalFailed = false;
    
    for (const enrichment of enrichments) {
      const success = this.runEnrichmentScript(
        enrichment.script,
        enrichment.description
      );
      
      if (!success) {
        allSuccess = false;
        
        if (enrichment.critical) {
          criticalFailed = true;
          console.log(`\n⚠️  CRITICAL FAILURE: ${enrichment.script}`);
          break;
        } else {
          console.log(`\n⚠️  Non-critical failure: ${enrichment.script} - continuing...`);
        }
      }
    }
    
    // 5. Rollback si échec critique
    if (criticalFailed) {
      console.log('\n❌ CRITICAL FAILURE DETECTED');
      this.restoreFromBackup(backupPath);
      this.generateReport();
      return false;
    }
    
    // 6. Validation finale
    console.log('\n📋 Step 4: Final validation');
    if (!this.validate()) {
      console.log('❌ Final validation failed - rolling back');
      this.restoreFromBackup(backupPath);
      this.generateReport();
      return false;
    }
    
    // 7. Rapport
    this.generateReport();
    
    if (allSuccess) {
      console.log('\n✅ ALL ENRICHMENTS COMPLETED SUCCESSFULLY!');
      console.log(`📦 Backup available at: ${backupPath}`);
      console.log('\nℹ️  You can safely commit these changes.');
      return true;
    } else {
      console.log('\n⚠️  SOME ENRICHMENTS FAILED (non-critical)');
      console.log(`📦 Backup available at: ${backupPath}`);
      console.log('\nℹ️  Review the changes before committing.');
      return false;
    }
  }
}

// Main
async function main() {
  const enrichment = new IntelligentEnrichment();
  const success = await enrichment.run();
  
  process.exit(success ? 0 : 1);
}

main().catch(err => {
  console.error('Fatal error:', err);
  process.exit(1);
});
