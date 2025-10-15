#!/usr/bin/env node

/**
 * ULTIMATE VALIDATION AND FIX ALL - FINAL VERIFICATION
 * 
 * Vérifie TOUT:
 * - Documentation Homey SDK3
 * - Standards Johan Bendz
 * - Bugs forum (#256, #259, #261)
 * - Erreurs "Invalid argument: an internal error occurred"
 * - Structure projet complète
 * - Cohérence drivers
 * 
 * @version 2.1.40-FINAL
 * @author Dylan Rajasekaram
 */

const fs = require('fs');
const path = require('path');
const { execSync } = require('child_process');

const colors = {
  reset: '\x1b[0m',
  red: '\x1b[31m',
  green: '\x1b[32m',
  yellow: '\x1b[33m',
  blue: '\x1b[34m',
  magenta: '\x1b[35m',
  cyan: '\x1b[36m',
  white: '\x1b[37m'
};

const log = {
  info: (msg) => console.log(`${colors.blue}ℹ ${msg}${colors.reset}`),
  success: (msg) => console.log(`${colors.green}✓ ${msg}${colors.reset}`),
  error: (msg) => console.log(`${colors.red}✗ ${msg}${colors.reset}`),
  warning: (msg) => console.log(`${colors.yellow}⚠ ${msg}${colors.reset}`),
  section: (msg) => console.log(`\n${colors.magenta}${'='.repeat(80)}\n${msg}\n${'='.repeat(80)}${colors.reset}\n`)
};

class UltimateValidation {
  constructor() {
    this.rootDir = path.join(__dirname, '..');
    this.issues = [];
    this.fixes = [];
    this.criticalErrors = [];
  }

  async run() {
    try {
      log.section('🔍 ULTIMATE VALIDATION - VÉRIFICATION COMPLÈTE');
      
      await this.check1_AppJsonStructure();
      await this.check2_DriversIntegrity();
      await this.check3_ForumBugsFixed();
      await this.check4_SDK3Compliance();
      await this.check5_JohanBenzStandards();
      await this.check6_InternalErrors();
      await this.check7_HomeyValidation();
      await this.check8_GitStatus();
      await this.generateFinalReport();
      
      log.section('✅ VALIDATION COMPLÈTE TERMINÉE');
      this.printFinalSummary();
      
    } catch (error) {
      log.error(`Erreur fatale: ${error.message}`);
      console.error(error);
      process.exit(1);
    }
  }

  /**
   * CHECK 1: Structure app.json
   */
  async check1_AppJsonStructure() {
    log.section('CHECK 1: Structure app.json');
    
    const appJsonPath = path.join(this.rootDir, 'app.json');
    const appJson = JSON.parse(fs.readFileSync(appJsonPath, 'utf-8'));
    
    // Vérifications critiques
    const checks = [
      { field: 'id', expected: 'com.dlnraja.tuya.zigbee', actual: appJson.id },
      { field: 'version', expected: '2.1.40', actual: appJson.version },
      { field: 'sdk', expected: 3, actual: appJson.sdk },
      { field: 'compatibility', expected: '>=12.2.0', actual: appJson.compatibility }
    ];
    
    checks.forEach(check => {
      if (check.actual === check.expected) {
        log.success(`${check.field}: ${check.actual}`);
      } else {
        log.error(`${check.field}: attendu ${check.expected}, trouvé ${check.actual}`);
        this.criticalErrors.push(`app.json ${check.field} incorrect`);
      }
    });
    
    // Vérifier les drivers
    if (appJson.drivers && appJson.drivers.length > 0) {
      log.success(`Drivers dans app.json: ${appJson.drivers.length}`);
    } else {
      log.error('Aucun driver trouvé dans app.json!');
      this.criticalErrors.push('app.json sans drivers');
    }
  }

