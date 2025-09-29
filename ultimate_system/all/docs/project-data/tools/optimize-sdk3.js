#!/usr/bin/env node

/**
 * Homey SDK3 Optimization Script
 * Optimise tous les drivers pour Homey SDK3
 * 
 * @author Dylan Rajasekaram
 * @version 1.0.0
 * @license MIT
 */

const fs = require('fs');
const path = require('path');
const chalk = require('chalk');

// Configuration SDK3
const SDK3_CONFIG = {
  version: '3.8.4',
  compatibility: {
    min: '5.0.0',
    max: '6.0.0'
  },
  features: {
    homeycompose: true,
    zigbee: true,
    meshdriver: false
  }
};

// Classes de devices supportées
const SUPPORTED_CLASSES = [
  'light', 'socket', 'switch', 'sensor', 'thermostat',
  'cover', 'lock', 'fan', 'climate', 'remote', 'device'
];

// Capabilities standard
const STANDARD_CAPABILITIES = [
  'onoff', 'dim', 'light_temperature', 'light_mode',
  'measure_power', 'meter_power', 'measure_temperature',
  'measure_humidity', 'target_temperature', 'windowcoverings_set',
  'windowcoverings_state', 'alarm_battery', 'alarm_contact',
  'measure_presence'
];

// Clusters Zigbee optimisés
const OPTIMIZED_CLUSTERS = {
  0: 'Basic',
  1: 'Power Configuration',
  3: 'Identify',
  4: 'Groups',
  5: 'Scenes',
  6: 'On/Off',
  8: 'Level Control',
  768: 'Color Control',
  1024: 'Illuminance Measurement',
  1026: 'Temperature Measurement',
  1029: 'Humidity Measurement',
  1030: 'Occupancy Sensing',
  1794: 'Metering',
  2820: 'Electrical Measurement',
  513: 'Thermostat',
  514: 'Fan Control',
  257: 'Door Lock',
  258: 'Window Covering',
  1280: 'Alarms'
};

class SDK3Optimizer {
  constructor() {
    this.stats = {
      drivers_processed: 0,
      drivers_optimized: 0,
      errors: 0,
      warnings: 0
    };
    this.report = [];
  }

  /**
   * Optimise un driver pour SDK3
   */
  optimizeDriver(driverPath) {
    try {
      const driverComposePath = path.join(driverPath, 'driver.compose.json');
      
      if (!fs.existsSync(driverComposePath)) {
        this.logWarning(`Driver compose non trouvé: ${driverPath}`);
        return false;
      }

      const driverData = JSON.parse(fs.readFileSync(driverComposePath, 'utf8'));
      let optimized = false;

      // Optimisation classe
      if (driverData.class && !SUPPORTED_CLASSES.includes(driverData.class)) {
        this.logWarning(`Classe non supportée: ${driverData.class} dans ${driverPath}`);
      }

      // Optimisation capabilities
      if (driverData.capabilities) {
        const invalidCapabilities = driverData.capabilities.filter(
          cap => !STANDARD_CAPABILITIES.includes(cap)
        );
        
        if (invalidCapabilities.length > 0) {
          this.logWarning(`Capabilities non standard: ${invalidCapabilities.join(', ')} dans ${driverPath}`);
        }
      }

      // Optimisation clusters Zigbee
      if (driverData.zigbee && driverData.zigbee.endpoints) {
        Object.keys(driverData.zigbee.endpoints).forEach(endpointId => {
          const endpoint = driverData.zigbee.endpoints[endpointId];
          
          if (endpoint.clusters) {
            // Conversion des clusters en nombres si nécessaire
            endpoint.clusters = endpoint.clusters.map(cluster => {
              if (typeof cluster === 'string') {
                const clusterNum = parseInt(cluster);
                if (!isNaN(clusterNum)) {
                  optimized = true;
                  return clusterNum;
                }
              }
              return cluster;
            });

            // Optimisation des bindings
            if (endpoint.bindings) {
              endpoint.bindings = endpoint.bindings.map(binding => {
                if (typeof binding === 'string') {
                  const bindingNum = parseInt(binding);
                  if (!isNaN(bindingNum)) {
                    optimized = true;
                    return bindingNum;
                  }
                }
                return binding;
              });
            }
          }
        });
      }

      // Ajout des métadonnées SDK3
      if (!driverData.metadata) {
        driverData.metadata = {};
      }
      
      driverData.metadata.sdk3_optimized = true;
      driverData.metadata.sdk3_version = SDK3_CONFIG.version;
      driverData.metadata.optimization_date = new Date().toISOString();

      // Sauvegarde du driver optimisé
      fs.writeFileSync(driverComposePath, JSON.stringify(driverData, null, 2));
      
      if (optimized) {
        this.stats.drivers_optimized++;
        this.logSuccess(`Driver optimisé: ${driverPath}`);
      }

      this.stats.drivers_processed++;
      return true;

    } catch (error) {
      this.logError(`Erreur lors de l'optimisation de ${driverPath}: ${error.message}`);
      this.stats.errors++;
      return false;
    }
  }

