#!/usr/bin/env node

/**
 * AUTO SYNC DRIVERS TO APP.JSON
 * 
 * Synchronise automatiquement tous les drivers du dossier drivers/ vers app.json
 * Corrige le problème des drivers "invisibles" dans l'app
 * 
 * @version 2.1.42
 * @author Dylan Rajasekaram
 */

const fs = require('fs');
const path = require('path');

const colors = {
  reset: '\x1b[0m',
  green: '\x1b[32m',
  yellow: '\x1b[33m',
  blue: '\x1b[34m',
  red: '\x1b[31m'
};

class AutoSyncDrivers {
  constructor() {
    this.rootDir = path.join(__dirname, '..');
    this.driversAdded = [];
    this.driversUpdated = [];
  }

  log(msg, color = 'blue') {
    console.log(`${colors[color]}${msg}${colors.reset}`);
  }

  async run() {
    try {
      this.log('\n' + '='.repeat(80), 'blue');
      this.log('🔄 AUTO SYNC DRIVERS TO APP.JSON', 'blue');
      this.log('='.repeat(80) + '\n', 'blue');

      // Lire app.json
      const appJsonPath = path.join(this.rootDir, 'app.json');
      const appJson = JSON.parse(fs.readFileSync(appJsonPath, 'utf-8'));

      // Lire tous les drivers du dossier
      const driversDir = path.join(this.rootDir, 'drivers');
      const driverFolders = fs.readdirSync(driversDir).filter(dir => {
        return fs.statSync(path.join(driversDir, dir)).isDirectory();
      });

      this.log(`📁 Drivers dans dossier: ${driverFolders.length}`, 'blue');
      this.log(`📋 Drivers dans app.json: ${appJson.drivers ? appJson.drivers.length : 0}\n`, 'blue');

      // Créer un map des drivers existants dans app.json
      const existingDrivers = new Map();
      if (appJson.drivers) {
        appJson.drivers.forEach(driver => {
          existingDrivers.set(driver.id, driver);
        });
      }

      // Vérifier chaque driver du dossier
      for (const driverId of driverFolders) {
        const driverPath = path.join(driversDir, driverId);
        const composePath = path.join(driverPath, 'driver.compose.json');

        if (!fs.existsSync(composePath)) {
          this.log(`⚠ ${driverId}: Pas de driver.compose.json`, 'yellow');
          continue;
        }

        try {
          const compose = JSON.parse(fs.readFileSync(composePath, 'utf-8'));

          if (!existingDrivers.has(driverId)) {
            // Driver manquant dans app.json - l'ajouter
            this.log(`✅ AJOUT: ${driverId}`, 'green');
            
            const driverEntry = {
              id: driverId,
              ...compose
            };

            if (!appJson.drivers) {
              appJson.drivers = [];
            }
            appJson.drivers.push(driverEntry);
            this.driversAdded.push(driverId);
          } else {
            // Driver existe - vérifier si mise à jour nécessaire
            const existing = existingDrivers.get(driverId);
            const needsUpdate = JSON.stringify(existing) !== JSON.stringify({ id: driverId, ...compose });

            if (needsUpdate) {
              this.log(`🔄 UPDATE: ${driverId}`, 'yellow');
              // Remplacer le driver
              const index = appJson.drivers.findIndex(d => d.id === driverId);
              if (index !== -1) {
                appJson.drivers[index] = { id: driverId, ...compose };
                this.driversUpdated.push(driverId);
              }
            }
          }
        } catch (error) {
          this.log(`❌ ${driverId}: Erreur JSON - ${error.message}`, 'red');
        }
      }

      // Sauvegarder app.json
      if (this.driversAdded.length > 0 || this.driversUpdated.length > 0) {
        fs.writeFileSync(appJsonPath, JSON.stringify(appJson, null, 2), 'utf-8');
        
        this.log('\n' + '='.repeat(80), 'green');
        this.log('✅ SYNCHRONISATION TERMINÉE', 'green');
        this.log('='.repeat(80), 'green');
        this.log(`\n📊 Drivers ajoutés: ${this.driversAdded.length}`, 'green');
        this.log(`📊 Drivers mis à jour: ${this.driversUpdated.length}`, 'yellow');
        
        if (this.driversAdded.length > 0) {
          this.log('\n📝 Drivers ajoutés:', 'green');
          this.driversAdded.forEach(d => this.log(`   - ${d}`, 'green'));
        }
        
        if (this.driversUpdated.length > 0) {
          this.log('\n📝 Drivers mis à jour:', 'yellow');
          this.driversUpdated.forEach(d => this.log(`   - ${d}`, 'yellow'));
        }

        this.log('\n✅ app.json sauvegardé avec succès!\n', 'green');
      } else {
        this.log('\n✅ Tous les drivers sont déjà synchronisés!\n', 'green');
      }

    } catch (error) {
      this.log(`\n❌ ERREUR: ${error.message}\n`, 'red');
      console.error(error);
      process.exit(1);
    }
  }
}

if (require.main === module) {
  const sync = new AutoSyncDrivers();
  sync.run();
}

module.exports = AutoSyncDrivers;
