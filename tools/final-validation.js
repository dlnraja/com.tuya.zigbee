#!/usr/bin/env node
'use strict';

const fs = require('fs');
const path = require('path');
const { spawnSync } = require('child_process');

class FinalValidator {
  constructor() {
    this.results = {
      timestamp: new Date().toISOString(),
      checks: {},
      summary: { total: 0, passed: 0, failed: 0, warnings: 0 }
    };
  }

  async runAllChecks() {
    console.log('🔍 VALIDATION FINALE COMPLÈTE DU PROJET');
    console.log('='.repeat(60));

    await this.checkDriverStructure();
    await this.validateAllJSON();
    await this.checkTranslations();
    await this.validateHomeyApp();
    await this.checkMatrices();
    await this.checkReferences();
    await this.checkDashboard();
    await this.checkGitHubActions();
    
    this.generateFinalReport();
    this.saveResults();
  }

  async checkDriverStructure() {
    console.log('\n📁 Vérification de la structure des drivers...');
    this.results.checks.driverStructure = { passed: 0, failed: 0, issues: [] };
    
    const driversDir = 'drivers';
    if (!fs.existsSync(driversDir)) {
      this.addIssue('driverStructure', 'CRITICAL', 'Dossier drivers/ manquant');
      return;
    }

    let totalDrivers = 0;
    let validDrivers = 0;
    
    const scanDrivers = (dir) => {
      try {
        const items = fs.readdirSync(dir);
        for (const item of items) {
          const fullPath = path.join(dir, item);
          const stat = fs.statSync(fullPath);
          
          if (stat.isDirectory()) {
            const hasCompose = fs.existsSync(path.join(fullPath, 'driver.compose.json'));
            const hasDriver = fs.existsSync(path.join(fullPath, 'driver.json'));
            
            if (hasCompose || hasDriver) {
              totalDrivers++;
              const hasDevice = fs.existsSync(path.join(fullPath, 'device.js'));
              const hasIcon = fs.existsSync(path.join(fullPath, 'assets/icon.svg'));
              
              if (hasDevice && hasIcon) {
                validDrivers++;
              } else {
                this.addIssue('driverStructure', 'WARNING', 
                  `Driver ${fullPath} incomplet: device.js=${hasDevice}, icon=${hasIcon}`);
              }
            }
            scanDrivers(fullPath);
          }
        }
      } catch (error) {
        this.addIssue('driverStructure', 'ERROR', `Erreur scan ${dir}: ${error.message}`);
      }
    };
    
    scanDrivers(driversDir);
    
    this.results.checks.driverStructure.total = totalDrivers;
    this.results.checks.driverStructure.valid = validDrivers;
    
    if (validDrivers === totalDrivers) {
      console.log(`✅ Structure des drivers: ${validDrivers}/${totalDrivers} valides`);
      this.results.summary.passed++;
    } else {
      console.log(`⚠️ Structure des drivers: ${validDrivers}/${totalDrivers} valides`);
      this.results.summary.warnings++;
    }
    this.results.summary.total++;
  }

  async validateAllJSON() {
    console.log('\n🔍 Validation de tous les fichiers JSON...');
    this.results.checks.jsonValidation = { passed: 0, failed: 0, issues: [] };
    
    const jsonFiles = this.findJsonFiles('.');
    let validFiles = 0;
    
    for (const file of jsonFiles) {
      try {
        const content = fs.readFileSync(file, 'utf8');
        JSON.parse(content);
        validFiles++;
      } catch (error) {
        this.addIssue('jsonValidation', 'ERROR', `${file}: ${error.message}`);
      }
    }
    
    this.results.checks.jsonValidation.total = jsonFiles.length;
    this.results.checks.jsonValidation.valid = validFiles;
    
    if (validFiles === jsonFiles.length) {
      console.log(`✅ Validation JSON: ${validFiles}/${jsonFiles.length} valides`);
      this.results.summary.passed++;
    } else {
      console.log(`❌ Validation JSON: ${validFiles}/${jsonFiles.length} valides`);
      this.results.summary.failed++;
    }
    this.results.summary.total++;
  }