  /**
   * CHECK 2: Intégrité des drivers
   */
  async check2_DriversIntegrity() {
    log.section('CHECK 2: Intégrité des Drivers');
    
    const driversDir = path.join(this.rootDir, 'drivers');
    const drivers = fs.readdirSync(driversDir).filter(dir => {
      return fs.statSync(path.join(driversDir, dir)).isDirectory();
    });
    
    log.info(`Analyse de ${drivers.length} drivers...`);
    
    let validDrivers = 0;
    let invalidDrivers = [];
    
    for (const driverName of drivers) {
      const driverPath = path.join(driversDir, driverName);
      const requiredFiles = ['driver.compose.json', 'device.js', 'driver.js'];
      const missingFiles = [];
      
      for (const file of requiredFiles) {
        if (!fs.existsSync(path.join(driverPath, file))) {
          missingFiles.push(file);
        }
      }
      
      if (missingFiles.length === 0) {
        validDrivers++;
        
        // Vérifier la structure du driver.compose.json
        const composePath = path.join(driverPath, 'driver.compose.json');
        try {
          const compose = JSON.parse(fs.readFileSync(composePath, 'utf-8'));
          
          // Vérifications SDK3
          if (!compose.zigbee || !compose.zigbee.endpoints) {
            invalidDrivers.push({
              name: driverName,
              issue: 'Missing zigbee.endpoints (SDK3 requirement)'
            });
          }
          
          if (!compose.zigbee || !compose.zigbee.manufacturerName) {
            invalidDrivers.push({
              name: driverName,
              issue: 'Missing zigbee.manufacturerName'
            });
          }
          
        } catch (error) {
          invalidDrivers.push({
            name: driverName,
            issue: `JSON invalide: ${error.message}`
          });
        }
      } else {
        invalidDrivers.push({
          name: driverName,
          issue: `Fichiers manquants: ${missingFiles.join(', ')}`
        });
      }
    }
    
    log.success(`Drivers valides: ${validDrivers}/${drivers.length}`);
    
    if (invalidDrivers.length > 0) {
      log.warning(`${invalidDrivers.length} drivers avec problèmes:`);
      invalidDrivers.forEach(d => {
        log.error(`  ${d.name}: ${d.issue}`);
      });
      this.issues.push(...invalidDrivers);
    }
  }

  /**
   * CHECK 3: Bugs forum corrigés
   */
  async check3_ForumBugsFixed() {
    log.section('CHECK 3: Vérification Bugs Forum');
    
    log.info('Bug #259: Temperature/Humidity Sensor...');
    const tempDriver = path.join(this.rootDir, 'drivers', 'temperature_humidity_sensor', 'driver.compose.json');
    if (fs.existsSync(tempDriver)) {
      const compose = JSON.parse(fs.readFileSync(tempDriver, 'utf-8'));
      
      // Vérifier que les capabilities incorrectes sont supprimées
      const wrongCaps = ['alarm_motion', 'measure_luminance'];
      const hasWrongCaps = compose.capabilities?.some(cap => wrongCaps.includes(cap));
      
      if (!hasWrongCaps) {
        log.success('Bug #259: Capabilities correctes (temp/humidity uniquement)');
      } else {
        log.error('Bug #259: Capabilities incorrectes encore présentes!');
        this.criticalErrors.push('Bug #259 non corrigé');
      }
    } else {
      log.warning('Bug #259: Driver temperature_humidity_sensor non trouvé');
    }
    
    log.info('Bug #256: PIR Motion Sensor...');
    const pirDriver = path.join(this.rootDir, 'drivers', 'motion_sensor_pir_battery', 'driver.compose.json');
    if (fs.existsSync(pirDriver)) {
      const compose = JSON.parse(fs.readFileSync(pirDriver, 'utf-8'));
      
      if (compose.zigbee && compose.zigbee.manufacturerName) {
        log.success('Bug #256: Manufacturer IDs présents pour PIR');
      } else {
        log.error('Bug #256: Manufacturer IDs manquants!');
        this.criticalErrors.push('Bug #256 non corrigé');
      }
    } else {
      log.warning('Bug #256: Driver motion_sensor_pir_battery non trouvé');
    }
    
    log.info('Bug #261: Gas Sensor Support...');
    const gasDriver = path.join(this.rootDir, 'drivers', 'gas_sensor_ts0601', 'driver.compose.json');
    if (fs.existsSync(gasDriver)) {
      log.success('Bug #261: Driver gas_sensor_ts0601 présent');
    } else {
      log.warning('Bug #261: Driver gas_sensor_ts0601 non trouvé');
    }
  }

  /**
   * CHECK 4: Conformité SDK3
   */
  async check4_SDK3Compliance() {
    log.section('CHECK 4: Conformité SDK3');
    
    const packageJson = JSON.parse(fs.readFileSync(
      path.join(this.rootDir, 'package.json'),
      'utf-8'
    ));
    
    // Vérifier homey-zigbeedriver
    if (packageJson.dependencies && packageJson.dependencies['homey-zigbeedriver']) {
      log.success('Dépendance homey-zigbeedriver présente');
    } else {
      log.error('Dépendance homey-zigbeedriver manquante!');
      this.criticalErrors.push('homey-zigbeedriver manquant');
    }
    
    // Vérifier Node version
    if (packageJson.engines && packageJson.engines.node) {
      log.success(`Node version requise: ${packageJson.engines.node}`);
    } else {
      log.warning('Node version non spécifiée dans package.json');
    }
  }

