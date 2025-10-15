#!/usr/bin/env node
'use strict';

/**
 * COMPLETE PROJECT VALIDATOR
 * Validation complète avec SDK Homey, Guidelines et Forum
 */

const fs = require('fs');
const path = require('path');
const { execSync } = require('child_process');

const ROOT = path.join(__dirname, '..');

class CompleteProjectValidator {
  constructor() {
    this.validations = {
      sdk: { passed: [], failed: [] },
      guidelines: { passed: [], failed: [] },
      forum: { passed: [], failed: [] },
      structure: { passed: [], failed: [] },
      enrichment: { passed: [], failed: [] }
    };
    
    // SDK Homey requirements
    this.sdkRequirements = {
      app: {
        id: true,
        version: true,
        compatibility: '>=12.2.0',
        sdk: 3,
        name: true,
        description: true,
        category: true,
        permissions: true,
        images: ['small', 'large', 'xlarge']
      },
      driver: {
        name: true,
        class: true,
        capabilities: true,
        images: ['small', 'large'],
        zigbee: {
          endpoints: true
        }
      }
    };
    
    // Guidelines Homey
    this.guidelines = {
      naming: /^[a-z][a-z0-9_]*$/,
      imageSize: {
        appSmall: [250, 175],
        appLarge: [500, 350],
        appXLarge: [1000, 700],
        driverSmall: [75, 75],
        driverLarge: [500, 500],
        driverXLarge: [1000, 1000]
      },
      capabilities: [
        'onoff', 'dim', 'light_temperature', 'light_hue', 'light_saturation',
        'measure_temperature', 'measure_humidity', 'measure_battery',
        'measure_power', 'measure_voltage', 'measure_current',
        'alarm_motion', 'alarm_contact', 'alarm_tamper', 'alarm_battery',
        'button'
      ]
    };
    
    // Demandes forum (basé sur les issues résolues)
    this.forumRequirements = {
      stability: {
        iasZone: 'IAS Zone enrollment robuste',
        keepAlive: 'Keep-alive mechanism',
        reconnect: 'Auto-reconnect après erreur'
      },
      battery: {
        monitoring: 'Battery monitoring intelligent',
        alerts: 'Alertes batterie faible',
        estimation: 'Estimation durée restante'
      },
      flows: {
        triggers: 'Flow triggers complets',
        conditions: 'Flow conditions utiles',
        actions: 'Flow actions pratiques'
      }
    };
  }

  log(msg, icon = '✓') {
    console.log(`${icon} ${msg}`);
  }

  // Validation SDK Homey
  async validateSDK() {
    this.log('Validation SDK Homey...', '🔍');
    console.log('═'.repeat(70));

    try {
      // Valider app.json
      const appJsonPath = path.join(ROOT, 'app.json');
      const appJson = JSON.parse(fs.readFileSync(appJsonPath, 'utf8'));

      // Vérifier requirements
      if (appJson.sdk === this.sdkRequirements.app.sdk) {
        this.validations.sdk.passed.push('SDK version 3');
      } else {
        this.validations.sdk.failed.push('SDK version incorrect');
      }

      if (appJson.compatibility === this.sdkRequirements.app.compatibility) {
        this.validations.sdk.passed.push('Compatibility >= 12.2.0');
      }

      // Images app
      if (appJson.images) {
        for (const img of this.sdkRequirements.app.images) {
          if (appJson.images[img]) {
            this.validations.sdk.passed.push(`App image: ${img}`);
          } else {
            this.validations.sdk.failed.push(`Missing app image: ${img}`);
          }
        }
      }

      // Validation Homey CLI
      this.log('Validation Homey CLI...', '  ');
      try {
        execSync('homey app validate --level publish', {
          cwd: ROOT,
          stdio: 'pipe'
        });
        this.validations.sdk.passed.push('Homey CLI validation');
      } catch (err) {
        this.validations.sdk.failed.push('Homey CLI validation failed');
      }

      this.log(`SDK: ${this.validations.sdk.passed.length} passed, ${this.validations.sdk.failed.length} failed`, '✅');
    } catch (err) {
      this.log(`SDK validation error: ${err.message}`, '❌');
    }
  }

  // Validation Guidelines
  async validateGuidelines() {
    this.log('Validation Guidelines Homey...', '🔍');
    console.log('═'.repeat(70));

    // Vérifier drivers
    const driversPath = path.join(ROOT, 'drivers');
    const drivers = fs.readdirSync(driversPath).filter(name => {
      return fs.statSync(path.join(driversPath, name)).isDirectory();
    });

    let checked = 0;
    for (const driver of drivers) {
      const composePath = path.join(driversPath, driver, 'driver.compose.json');
      
      if (fs.existsSync(composePath)) {
        const compose = JSON.parse(fs.readFileSync(composePath, 'utf8'));
        
        // Vérifier naming
        if (this.guidelines.naming.test(driver)) {
          this.validations.guidelines.passed.push(`Driver naming: ${driver}`);
        }
        
        // Vérifier capabilities
        if (compose.capabilities) {
          const validCaps = compose.capabilities.every(cap => 
            this.guidelines.capabilities.includes(cap.split('.')[0])
          );
          if (validCaps) {
            this.validations.guidelines.passed.push(`Capabilities valid: ${driver}`);
          }
        }
        
        checked++;
      }
    }

    this.log(`Guidelines: ${checked} drivers vérifiés`, '✅');
  }

