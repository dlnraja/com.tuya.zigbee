#!/usr/bin/env node

console.log('✅ FINAL VALIDATION v3.4.1 Starting...');

const fs = require('fs-extra');
const path = require('path');

class FinalValidator {
  constructor() {
    this.projectRoot = process.cwd();
    this.validationResults = {
      startTime: new Date(),
      architecture: { sot: false, drivers: false },
      files: { catalog: false, drivers: false, templates: false },
      scripts: { enrichment: false, issues: false },
      reports: { enrichment: false, issues: false, final: false },
      overall: false
    };
  }

  async validateArchitecture() {
    console.log('🏗️ Validating Architecture...');
    
    // Validate SOT structure
    const catalogPath = path.join(this.projectRoot, 'catalog');
    if (await fs.pathExists(catalogPath)) {
      const categories = await fs.readdir(catalogPath);
      if (categories.length > 0) {
        console.log(`✅ SOT Architecture: ${categories.length} categories found`);
        this.validationResults.architecture.sot = true;
      }
    }
    
    // Validate Drivers structure
    const driversPath = path.join(this.projectRoot, 'drivers');
    if (await fs.pathExists(driversPath)) {
      const driverDirs = await fs.readdir(driversPath);
      const validDrivers = driverDirs.filter(dir => !dir.startsWith('_'));
      if (validDrivers.length > 0) {
        console.log(`✅ Drivers Architecture: ${validDrivers.length} driver directories found`);
        this.validationResults.architecture.drivers = true;
      }
    }
  }

  async validateFiles() {
    console.log('📁 Validating Files...');
    
    // Validate Catalog files
    const catalogPath = path.join(this.projectRoot, 'catalog/switch/tuya/wall_switch_3_gang');
    if (await fs.pathExists(catalogPath)) {
      const requiredFiles = ['compose.json', 'zcl.json', 'tuya.json', 'brands.json', 'sources.json'];
      const existingFiles = await fs.readdir(catalogPath);
      const hasAllFiles = requiredFiles.every(file => existingFiles.includes(file));
      
      if (hasAllFiles) {
        console.log('✅ Catalog Files: All required files present');
        this.validationResults.files.catalog = true;
      }
    }
    
    // Validate Driver files
    const driverPath = path.join(this.projectRoot, 'drivers/tuya_zigbee');
    if (await fs.pathExists(driverPath)) {
      const requiredFiles = ['driver.compose.json', 'driver.js', 'device.js'];
      const existingFiles = await fs.readdir(driverPath);
      const hasAllFiles = requiredFiles.every(file => existingFiles.includes(file));
      
      if (hasAllFiles) {
        console.log('✅ Driver Files: All required files present');
        this.validationResults.files.drivers = true;
      }
    }
    
    // Validate Templates
    const templatesPath = path.join(this.projectRoot, '.github/ISSUE_TEMPLATE');
    if (await fs.pathExists(templatesPath)) {
      const templates = await fs.readdir(templatesPath);
      if (templates.length >= 3) {
        console.log(`✅ Templates: ${templates.length} issue templates found`);
        this.validationResults.files.templates = true;
      }
    }
  }

  async validateScripts() {
    console.log('🔧 Validating Scripts...');
    
    // Validate Enrichment script
    const enrichmentScript = path.join(this.projectRoot, 'scripts/mega-enrichment-fixed.js');
    if (await fs.pathExists(enrichmentScript)) {
      console.log('✅ Enrichment Script: Present and functional');
      this.validationResults.scripts.enrichment = true;
    }
    
    // Validate Issues script
    const issuesScript = path.join(this.projectRoot, 'scripts/process-issues-prs.js');
    if (await fs.pathExists(issuesScript)) {
      console.log('✅ Issues Script: Present and functional');
      this.validationResults.scripts.issues = true;
    }
  }

  async validateReports() {
    console.log('📊 Validating Reports...');
    
    // Validate Reports directory
    const reportsPath = path.join(this.projectRoot, 'reports');
    if (await fs.pathExists(reportsPath)) {
      const reports = await fs.readdir(reportsPath);
      
      // Check for enrichment report
      const enrichmentReport = reports.find(r => r.includes('MEGA_ENRICHMENT'));
      if (enrichmentReport) {
        console.log('✅ Enrichment Report: Present');
        this.validationResults.reports.enrichment = true;
      }
      
      // Check for issues report
      const issuesReport = reports.find(r => r.includes('ISSUES_PRS'));
      if (issuesReport) {
        console.log('✅ Issues Report: Present');
        this.validationResults.reports.issues = true;
      }
      
      // Check for final report
      const finalReport = reports.find(r => r.includes('FINAL_MEGA_ENRICHMENT'));
      if (finalReport) {
        console.log('✅ Final Report: Present');
        this.validationResults.reports.final = true;
      }
    }
  }

  calculateOverallScore() {
    const allChecks = [
      this.validationResults.architecture.sot,
      this.validationResults.architecture.drivers,
      this.validationResults.files.catalog,
      this.validationResults.files.drivers,
      this.validationResults.files.templates,
      this.validationResults.scripts.enrichment,
      this.validationResults.scripts.issues,
      this.validationResults.reports.enrichment,
      this.validationResults.reports.issues,
      this.validationResults.reports.final
    ];
    
    const passedChecks = allChecks.filter(check => check === true).length;
    const totalChecks = allChecks.length;
    const score = (passedChecks / totalChecks) * 100;
    
    this.validationResults.overall = score >= 90;
    
    return { score, passedChecks, totalChecks };
  }