  /**
   * CHECK 5: Standards Johan Bendz
   */
  async check5_JohanBenzStandards() {
    log.section('CHECK 5: Standards Johan Bendz');
    
    log.info('Vérification structure drivers...');
    
    // Les drivers doivent être organisés par FONCTION, pas par marque
    const driversDir = path.join(this.rootDir, 'drivers');
    const drivers = fs.readdirSync(driversDir);
    
    // Vérifier qu'il n'y a pas de drivers avec des noms de marques
    const brandNames = ['tuya', 'moes', 'bseed', 'nedis', 'ewelink'];
    const brandedDrivers = drivers.filter(d => {
      return brandNames.some(brand => d.toLowerCase().includes(brand));
    });
    
    if (brandedDrivers.length === 0) {
      log.success('Drivers organisés par fonction (unbranded) ✓');
    } else {
      log.warning(`${brandedDrivers.length} drivers avec noms de marques`);
    }
    
    // Vérifier les images
    const assetsDir = path.join(this.rootDir, 'assets', 'images');
    const requiredImages = ['small.png', 'large.png', 'xlarge.png'];
    let imagesOk = true;
    
    for (const img of requiredImages) {
      if (fs.existsSync(path.join(assetsDir, img))) {
        log.success(`Image app: ${img} ✓`);
      } else {
        log.error(`Image app: ${img} manquante!`);
        imagesOk = false;
      }
    }
    
    if (!imagesOk) {
      this.issues.push({ type: 'IMAGES', message: 'Images app manquantes' });
    }
  }

  /**
   * CHECK 6: Erreurs internes (Invalid argument)
   */
  async check6_InternalErrors() {
    log.section('CHECK 6: Recherche Erreurs Internes');
    
    log.info('Recherche de "Invalid argument: an internal error occurred"...');
    
    // Chercher dans les logs, rapports, etc.
    const searchPaths = [
      path.join(this.rootDir, 'reports'),
      path.join(this.rootDir, 'scripts')
    ];
    
    let errorFound = false;
    
    for (const searchPath of searchPaths) {
      if (fs.existsSync(searchPath)) {
        const files = fs.readdirSync(searchPath);
        for (const file of files) {
          const filePath = path.join(searchPath, file);
          if (fs.statSync(filePath).isFile()) {
            const content = fs.readFileSync(filePath, 'utf-8');
            if (content.includes('Invalid argument') || content.includes('internal error')) {
              log.warning(`Erreur trouvée dans: ${file}`);
              errorFound = true;
            }
          }
        }
      }
    }
    
    if (!errorFound) {
      log.success('Aucune erreur "Invalid argument" trouvée dans les fichiers');
    }
    
    // Vérifier les configurations Zigbee
    log.info('Vérification configurations Zigbee...');
    const driversDir = path.join(this.rootDir, 'drivers');
    const drivers = fs.readdirSync(driversDir);
    
    let zigbeeErrors = [];
    
    for (const driverName of drivers) {
      const composePath = path.join(driversDir, driverName, 'driver.compose.json');
      if (fs.existsSync(composePath)) {
        try {
          const compose = JSON.parse(fs.readFileSync(composePath, 'utf-8'));
          
          // Vérifier que les clusters sont des nombres
          if (compose.zigbee && compose.zigbee.endpoints) {
            for (const [epId, endpoint] of Object.entries(compose.zigbee.endpoints)) {
              if (endpoint.clusters) {
                const invalidClusters = endpoint.clusters.filter(c => typeof c !== 'number');
                if (invalidClusters.length > 0) {
                  zigbeeErrors.push({
                    driver: driverName,
                    issue: `Clusters non-numériques dans endpoint ${epId}`
                  });
                }
              }
            }
          }
        } catch (error) {
          // Skip invalid JSON
        }
      }
    }
    
    if (zigbeeErrors.length === 0) {
      log.success('Toutes les configurations Zigbee sont valides');
    } else {
      log.error(`${zigbeeErrors.length} drivers avec configurations Zigbee invalides`);
      zigbeeErrors.forEach(err => {
        log.error(`  ${err.driver}: ${err.issue}`);
      });
      this.criticalErrors.push(...zigbeeErrors);
    }
  }

