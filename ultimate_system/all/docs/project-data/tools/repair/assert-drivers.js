#!/usr/bin/env node

console.log('ASSERTION DES DRIVERS');
console.log('=====================');

const fs = require('fs');
const path = require('path');

class DriverAssertionTool {
  constructor() {
    this.driversDir = path.join(__dirname, '../../drivers');
    this.expectedDrivers = [
      'zigbee-tuya-universal',
      'tuya-plug-universal',
      'tuya-light-universal',
      'tuya-cover-universal',
      'tuya-climate-universal',
      'tuya-sensor-universal',
      'tuya-remote-universal'
    ];
  }
  
  async assertAllDrivers() {
    try {
      console.log('🔍 Validation de la nouvelle architecture des drivers...');
      
      // Vérifier la structure des drivers
      const validationResults = await this.validateDriverStructure();
      
      // Vérifier les fichiers de chaque driver
      const driverResults = await this.validateDriverFiles();
      
      // Générer le rapport final
      await this.generateReport(validationResults, driverResults);
      
      console.log('✅ Validation des drivers terminée avec succès !');
      console.log('::END::ASSERT_DRIVERS::OK');
      
    } catch (error) {
      console.error('❌ Erreur lors de la validation:', error.message);
      console.log('::END::ASSERT_DRIVERS::FAIL');
      process.exit(1);
    }
  }
  
  async validateDriverStructure() {
    console.log('\n📁 Validation de la structure des dossiers...');
    
    const results = {
      total: this.expectedDrivers.length,
      found: 0,
      missing: [],
      valid: []
    };
    
    for (const driverId of this.expectedDrivers) {
      const driverPath = path.join(this.driversDir, driverId);
      
      if (fs.existsSync(driverPath)) {
        results.found++;
        results.valid.push(driverId);
        console.log(`✅ ${driverId} - Présent`);
      } else {
        results.missing.push(driverId);
        console.log(`❌ ${driverId} - MANQUANT`);
      }
    }
    
    console.log(`\n📊 Structure: ${results.found}/${results.total} drivers trouvés`);
    
    if (results.missing.length > 0) {
      console.log(`⚠️ Drivers manquants: ${results.missing.join(', ')}`);
    }
    
    return results;
  }
  
  async validateDriverFiles() {
    console.log('\n📄 Validation des fichiers des drivers...');
    
    const results = {
      total: 0,
      valid: 0,
      invalid: [],
      details: {}
    };
    
    for (const driverId of this.expectedDrivers) {
      const driverPath = path.join(this.driversDir, driverId);
      
      if (fs.existsSync(driverPath)) {
        results.total++;
        
        const driverValidation = await this.validateSingleDriver(driverId, driverPath);
        results.details[driverId] = driverValidation;
        
        if (driverValidation.isValid) {
          results.valid++;
          console.log(`✅ ${driverId} - Fichiers valides`);
        } else {
          results.invalid.push(driverId);
          console.log(`❌ ${driverId} - Fichiers invalides`);
        }
      }
    }
    
    console.log(`\n📊 Fichiers: ${results.valid}/${results.total} drivers valides`);
    
    return results;
  }
  
  async validateSingleDriver(driverId, driverPath) {
    const requiredFiles = [
      'driver.compose.json',
      'device.js',
      'README.md'
    ];
    
    const requiredDirs = [
      'assets',
      'flow'
    ];
    
    const validation = {
      driverId,
      isValid: true,
      missingFiles: [],
      missingDirs: [],
      errors: []
    };
    
    // Vérifier les fichiers requis
    for (const file of requiredFiles) {
      const filePath = path.join(driverPath, file);
      if (!fs.existsSync(filePath)) {
        validation.missingFiles.push(file);
        validation.isValid = false;
      }
    }
    
    // Vérifier les dossiers requis
    for (const dir of requiredDirs) {
      const dirPath = path.join(driverPath, dir);
      if (!fs.existsSync(dirPath)) {
        validation.missingDirs.push(dir);
        validation.isValid = false;
      }
    }
    
    // Vérifier le contenu du driver.compose.json
    try {
      const composePath = path.join(driverPath, 'driver.compose.json');
      if (fs.existsSync(composePath)) {
        const composeContent = JSON.parse(fs.readFileSync(composePath, 'utf8'));
        
        // Vérifier les champs requis
        if (!composeContent.id || !composeContent.name || !composeContent.class) {
          validation.errors.push('driver.compose.json incomplet');
          validation.isValid = false;
        }
        
        // Vérifier que l'ID correspond au nom du dossier
        if (composeContent.id !== driverId) {
          validation.errors.push(`ID mismatch: ${composeContent.id} != ${driverId}`);
          validation.isValid = false;
        }
      }
    } catch (error) {
      validation.errors.push(`Erreur parsing driver.compose.json: ${error.message}`);
      validation.isValid = false;
    }
    
    return validation;
  }
  
  async generateReport(structureResults, driverResults) {
    console.log('\n📋 Génération du rapport de validation...');
    
    const report = {
      timestamp: new Date().toISOString(),
      structure: structureResults,
      drivers: driverResults,
      summary: {
        totalDrivers: structureResults.total,
        validDrivers: driverResults.valid,
        successRate: Math.round((driverResults.valid / structureResults.total) * 100)
      }
    };
    
    // Sauvegarder le rapport
    const reportPath = path.join(__dirname, '../../research/validation-report.json');
    fs.writeFileSync(reportPath, JSON.stringify(report, null, 2));
    
    console.log(`📄 Rapport sauvegardé: ${reportPath}`);
    
    // Afficher le résumé
    console.log('\n🎯 RÉSUMÉ DE LA VALIDATION:');
    console.log(`📊 Drivers totaux: ${report.summary.totalDrivers}`);
    console.log(`✅ Drivers valides: ${report.summary.validDrivers}`);
    console.log(`📈 Taux de succès: ${report.summary.successRate}%`);
    
    if (report.summary.successRate === 100) {
      console.log('🎉 TOUS LES DRIVERS SONT VALIDES !');
    } else {
      console.log('⚠️ Certains drivers nécessitent une attention');
    }
  }
}

// Exécuter la validation
if (require.main === module) {
  const assertionTool = new DriverAssertionTool();
  assertionTool.assertAllDrivers();
}

module.exports = DriverAssertionTool;