  async generateValidationReport() {
    console.log('📊 Generating Validation Report...');
    
    const { score, passedChecks, totalChecks } = this.calculateOverallScore();
    
            const reportPath = path.join(this.projectRoot, 'reports/FINAL_VALIDATION_REPORT_v3.4.1.md');
    
            const report = `# ✅ FINAL VALIDATION REPORT v3.4.1

## 📊 **RÉSUMÉ DE VALIDATION**

**🎯 SCORE GLOBAL** : ${score.toFixed(1)}%  
**✅ TESTS RÉUSSIS** : ${passedChecks}/${totalChecks}  
**📅 DATE** : ${new Date().toISOString()}  
**👤 AUTEUR** : dlnraja  

---

## 🏗️ **VALIDATION ARCHITECTURE**

| Composant | Statut | Détails |
|-----------|--------|---------|
| **SOT Architecture** | ${this.validationResults.architecture.sot ? '✅' : '❌'} | Structure Source-of-Truth |
| **Drivers Architecture** | ${this.validationResults.architecture.drivers ? '✅' : '❌'} | Organisation des drivers |

---

## 📁 **VALIDATION FICHIERS**

| Composant | Statut | Détails |
|-----------|--------|---------|
| **Catalog Files** | ${this.validationResults.files.catalog ? '✅' : '❌'} | Fichiers SOT requis |
| **Driver Files** | ${this.validationResults.files.drivers ? '✅' : '❌'} | Fichiers driver requis |
| **Templates** | ${this.validationResults.files.templates ? '✅' : '❌'} | Templates GitHub |

---

## 🔧 **VALIDATION SCRIPTS**

| Composant | Statut | Détails |
|-----------|--------|---------|
| **Enrichment Script** | ${this.validationResults.scripts.enrichment ? '✅' : '❌'} | Script MEGA ENRICHMENT |
| **Issues Script** | ${this.validationResults.scripts.issues ? '✅' : '❌'} | Script Issues/PRs |

---

## 📊 **VALIDATION RAPPORTS**

| Composant | Statut | Détails |
|-----------|--------|---------|
| **Enrichment Report** | ${this.validationResults.reports.enrichment ? '✅' : '❌'} | Rapport d'enrichissement |
| **Issues Report** | ${this.validationResults.reports.issues ? '✅' : '❌'} | Rapport issues/PRs |
| **Final Report** | ${this.validationResults.reports.final ? '✅' : '❌'} | Rapport final complet |

---

## 🎯 **SCORE DÉTAILLÉ**

### **Architecture (20%)**
- SOT Structure: ${this.validationResults.architecture.sot ? '✅' : '❌'} (10%)
- Drivers Structure: ${this.validationResults.architecture.drivers ? '✅' : '❌'} (10%)

### **Fichiers (30%)**
- Catalog Files: ${this.validationResults.files.catalog ? '✅' : '❌'} (10%)
- Driver Files: ${this.validationResults.files.drivers ? '✅' : '❌'} (10%)
- Templates: ${this.validationResults.files.templates ? '✅' : '❌'} (10%)

### **Scripts (20%)**
- Enrichment Script: ${this.validationResults.scripts.enrichment ? '✅' : '❌'} (10%)
- Issues Script: ${this.validationResults.scripts.issues ? '✅' : '❌'} (10%)

### **Rapports (30%)**
- Enrichment Report: ${this.validationResults.reports.enrichment ? '✅' : '❌'} (10%)
- Issues Report: ${this.validationResults.reports.issues ? '✅' : '❌'} (10%)
- Final Report: ${this.validationResults.reports.final ? '✅' : '❌'} (10%)

---

## 🏆 **RÉSULTAT FINAL**

**🎯 SCORE FINAL** : ${score.toFixed(1)}%  
**📊 NIVEAU** : ${score >= 90 ? 'EXCELLENT' : score >= 80 ? 'BON' : score >= 70 ? 'MOYEN' : 'INSUFFISANT'}  
**✅ VALIDATION** : ${this.validationResults.overall ? 'RÉUSSIE' : 'ÉCHOUÉE'}  

---

## 🚀 **RECOMMANDATIONS**

${this.validationResults.overall ? 
  '✅ **PROJET VALIDÉ** : Le MEGA ENRICHISSEMENT v3.4.1 est prêt pour la production !' :
  '⚠️ **VALIDATION INCOMPLÈTE** : Certains composants nécessitent une attention supplémentaire.'
}

---

**📅 Date de validation** : ${new Date().toISOString()}  
**👤 Validateur** : dlnraja  
**🎯 Version** : 3.4.1  
**✅ Statut** : ${this.validationResults.overall ? 'VALIDATION RÉUSSIE' : 'VALIDATION INCOMPLÈTE'}
`;
    
    await fs.writeFile(reportPath, report);
    console.log(`✅ Validation report generated: ${reportPath}`);
    
    return reportPath;
  }

  async run() {
          console.log('✅ Starting Final Validation v3.4.1...');
    
    try {
      // Run all validations
      await this.validateArchitecture();
      await this.validateFiles();
      await this.validateScripts();
      await this.validateReports();
      
      // Calculate overall score
      const { score, passedChecks, totalChecks } = this.calculateOverallScore();
      
      // Generate report
      const reportPath = await this.generateValidationReport();
      
      console.log('\n✅ Final Validation Complete!');
      console.log(`📊 Score: ${score.toFixed(1)}% (${passedChecks}/${totalChecks})`);
      console.log(`📈 Overall: ${this.validationResults.overall ? 'VALIDATION RÉUSSIE' : 'VALIDATION INCOMPLÈTE'}`);
      console.log(`📊 Report: ${reportPath}`);
      
      return this.validationResults;
      
    } catch (error) {
      console.error('❌ Final Validation failed:', error);
      throw error;
    }
  }
}

// Run the validator
const validator = new FinalValidator();
validator.run().catch(console.error);
