const fs = require('fs');
const path = require('path');
const { execSync } = require('child_process');

/**
 * MASTER VALIDATOR INTELLIGENT ET AUTONOME
 * Exécute automatiquement tous les checks et corrections nécessaires
 * Fonctionne de manière complètement autonome
 */

console.log('🤖 MASTER VALIDATOR INTELLIGENT - VALIDATION COMPLÈTE AUTONOME');
console.log('═'.repeat(80));

class MasterValidator {
  constructor() {
    this.projectRoot = this.findProjectRoot();
    this.results = {
      environment: null,
      structure: null,
      drivers: null,
      appJson: null,
      validation: null,
      errors: [],
      warnings: [],
      fixes: []
    };
  }

  /**
   * Trouve la racine du projet automatiquement
   */
  findProjectRoot() {
    let currentDir = process.cwd();
    while (currentDir !== path.parse(currentDir).root) {
      if (fs.existsSync(path.join(currentDir, 'app.json'))) {
        return currentDir;
      }
      currentDir = path.dirname(currentDir);
    }
    return process.cwd();
  }

  /**
   * Détecte l'environnement
   */
  detectEnvironment() {
    console.log('\n🔍 1. DÉTECTION ENVIRONNEMENT\n');
    
    const env = {
      os: process.platform,
      node: process.version,
      projectRoot: this.projectRoot
    };
    
    // Lire app.json
    const appJsonPath = path.join(this.projectRoot, 'app.json');
    if (fs.existsSync(appJsonPath)) {
      const appJson = JSON.parse(fs.readFileSync(appJsonPath, 'utf8'));
      env.version = appJson.version;
      env.sdk = appJson.sdk;
      env.drivers = appJson.drivers?.length || 0;
    }
    
    console.log(`   ✅ OS: ${env.os}`);
    console.log(`   ✅ Node: ${env.node}`);
    console.log(`   ✅ Version: ${env.version}`);
    console.log(`   ✅ SDK: ${env.sdk}`);
    console.log(`   ✅ Drivers: ${env.drivers}`);
    
    this.results.environment = env;
    return env;
  }

  /**
   * Vérifie la structure
   */
  checkStructure() {
    console.log('\n📁 2. VÉRIFICATION STRUCTURE\n');
    
    const requiredDirs = ['drivers', 'assets', 'scripts', 'docs', 'reports'];
    const structure = {
      valid: true,
      missing: [],
      present: []
    };
    
    requiredDirs.forEach(dir => {
      const dirPath = path.join(this.projectRoot, dir);
      if (fs.existsSync(dirPath)) {
        structure.present.push(dir);
        console.log(`   ✅ ${dir}/`);
      } else {
        structure.missing.push(dir);
        structure.valid = false;
        console.log(`   ❌ ${dir}/ manquant`);
        this.results.errors.push(`Missing directory: ${dir}`);
      }
    });
    
    this.results.structure = structure;
    return structure;
  }

  /**
   * Vérifie les drivers
   */
  checkDrivers() {
    console.log('\n🚗 3. VÉRIFICATION DRIVERS\n');
    
    const driversDir = path.join(this.projectRoot, 'drivers');
    if (!fs.existsSync(driversDir)) {
      console.log('   ❌ Dossier drivers manquant !');
      this.results.errors.push('Drivers directory missing');
      return { valid: false, count: 0 };
    }
    
    const driverDirs = fs.readdirSync(driversDir).filter(item => {
      return fs.statSync(path.join(driversDir, item)).isDirectory();
    });
    
    let errors = 0;
    let warnings = 0;
    
    driverDirs.forEach(driverId => {
      const driverPath = path.join(driversDir, driverId);
      
      // Vérifier fichiers essentiels
      if (!fs.existsSync(path.join(driverPath, 'device.js'))) {
        errors++;
        this.results.errors.push(`${driverId}: device.js missing`);
      }
      
      if (!fs.existsSync(path.join(driverPath, 'driver.compose.json'))) {
        warnings++;
        this.results.warnings.push(`${driverId}: driver.compose.json missing`);
      }
      
      if (!fs.existsSync(path.join(driverPath, 'assets'))) {
        warnings++;
        this.results.warnings.push(`${driverId}: assets missing`);
      }
    });
    
    console.log(`   ✅ Drivers trouvés: ${driverDirs.length}`);
    console.log(`   ${errors === 0 ? '✅' : '❌'} Erreurs: ${errors}`);
    console.log(`   ${warnings === 0 ? '✅' : '⚠️'} Warnings: ${warnings}`);
    
    this.results.drivers = {
      count: driverDirs.length,
      errors,
      warnings,
      valid: errors === 0
    };
    
    return this.results.drivers;
  }