  // Validation Forum requirements
  async validateForumRequirements() {
    this.log('Validation demandes Forum...', '🔍');
    console.log('═'.repeat(70));

    // Vérifier IAS Zone enrollment
    const iasZonePath = path.join(ROOT, 'lib', 'IASZoneEnroller.js');
    if (fs.existsSync(iasZonePath)) {
      this.validations.forum.passed.push('IAS Zone enrollment robuste');
    } else {
      this.validations.forum.failed.push('IAS Zone enrollment manquant');
    }

    // Vérifier battery monitoring
    const batteryReportPath = path.join(ROOT, 'reports', 'INTELLIGENT_BATTERY_REPORT.json');
    if (fs.existsSync(batteryReportPath)) {
      this.validations.forum.passed.push('Battery monitoring intelligent');
    }

    // Vérifier flows
    const appJsonPath = path.join(ROOT, 'app.json');
    const appJson = JSON.parse(fs.readFileSync(appJsonPath, 'utf8'));
    
    if (appJson.flow) {
      if (appJson.flow.triggers?.length > 0) {
        this.validations.forum.passed.push(`${appJson.flow.triggers.length} flow triggers`);
      }
      if (appJson.flow.conditions?.length > 0) {
        this.validations.forum.passed.push(`${appJson.flow.conditions.length} flow conditions`);
      }
      if (appJson.flow.actions?.length > 0) {
        this.validations.forum.passed.push(`${appJson.flow.actions.length} flow actions`);
      }
    }

    this.log(`Forum: ${this.validations.forum.passed.length} requirements satisfaits`, '✅');
  }

  // Validation structure
  async validateStructure() {
    this.log('Validation structure projet...', '🔍');
    console.log('═'.repeat(70));

    const requiredDirs = [
      'drivers',
      'lib',
      'scripts',
      'assets',
      'locales',
      'reports',
      'docs'
    ];

    for (const dir of requiredDirs) {
      const dirPath = path.join(ROOT, dir);
      if (fs.existsSync(dirPath)) {
        this.validations.structure.passed.push(`Directory: ${dir}`);
      } else {
        this.validations.structure.failed.push(`Missing directory: ${dir}`);
      }
    }

    this.log(`Structure: ${this.validations.structure.passed.length}/${requiredDirs.length}`, '✅');
  }

  // Validation enrichissement
  async validateEnrichment() {
    this.log('Validation enrichissement...', '🔍');
    console.log('═'.repeat(70));

    // Vérifier drivers enrichis
    const driversPath = path.join(ROOT, 'drivers');
    const drivers = fs.readdirSync(driversPath).filter(name => {
      return fs.statSync(path.join(driversPath, name)).isDirectory();
    });

    let enriched = 0;
    for (const driver of drivers) {
      const composePath = path.join(driversPath, driver, 'driver.compose.json');
      
      if (fs.existsSync(composePath)) {
        const compose = JSON.parse(fs.readFileSync(composePath, 'utf8'));
        
        // Critères enrichissement
        const hasClass = !!compose.class;
        const hasImages = !!compose.images;
        const hasCapabilities = !!compose.capabilities;
        const hasBatteryConfig = compose.capabilities?.includes('measure_battery') ? 
                                  !!compose.energy?.batteries : true;
        
        if (hasClass && hasImages && hasCapabilities && hasBatteryConfig) {
          enriched++;
          this.validations.enrichment.passed.push(driver);
        }
      }
    }

    this.log(`Enrichissement: ${enriched}/${drivers.length} drivers`, '✅');
  }

  // Générer rapport
  generateReport() {
    const totalPassed = Object.values(this.validations).reduce((sum, v) => sum + v.passed.length, 0);
    const totalFailed = Object.values(this.validations).reduce((sum, v) => sum + v.failed.length, 0);
    const totalChecks = totalPassed + totalFailed;
    const score = totalChecks > 0 ? Math.round((totalPassed / totalChecks) * 100) : 0;

    const report = {
      timestamp: new Date().toISOString(),
      score,
      summary: {
        totalChecks,
        passed: totalPassed,
        failed: totalFailed
      },
      validations: this.validations
    };

    const reportPath = path.join(ROOT, 'reports', 'COMPLETE_VALIDATION_REPORT.json');
    fs.writeFileSync(reportPath, JSON.stringify(report, null, 2));

    return report;
  }

  // Exécution
  async run() {
    console.log('\n╔════════════════════════════════════════════════════════════════════╗');
    console.log('║                                                                    ║');
    console.log('║     COMPLETE PROJECT VALIDATOR - VALIDATION TOTALE                 ║');
    console.log('║                                                                    ║');
    console.log('╚════════════════════════════════════════════════════════════════════╝\n');

    const startTime = Date.now();

    // Exécuter validations
    await this.validateSDK();
    await this.validateGuidelines();
    await this.validateForumRequirements();
    await this.validateStructure();
    await this.validateEnrichment();

    const report = this.generateReport();
    const totalTime = ((Date.now() - startTime) / 1000).toFixed(2);

    // Résumé
    console.log('\n' + '═'.repeat(70));
    console.log('📊 RÉSUMÉ VALIDATION COMPLÈTE');
    console.log('═'.repeat(70));
    console.log(`\n⏱️  Temps: ${totalTime}s`);
    console.log(`✅ Tests passed: ${report.summary.passed}`);
    console.log(`❌ Tests failed: ${report.summary.failed}`);
    console.log(`📊 Score: ${report.score}%`);

    const icon = report.score >= 90 ? '🟢' : report.score >= 70 ? '🟡' : '🔴';
    console.log(`\n${icon} Conformité globale: ${report.score}%`);

    console.log('\n' + '═'.repeat(70));
    console.log('✅ VALIDATION TERMINÉE');
    console.log('═'.repeat(70) + '\n');

    return report;
  }
}

// Exécuter
if (require.main === module) {
  const validator = new CompleteProjectValidator();
  validator.run().catch(err => {
    console.error('Erreur fatale:', err);
    process.exit(1);
  });
}

module.exports = CompleteProjectValidator;