  /**
   * Optimise tous les drivers
   */
  async optimizeAllDrivers() {
    console.log(chalk.blue('🚀 Démarrage de l\'optimisation SDK3...'));
    
    const driversDir = path.join(process.cwd(), 'drivers');
    
    if (!fs.existsSync(driversDir)) {
      this.logError('Dossier drivers non trouvé');
      return false;
    }

    const driverDirs = fs.readdirSync(driversDir)
      .filter(item => fs.statSync(path.join(driversDir, item)).isDirectory());

    console.log(chalk.yellow(`📁 ${driverDirs.length} drivers trouvés`));

    for (const driverDir of driverDirs) {
      const driverPath = path.join(driversDir, driverDir);
      this.optimizeDriver(driverPath);
    }

    return true;
  }

  /**
   * Génère le rapport d'optimisation
   */
  generateReport() {
    const report = {
      timestamp: new Date().toISOString(),
      sdk3_version: SDK3_CONFIG.version,
      stats: this.stats,
      recommendations: []
    };

    if (this.stats.errors > 0) {
      report.recommendations.push('Vérifier les erreurs d\'optimisation');
    }

    if (this.stats.warnings > 0) {
      report.recommendations.push('Revoir les warnings d\'optimisation');
    }

    if (this.stats.drivers_optimized > 0) {
      report.recommendations.push(`${this.stats.drivers_optimized} drivers ont été optimisés`);
    }

    // Sauvegarde du rapport
    const reportPath = path.join(process.cwd(), 'reports', 'sdk3-optimization-report.json');
    const reportsDir = path.dirname(reportPath);
    
    if (!fs.existsSync(reportsDir)) {
      fs.mkdirSync(reportsDir, { recursive: true });
    }

    fs.writeFileSync(reportPath, JSON.stringify(report, null, 2));
    
    return report;
  }

  /**
   * Affiche les statistiques
   */
  displayStats() {
    console.log(chalk.green('\n📊 RAPPORT D\'OPTIMISATION SDK3'));
    console.log(chalk.green('================================'));
    console.log(chalk.blue(`Drivers traités: ${this.stats.drivers_processed}`));
    console.log(chalk.green(`Drivers optimisés: ${this.stats.drivers_optimized}`));
    console.log(chalk.yellow(`Warnings: ${this.stats.warnings}`));
    console.log(chalk.red(`Erreurs: ${this.stats.errors}`));
  }

  // Méthodes de logging
  logSuccess(message) {
    console.log(chalk.green(`✅ ${message}`));
  }

  logWarning(message) {
    console.log(chalk.yellow(`⚠️  ${message}`));
    this.stats.warnings++;
  }

  logError(message) {
    console.log(chalk.red(`❌ ${message}`));
    this.stats.errors++;
  }
}

// Exécution principale
async function main() {
  try {
    const optimizer = new SDK3Optimizer();
    
    await optimizer.optimizeAllDrivers();
    
    const report = optimizer.generateReport();
    optimizer.displayStats();
    
    console.log(chalk.blue(`\n📄 Rapport sauvegardé: reports/sdk3-optimization-report.json`));
    
    if (report.stats.errors === 0) {
      console.log(chalk.green('\n🎉 Optimisation SDK3 terminée avec succès !'));
      process.exit(0);
    } else {
      console.log(chalk.yellow('\n⚠️  Optimisation terminée avec des erreurs'));
      process.exit(1);
    }

  } catch (error) {
    console.error(chalk.red(`\n💥 Erreur fatale: ${error.message}`));
    process.exit(1);
  }
}

// Exécution si appelé directement
if (require.main === module) {
  main();
}

module.exports = SDK3Optimizer;