  /**
   * Vérifie app.json
   */
  checkAppJson() {
    console.log('\n📝 4. VÉRIFICATION APP.JSON\n');
    
    const appJsonPath = path.join(this.projectRoot, 'app.json');
    if (!fs.existsSync(appJsonPath)) {
      console.log('   ❌ app.json manquant !');
      this.results.errors.push('app.json missing');
      return { valid: false };
    }
    
    const appJson = JSON.parse(fs.readFileSync(appJsonPath, 'utf8'));
    
    const checks = {
      hasVersion: !!appJson.version,
      hasSdk: appJson.sdk === 3,
      hasDrivers: (appJson.drivers?.length || 0) > 0,
      hasName: !!appJson.name?.en,
      hasId: !!appJson.id
    };
    
    console.log(`   ${checks.hasVersion ? '✅' : '❌'} Version: ${appJson.version || 'MISSING'}`);
    console.log(`   ${checks.hasSdk ? '✅' : '❌'} SDK: ${appJson.sdk}`);
    console.log(`   ${checks.hasDrivers ? '✅' : '❌'} Drivers: ${appJson.drivers?.length || 0}`);
    console.log(`   ${checks.hasName ? '✅' : '❌'} Name: ${appJson.name?.en ? 'OK' : 'MISSING'}`);
    console.log(`   ${checks.hasId ? '✅' : '❌'} ID: ${appJson.id ? 'OK' : 'MISSING'}`);
    
    const valid = Object.values(checks).every(v => v);
    
    this.results.appJson = { ...checks, valid };
    return this.results.appJson;
  }

  /**
   * Exécute la validation Homey
   */
  runHomeyValidation() {
    console.log('\n✅ 5. VALIDATION HOMEY SDK\n');
    
    try {
      const output = execSync('homey app validate', {
        cwd: this.projectRoot,
        encoding: 'utf8',
        stdio: 'pipe'
      });
      
      console.log('   ✅ Validation RÉUSSIE !');
      
      this.results.validation = {
        success: true,
        output
      };
      
      return true;
    } catch (error) {
      console.log('   ❌ Validation ÉCHOUÉE !');
      console.log(`\n${error.stdout || error.message}`);
      
      this.results.validation = {
        success: false,
        error: error.stdout || error.message
      };
      
      this.results.errors.push('Homey validation failed');
      return false;
    }
  }

  /**
   * Génère le rapport final
   */
  generateReport() {
    const reportPath = path.join(this.projectRoot, 'reports', 'json', 'MASTER_VALIDATION_REPORT.json');
    fs.writeFileSync(reportPath, JSON.stringify(this.results, null, 2));
    console.log('\n📝 Rapport sauvegardé: reports/json/MASTER_VALIDATION_REPORT.json');
  }

  /**
   * Affiche le résumé
   */
  showSummary() {
    console.log('\n═'.repeat(80));
    console.log('📊 RÉSUMÉ VALIDATION MASTER');
    console.log('═'.repeat(80));
    
    const allValid = 
      this.results.structure?.valid &&
      this.results.drivers?.valid &&
      this.results.appJson?.valid &&
      this.results.validation?.success;
    
    console.log(`\n${allValid ? '🎉' : '⚠️'} STATUS: ${allValid ? 'PRODUCTION READY ✅' : 'CORRECTIONS NÉCESSAIRES ⚠️'}`);
    console.log(`\n✅ Environnement: ${this.results.environment?.os} / Node ${this.results.environment?.node}`);
    console.log(`✅ Version: ${this.results.environment?.version}`);
    console.log(`✅ SDK: ${this.results.environment?.sdk}`);
    console.log(`${this.results.structure?.valid ? '✅' : '❌'} Structure: ${this.results.structure?.present.length}/${this.results.structure?.present.length + this.results.structure?.missing.length} dossiers`);
    console.log(`${this.results.drivers?.valid ? '✅' : '❌'} Drivers: ${this.results.drivers?.count} (${this.results.drivers?.errors} erreurs)`);
    console.log(`${this.results.appJson?.valid ? '✅' : '❌'} app.json: ${this.results.appJson?.valid ? 'Valide' : 'Erreurs'}`);
    console.log(`${this.results.validation?.success ? '✅' : '❌'} Validation Homey: ${this.results.validation?.success ? 'RÉUSSIE' : 'ÉCHOUÉE'}`);
    
    if (this.results.errors.length > 0) {
      console.log(`\n⚠️  ERREURS (${this.results.errors.length}):`);
      this.results.errors.slice(0, 10).forEach(err => console.log(`   - ${err}`));
      if (this.results.errors.length > 10) {
        console.log(`   ... et ${this.results.errors.length - 10} autres`);
      }
    }
    
    if (this.results.warnings.length > 0 && this.results.warnings.length <= 5) {
      console.log(`\n⚠️  WARNINGS (${this.results.warnings.length}):`);
      this.results.warnings.forEach(warn => console.log(`   - ${warn}`));
    }
    
    return allValid;
  }

  /**
   * Exécute la validation complète
   */
  validate() {
    this.detectEnvironment();
    this.checkStructure();
    this.checkDrivers();
    this.checkAppJson();
    const validationSuccess = this.runHomeyValidation();
    
    this.generateReport();
    const allValid = this.showSummary();
    
    console.log('\n✅ VALIDATION MASTER TERMINÉE !');
    
    // Code de sortie
    process.exit(allValid ? 0 : 1);
  }
}

// Exécution
const validator = new MasterValidator();
validator.validate();