  /**
   * CHECK 7: Validation Homey CLI
   */
  async check7_HomeyValidation() {
    log.section('CHECK 7: Validation Homey CLI');
    
    try {
      log.info('Exécution: homey app validate --level publish...');
      const output = execSync('homey app validate --level publish', {
        cwd: this.rootDir,
        encoding: 'utf-8'
      });
      
      log.success('✅ VALIDATION HOMEY RÉUSSIE!');
      console.log(output);
      
    } catch (error) {
      log.error('❌ VALIDATION HOMEY ÉCHOUÉE!');
      console.error(error.stdout || error.message);
      this.criticalErrors.push('Validation Homey échouée');
    }
  }

  /**
   * CHECK 8: État Git
   */
  async check8_GitStatus() {
    log.section('CHECK 8: État Git');
    
    try {
      const status = execSync('git status --short', {
        cwd: this.rootDir,
        encoding: 'utf-8'
      });
      
      if (status.trim() === '') {
        log.success('Git: Aucun changement non commité');
      } else {
        log.warning('Git: Changements non commitéd détectés');
        console.log(status);
      }
      
      const branch = execSync('git rev-parse --abbrev-ref HEAD', {
        cwd: this.rootDir,
        encoding: 'utf-8'
      }).trim();
      
      log.info(`Branche actuelle: ${branch}`);
      
      const lastCommit = execSync('git log -1 --oneline', {
        cwd: this.rootDir,
        encoding: 'utf-8'
      }).trim();
      
      log.info(`Dernier commit: ${lastCommit}`);
      
    } catch (error) {
      log.error('Erreur Git: ' + error.message);
    }
  }

  /**
   * Générer rapport final
   */
  async generateFinalReport() {
    log.section('GÉNÉRATION RAPPORT FINAL');
    
    const report = {
      timestamp: new Date().toISOString(),
      version: '2.1.40',
      summary: {
        criticalErrors: this.criticalErrors.length,
        issues: this.issues.length,
        fixes: this.fixes.length
      },
      criticalErrors: this.criticalErrors,
      issues: this.issues,
      fixes: this.fixes,
      status: this.criticalErrors.length === 0 ? 'READY' : 'NEEDS_FIX'
    };
    
    const reportPath = path.join(this.rootDir, 'reports', 'FINAL_VALIDATION_REPORT.json');
    fs.mkdirSync(path.dirname(reportPath), { recursive: true });
    fs.writeFileSync(reportPath, JSON.stringify(report, null, 2), 'utf-8');
    
    log.success(`Rapport sauvegardé: ${reportPath}`);
  }

  /**
   * Résumé final
   */
  printFinalSummary() {
    console.log('\n' + '='.repeat(80));
    console.log('RÉSUMÉ FINAL DE LA VALIDATION');
    console.log('='.repeat(80));
    
    if (this.criticalErrors.length === 0) {
      console.log(`${colors.green}✅ AUCUNE ERREUR CRITIQUE${colors.reset}`);
      console.log(`${colors.green}✅ LE PROJET EST PRÊT POUR PRODUCTION${colors.reset}`);
    } else {
      console.log(`${colors.red}❌ ${this.criticalErrors.length} ERREURS CRITIQUES DÉTECTÉES${colors.reset}`);
      this.criticalErrors.forEach(err => {
        console.log(`${colors.red}   - ${typeof err === 'string' ? err : err.issue || err.message}${colors.reset}`);
      });
    }
    
    console.log('');
    console.log(`Issues non-critiques: ${this.issues.length}`);
    console.log(`Corrections appliquées: ${this.fixes.length}`);
    console.log('='.repeat(80));
    
    if (this.criticalErrors.length === 0) {
      console.log('');
      console.log(`${colors.cyan}🚀 PROCHAINES ÉTAPES:${colors.reset}`);
      console.log('  1. Monitorer GitHub Actions');
      console.log('  2. Tester avec des devices réels');
      console.log('  3. Répondre aux utilisateurs du forum');
      console.log('  4. Vérifier publication Homey App Store');
      console.log('');
    }
  }
}

// Exécuter la validation
if (require.main === module) {
  const validation = new UltimateValidation();
  validation.run().catch(error => {
    console.error('Erreur fatale:', error);
    process.exit(1);
  });
}

module.exports = UltimateValidation;