  findJsonFiles(dir, excludeDirs = ['node_modules', '.git', 'dumps']) {
    const files = [];
    
    const scan = (currentDir) => {
      if (excludeDirs.some(exclude => currentDir.includes(exclude))) return;
      
      try {
        const items = fs.readdirSync(currentDir);
        for (const item of items) {
          const fullPath = path.join(currentDir, item);
          const stat = fs.statSync(fullPath);
          
          if (stat.isDirectory()) {
            scan(fullPath);
          } else if (item.endsWith('.json')) {
            files.push(fullPath);
          }
        }
      } catch (error) {
        // Ignorer les erreurs de permission
      }
    };
    
    scan(dir);
    return files;
  }

  async checkTranslations() {
    console.log('\n🌍 Vérification des traductions...');
    this.results.checks.translations = { passed: 0, failed: 0, issues: [] };
    
    const driversDir = 'drivers';
    let totalDrivers = 0;
    let translatedDrivers = 0;
    
    const scanTranslations = (dir) => {
      try {
        const items = fs.readdirSync(dir);
        for (const item of items) {
          const fullPath = path.join(dir, item);
          const stat = fs.statSync(fullPath);
          
          if (stat.isDirectory()) {
            const composeFile = path.join(fullPath, 'driver.compose.json');
            if (fs.existsSync(composeFile)) {
              totalDrivers++;
              
              try {
                const compose = JSON.parse(fs.readFileSync(composeFile, 'utf8'));
                if (compose.name && compose.name.fr && compose.name.en) {
                  translatedDrivers++;
                } else {
                  this.addIssue('translations', 'WARNING', 
                    `Driver ${fullPath} sans traductions complètes`);
                }
              } catch (error) {
                this.addIssue('translations', 'ERROR', 
                  `Erreur lecture ${composeFile}: ${error.message}`);
              }
            }
            scanTranslations(fullPath);
          }
        }
      } catch (error) {
        // Ignorer les erreurs
      }
    };
    
    scanTranslations(driversDir);
    
    this.results.checks.translations.total = totalDrivers;
    this.results.checks.translations.translated = translatedDrivers;
    
    const translationRatio = totalDrivers > 0 ? (translatedDrivers / totalDrivers) * 100 : 0;
    
    if (translationRatio >= 90) {
      console.log(`✅ Traductions: ${translatedDrivers}/${totalDrivers} (${translationRatio.toFixed(1)}%)`);
      this.results.summary.passed++;
    } else if (translationRatio >= 70) {
      console.log(`⚠️ Traductions: ${translatedDrivers}/${totalDrivers} (${translationRatio.toFixed(1)}%)`);
      this.results.summary.warnings++;
    } else {
      console.log(`❌ Traductions: ${translatedDrivers}/${totalDrivers} (${translationRatio.toFixed(1)}%)`);
      this.results.summary.failed++;
    }
    this.results.summary.total++;
  }

  async validateHomeyApp() {
    console.log('\n🏠 Validation de l\'application Homey...');
    this.results.checks.homeyValidation = { passed: 0, failed: 0, issues: [] };
    
    try {
      const result = spawnSync('homey', ['app', 'validate', '-l', 'debug'], { 
        encoding: 'utf8',
        timeout: 60000
      });
      
      const output = (result.stdout || '') + (result.stderr || '');
      
      if (result.status === 0) {
        if (output.includes('✓') || output.includes('All good')) {
          console.log('✅ Validation Homey réussie');
          this.results.checks.homeyValidation.passed = 1;
          this.results.summary.passed++;
        } else {
          console.log('⚠️ Validation Homey avec avertissements');
          this.results.checks.homeyValidation.warnings = 1;
          this.results.summary.warnings++;
        }
      } else {
        console.log('❌ Validation Homey échouée');
        this.results.checks.homeyValidation.failed = 1;
        this.results.summary.failed++;
        this.addIssue('homeyValidation', 'ERROR', `Status: ${result.status}`);
      }
    } catch (error) {
      console.log(`❌ Erreur validation Homey: ${error.message}`);
      this.results.checks.homeyValidation.failed = 1;
      this.results.summary.failed++;
      this.addIssue('homeyValidation', 'ERROR', error.message);
    }
    
    this.results.summary.total++;
  }

