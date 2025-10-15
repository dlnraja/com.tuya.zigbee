const fs = require('fs');
const path = require('path');

/**
 * DIAGNOSTIC EN PROFONDEUR - ANALYSE COMPLÈTE APP
 * Identifie TOUS les problèmes critiques qui empêchent l'app de fonctionner
 */

console.log('🔍 DIAGNOSTIC EN PROFONDEUR - ANALYSE CRITIQUE\n');
console.log('═'.repeat(80));

class DeepDiagnostic {
  constructor() {
    this.projectRoot = process.cwd();
    this.issues = {
      critical: [],
      major: [],
      minor: [],
      suggestions: []
    };
  }

  analyze() {
    console.log('\n📊 1. ANALYSE APP.JSON\n');
    this.analyzeAppJson();

    console.log('\n📊 2. ANALYSE DRIVERS\n');
    this.analyzeDrivers();

    console.log('\n📊 3. ANALYSE IMAGES\n');
    this.analyzeImages();

    console.log('\n📊 4. ANALYSE CAPABILITIES\n');
    this.analyzeCapabilities();

    console.log('\n📊 5. ANALYSE ZIGBEE CONFIG\n');
    this.analyzeZigbeeConfig();

    console.log('\n📊 6. BUGS FORUM\n');
    this.analyzeForumBugs();

    this.generateReport();
  }

  analyzeAppJson() {
    const appJsonPath = path.join(this.projectRoot, 'app.json');
    const appJson = JSON.parse(fs.readFileSync(appJsonPath, 'utf8'));

    // Vérifier version
    console.log(`   Version actuelle: ${appJson.version}`);
    
    // Vérifier drivers
    const driverCount = appJson.drivers?.length || 0;
    console.log(`   Drivers dans app.json: ${driverCount}`);

    // Vérifier flow cards
    const flowCards = {
      triggers: appJson.flow?.triggers?.length || 0,
      conditions: appJson.flow?.conditions?.length || 0,
      actions: appJson.flow?.actions?.length || 0
    };
    console.log(`   Flow cards: ${flowCards.triggers + flowCards.conditions + flowCards.actions}`);

    // Vérifier images manquantes
    let missingImages = 0;
    appJson.drivers.forEach(driver => {
      if (driver.images) {
        ['small', 'large'].forEach(size => {
          const imagePath = path.join(this.projectRoot, driver.images[size].substring(2));
          if (!fs.existsSync(imagePath)) {
            missingImages++;
            this.issues.critical.push(`${driver.id}: Missing ${size} image`);
          }
        });
      } else {
        this.issues.critical.push(`${driver.id}: No images defined`);
      }
    });

    if (missingImages > 0) {
      console.log(`   ❌ ${missingImages} images manquantes`);
    }

    return appJson;
  }

  analyzeDrivers() {
    const driversDir = path.join(this.projectRoot, 'drivers');
    const driverDirs = fs.readdirSync(driversDir).filter(item => 
      fs.statSync(path.join(driversDir, item)).isDirectory()
    );

    console.log(`   Dossiers drivers: ${driverDirs.length}`);

    let driversWithIssues = 0;

    driverDirs.forEach(driverId => {
      const driverPath = path.join(driversDir, driverId);
      const issues = [];

      // Vérifier device.js
      if (!fs.existsSync(path.join(driverPath, 'device.js'))) {
        issues.push('device.js missing');
        this.issues.critical.push(`${driverId}: device.js missing`);
      }

      // Vérifier driver.compose.json
      const composePath = path.join(driverPath, 'driver.compose.json');
      if (!fs.existsSync(composePath)) {
        issues.push('driver.compose.json missing');
        this.issues.critical.push(`${driverId}: driver.compose.json missing`);
      } else {
        try {
          const compose = JSON.parse(fs.readFileSync(composePath, 'utf8'));
          
          // Vérifier zigbee config
          if (!compose.zigbee) {
            issues.push('No zigbee config');
            this.issues.major.push(`${driverId}: No zigbee configuration`);
          } else {
            if (!compose.zigbee.manufacturerName && !compose.zigbee.productId) {
              issues.push('No manufacturer/product IDs');
              this.issues.major.push(`${driverId}: Missing manufacturer/product IDs`);
            }
          }

          // Vérifier capabilities
          if (!compose.capabilities || compose.capabilities.length === 0) {
            issues.push('No capabilities');
            this.issues.major.push(`${driverId}: No capabilities defined`);
          }

        } catch (error) {
          this.issues.critical.push(`${driverId}: Invalid driver.compose.json`);
        }
      }

      // Vérifier assets
      const assetsPath = path.join(driverPath, 'assets');
      if (!fs.existsSync(assetsPath)) {
        issues.push('No assets folder');
        this.issues.major.push(`${driverId}: Missing assets folder`);
      } else {
        ['small.png', 'large.png'].forEach(img => {
          if (!fs.existsSync(path.join(assetsPath, img))) {
            issues.push(`Missing ${img}`);
            this.issues.major.push(`${driverId}: Missing ${img}`);
          }
        });
      }

      if (issues.length > 0) {
        driversWithIssues++;
      }
    });

    console.log(`   ❌ ${driversWithIssues} drivers avec problèmes`);
  }