  async checkMatrices() {
    console.log('\n📊 Vérification des matrices...');
    this.results.checks.matrices = { passed: 0, failed: 0, issues: [] };
    
    const matrixFiles = ['matrices/driver_matrix.json', 'matrices/capability_matrix.json'];
    let validMatrices = 0;
    
    for (const file of matrixFiles) {
      if (fs.existsSync(file)) {
        try {
          const matrix = JSON.parse(fs.readFileSync(file, 'utf8'));
          if (matrix && Object.keys(matrix).length > 0) {
            validMatrices++;
          } else {
            this.addIssue('matrices', 'WARNING', `${file} vide ou invalide`);
          }
        } catch (error) {
          this.addIssue('matrices', 'ERROR', `${file}: ${error.message}`);
        }
      } else {
        this.addIssue('matrices', 'ERROR', `${file} manquant`);
      }
    }
    
    this.results.checks.matrices.total = matrixFiles.length;
    this.results.checks.matrices.valid = validMatrices;
    
    if (validMatrices === matrixFiles.length) {
      console.log(`✅ Matrices: ${validMatrices}/${matrixFiles.length} valides`);
      this.results.summary.passed++;
    } else {
      console.log(`❌ Matrices: ${validMatrices}/${matrixFiles.length} valides`);
      this.results.summary.failed++;
    }
    this.results.summary.total++;
  }

  async checkReferences() {
    console.log('\n🔗 Vérification des références...');
    this.results.checks.references = { passed: 0, failed: 0, issues: [] };
    
    const refFiles = ['references/capabilities.json', 'references/classes.json'];
    let validRefs = 0;
    
    for (const file of refFiles) {
      if (fs.existsSync(file)) {
        try {
          const ref = JSON.parse(fs.readFileSync(file, 'utf8'));
          if (ref && Object.keys(ref).length > 0) {
            validRefs++;
          } else {
            this.addIssue('references', 'WARNING', `${file} vide ou invalide`);
          }
        } catch (error) {
          this.addIssue('references', 'ERROR', `${file}: ${error.message}`);
        }
      } else {
        this.addIssue('references', 'ERROR', `${file} manquant`);
      }
    }
    
    this.results.checks.references.total = refFiles.length;
    this.results.checks.references.valid = validRefs;
    
    if (validRefs === refFiles.length) {
      console.log(`✅ Références: ${validRefs}/${refFiles.length} valides`);
      this.results.summary.passed++;
    } else {
      console.log(`❌ Références: ${validRefs}/${refFiles.length} valides`);
      this.results.summary.failed++;
    }
    this.results.summary.total++;
  }

  async checkDashboard() {
    console.log('\n📈 Vérification du dashboard...');
    this.results.checks.dashboard = { passed: 0, failed: 0, issues: [] };
    
    const dashboardFiles = ['docs/data/drivers.json', 'dashboard/index.html'];
    let validDashboard = 0;
    
    for (const file of dashboardFiles) {
      if (fs.existsSync(file)) {
        if (file.endsWith('.json')) {
          try {
            const data = JSON.parse(fs.readFileSync(file, 'utf8'));
            if (data && Object.keys(data).length > 0) {
              validDashboard++;
            } else {
              this.addIssue('dashboard', 'WARNING', `${file} vide ou invalide`);
            }
          } catch (error) {
            this.addIssue('dashboard', 'ERROR', `${file}: ${error.message}`);
          }
        } else {
          validDashboard++;
        }
      } else {
        this.addIssue('dashboard', 'ERROR', `${file} manquant`);
      }
    }
    
    this.results.checks.dashboard.total = dashboardFiles.length;
    this.results.checks.dashboard.valid = validDashboard;
    
    if (validDashboard === dashboardFiles.length) {
      console.log(`✅ Dashboard: ${validDashboard}/${dashboardFiles.length} valides`);
      this.results.summary.passed++;
    } else {
      console.log(`❌ Dashboard: ${validDashboard}/${dashboardFiles.length} valides`);
      this.results.summary.failed++;
    }
    this.results.summary.total++;
  }

  async checkGitHubActions() {
    console.log('\n⚡ Vérification des GitHub Actions...');
    this.results.checks.githubActions = { passed: 0, failed: 0, issues: [] };
    
    const workflowsDir = '.github/workflows';
    if (!fs.existsSync(workflowsDir)) {
      this.addIssue('githubActions', 'ERROR', 'Dossier .github/workflows manquant');
      this.results.summary.failed++;
      this.results.summary.total++;
      return;
    }
    
    const workflowFiles = fs.readdirSync(workflowsDir).filter(f => f.endsWith('.yml'));
    let validWorkflows = 0;
    
    for (const file of workflowFiles) {
      try {
        const content = fs.readFileSync(path.join(workflowsDir, file), 'utf8');
        if (content.includes('name:') && content.includes('on:')) {
          validWorkflows++;
        } else {
          this.addIssue('githubActions', 'WARNING', `${file} structure invalide`);
        }
      } catch (error) {
        this.addIssue('githubActions', 'ERROR', `${file}: ${error.message}`);
      }
    }
    
    this.results.checks.githubActions.total = workflowFiles.length;
    this.results.checks.githubActions.valid = validWorkflows;
    
    if (validWorkflows > 0) {
      console.log(`✅ GitHub Actions: ${validWorkflows}/${workflowFiles.length} valides`);
      this.results.summary.passed++;
    } else {
      console.log(`❌ GitHub Actions: ${validWorkflows}/${workflowFiles.length} valides`);
      this.results.summary.failed++;
    }
    this.results.summary.total++;
  }

  addIssue(checkType, level, message) {
    if (!this.results.checks[checkType].issues) {
      this.results.checks[checkType].issues = [];
    }
    this.results.checks[checkType].issues.push({ level, message, timestamp: new Date().toISOString() });
  }

  generateFinalReport() {
    console.log('\n📋 RAPPORT FINAL DE VALIDATION');
    console.log('='.repeat(60));
    
    const { total, passed, failed, warnings } = this.results.summary;
    const successRate = total > 0 ? (passed / total) * 100 : 0;
    
    console.log(`📊 Résumé global: ${passed}/${total} tests réussis (${successRate.toFixed(1)}%)`);
    console.log(`✅ Succès: ${passed}`);
    console.log(`⚠️ Avertissements: ${warnings}`);
    console.log(`❌ Échecs: ${failed}`);
    
    if (failed === 0 && warnings === 0) {
      console.log('\n🎉 PROJET PARFAIT ! Tous les tests sont passés.');
    } else if (failed === 0) {
      console.log('\n✅ PROJET VALIDE ! Quelques avertissements mineurs.');
    } else {
      console.log('\n⚠️ PROJET AVEC PROBLÈMES ! Des corrections sont nécessaires.');
    }
  }

  saveResults() {
    const resultsFile = `FINAL_VALIDATION_REPORT_${new Date().toISOString().slice(0, 19).replace(/:/g, '-')}.json`;
    fs.writeFileSync(resultsFile, JSON.stringify(this.results, null, 2));
    console.log(`\n💾 Rapport sauvegardé: ${resultsFile}`);
  }
}

// Exécution principale
if (require.main === module) {
  const validator = new FinalValidator();
  validator.runAllChecks().catch(console.error);
}

module.exports = FinalValidator;