  analyzeImages() {
    // Problème Forum #256: Manque d'images comme Johan
    this.issues.suggestions.push('Add device images in pairing UI like Johan Bendz app');
    this.issues.suggestions.push('Group similar devices with visual thumbnails');
  }

  analyzeCapabilities() {
    // Problème Forum #259: Capabilities affichées incorrectement
    const appJson = JSON.parse(fs.readFileSync(path.join(this.projectRoot, 'app.json'), 'utf8'));
    
    appJson.drivers.forEach(driver => {
      const capabilities = driver.capabilities || [];
      
      // Vérifier capabilities invalides
      if (capabilities.includes('alarm_motion') && !capabilities.includes('alarm_generic')) {
        this.issues.major.push(`${driver.id}: alarm_motion without proper type`);
      }

      // Vérifier capabilities manquantes pour energy
      if (capabilities.includes('measure_battery') && !driver.energy?.batteries) {
        this.issues.critical.push(`${driver.id}: measure_battery without energy.batteries`);
      }
    });
  }

  analyzeZigbeeConfig() {
    // Vérifier que tous les drivers ont une config zigbee correcte
    const driversDir = path.join(this.projectRoot, 'drivers');
    const driverDirs = fs.readdirSync(driversDir).filter(item => 
      fs.statSync(path.join(driversDir, item)).isDirectory()
    );

    driverDirs.forEach(driverId => {
      const composePath = path.join(driversDir, driverId, 'driver.compose.json');
      if (fs.existsSync(composePath)) {
        const compose = JSON.parse(fs.readFileSync(composePath, 'utf8'));
        
        if (compose.zigbee && compose.zigbee.endpoints) {
          Object.values(compose.zigbee.endpoints).forEach(endpoint => {
            if (endpoint.clusters) {
              // Vérifier que les clusters sont des nombres
              endpoint.clusters.forEach(clusterId => {
                if (typeof clusterId === 'string') {
                  this.issues.critical.push(`${driverId}: Cluster ${clusterId} is string, should be number`);
                }
              });
            }
          });
        }
      }
    });
  }

  analyzeForumBugs() {
    // Bug #259: Temperature/Humidity not showing
    this.issues.critical.push('FORUM BUG #259: Temperature sensors not displaying values');
    this.issues.suggestions.push('Check temperature/humidity parsers in device.js');
    this.issues.suggestions.push('Verify reportParser callbacks are registered');

    // Bug #256: Unknown Zigbee Device
    this.issues.critical.push('FORUM BUG #256: PIR and buttons showing as Unknown Zigbee Device');
    this.issues.suggestions.push('Add more manufacturer IDs for PIR sensors');
    this.issues.suggestions.push('Improve device fingerprinting');

    // Bug #256: Too many similar drivers
    this.issues.major.push('FORUM BUG #256: Too many drivers with same name, confusing');
    this.issues.suggestions.push('Consolidate similar drivers with same capabilities');
    this.issues.suggestions.push('Add clear naming distinction (battery type, gang count)');

    // Request #261: Gas sensor missing
    this.issues.suggestions.push('FORUM REQUEST #261: Add TS0601_gas_sensor_2 support');
  }

  generateReport() {
    console.log('\n═'.repeat(80));
    console.log('📊 RAPPORT DIAGNOSTIC COMPLET');
    console.log('═'.repeat(80));

    console.log(`\n🔴 CRITICAL (${this.issues.critical.length}):`);
    this.issues.critical.slice(0, 10).forEach(issue => console.log(`   - ${issue}`));
    if (this.issues.critical.length > 10) {
      console.log(`   ... et ${this.issues.critical.length - 10} autres`);
    }

    console.log(`\n🟠 MAJOR (${this.issues.major.length}):`);
    this.issues.major.slice(0, 10).forEach(issue => console.log(`   - ${issue}`));
    if (this.issues.major.length > 10) {
      console.log(`   ... et ${this.issues.major.length - 10} autres`);
    }

    console.log(`\n🟡 SUGGESTIONS (${this.issues.suggestions.length}):`);
    this.issues.suggestions.forEach(issue => console.log(`   - ${issue}`));

    // Sauvegarder rapport
    const report = {
      timestamp: new Date().toISOString(),
      summary: {
        critical: this.issues.critical.length,
        major: this.issues.major.length,
        minor: this.issues.minor.length,
        suggestions: this.issues.suggestions.length
      },
      issues: this.issues
    };

    const reportPath = path.join(this.projectRoot, 'reports', 'json', 'DEEP_DIAGNOSTIC_REPORT.json');
    fs.writeFileSync(reportPath, JSON.stringify(report, null, 2));

    console.log('\n📝 Rapport sauvegardé: reports/json/DEEP_DIAGNOSTIC_REPORT.json');
    console.log('\n🎯 PROCHAINES ACTIONS CRITIQUES:');
    console.log('   1. Corriger images manquantes');
    console.log('   2. Fixer capabilities temperature/humidity');
    console.log('   3. Améliorer device pairing');
    console.log('   4. Ajouter gas sensor TS0601_gas_sensor_2');
    console.log('   5. Consolider drivers similaires');
  }
}

const diagnostic = new DeepDiagnostic();
diagnostic.analyze();
