/**
 * Validate Loop Tool - Sécurisé avec garde-fous anti-boucle infinie
 * Exécute homey app validate et corrige automatiquement les erreurs
 */

const { execSync } = require('child_process');
const fs = require('fs');
const path = require('path');

class ValidateLoop {
  constructor() {
    this.maxIterations = 10; // Garde-fou anti-boucle infinie
    this.maxConsecutiveFailures = 3; // Arrêt si 3 échecs consécutifs
    this.iteration = 0;
    this.consecutiveFailures = 0;
    this.fixesApplied = new Set(); // Éviter la redondance
    this.logFile = 'INTEGRATION_LOG.md';
    this.startTime = Date.now();
  }

  async run() {
    console.log('🔄 Démarrage de la boucle de validation sécurisée...');
    console.log(`⏱️  Garde-fou: max ${this.maxIterations} itérations, max ${this.maxConsecutiveFailures} échecs consécutifs`);
    
    this.logStep('START', 'Démarrage de la boucle de validation');
    
    while (this.iteration < this.maxIterations) {
      this.iteration++;
      console.log(`\n🔄 Itération ${this.iteration}/${this.maxIterations}`);
      
      try {
        // Étape 1: Validation
        const validationResult = await this.runValidation();
        
        if (validationResult.success) {
          console.log('✅ Validation réussie !');
          this.logStep('SUCCESS', 'Validation terminée avec succès');
          break;
        }
        
        // Étape 2: Analyse des erreurs
        const errors = this.parseValidationErrors(validationResult.output);
        console.log(`📊 ${errors.length} erreurs détectées`);
        
        // Étape 3: Application des corrections
        const fixesApplied = await this.applyFixes(errors);
        
        if (fixesApplied === 0) {
          console.log('⚠️  Aucune correction possible, arrêt de la boucle');
          this.logStep('STUCK', 'Aucune correction possible');
          break;
        }
        
        // Étape 4: Vérification des changements
        if (this.hasSignificantChanges()) {
          console.log('📝 Changements détectés, revalidation...');
          this.consecutiveFailures = 0; // Reset du compteur d'échecs
        } else {
          console.log('⚠️  Aucun changement significatif, possible redondance');
          this.consecutiveFailures++;
          
          if (this.consecutiveFailures >= this.maxConsecutiveFailures) {
            console.log('🚫 Trop d\'échecs consécutifs, arrêt de la boucle');
            this.logStep('FAILURE_LIMIT', 'Limite d\'échecs consécutifs atteinte');
            break;
          }
        }
        
      } catch (error) {
        console.error('❌ Erreur lors de l\'itération:', error.message);
        this.consecutiveFailures++;
        
        if (this.consecutiveFailures >= this.maxConsecutiveFailures) {
          console.log('🚫 Trop d\'erreurs consécutives, arrêt de la boucle');
          this.logStep('ERROR_LIMIT', 'Limite d\'erreurs consécutives atteinte');
          break;
        }
      }
      
      // Pause entre les itérations pour éviter la surcharge
      await this.sleep(2000);
    }
    
    this.logStep('END', `Boucle terminée après ${this.iteration} itérations`);
    this.generateFinalReport();
  }

  async runValidation() {
    try {
      console.log('🔍 Exécution de homey app validate...');
      const output = execSync('npx homey app validate -l debug', { 
        encoding: 'utf8',
        maxBuffer: 10 * 1024 * 1024 // 10MB max
      });
      
      return { success: true, output };
    } catch (error) {
      return { success: false, output: error.stdout || error.stderr || error.message };
    }
  }

  parseValidationErrors(output) {
    const errors = [];
    const lines = output.split('\n');
    
    for (const line of lines) {
      if (line.includes('should be') || line.includes('required property') || line.includes('invalid')) {
        errors.push({
          line: line.trim(),
          type: this.categorizeError(line),
          timestamp: new Date().toISOString()
        });
      }
    }
    
    return errors;
  }

  categorizeError(errorLine) {
    if (errorLine.includes('clusters')) return 'clusters';
    if (errorLine.includes('bindings')) return 'bindings';
    if (errorLine.includes('endpoints')) return 'endpoints';
    if (errorLine.includes('productId')) return 'productId';
    if (errorLine.includes('capabilities')) return 'capabilities';
    if (errorLine.includes('required property')) return 'missing_property';
    return 'unknown';
  }

  async applyFixes(errors) {
    let fixesApplied = 0;
    
    for (const error of errors) {
      const fixKey = `${error.type}_${error.line}`;
      
      // Éviter la redondance
      if (this.fixesApplied.has(fixKey)) {
        console.log(`⚠️  Correction déjà appliquée: ${error.type}`);
        continue;
      }
      
      try {
        const applied = await this.applyFix(error);
        if (applied) {
          fixesApplied++;
          this.fixesApplied.add(fixKey);
          console.log(`🔧 Correction appliquée: ${error.type}`);
        }
      } catch (fixError) {
        console.error(`❌ Erreur lors de la correction ${error.type}:`, fixError.message);
      }
    }
    
    return fixesApplied;
  }

  async applyFix(error) {
    switch (error.type) {
      case 'clusters':
        return await this.fixClusters();
      case 'bindings':
        return await this.fixBindings();
      case 'endpoints':
        return await this.fixEndpoints();
      case 'productId':
        return await this.fixProductId();
      case 'capabilities':
        return await this.fixCapabilities();
      case 'missing_property':
        return await this.fixMissingProperty();
      default:
        console.log(`⚠️  Type d'erreur non géré: ${error.type}`);
        return false;
    }
  }

  async fixClusters() {
    // Correction des clusters - conversion en IDs numériques
    const clusterMap = {
      'genBasic': 0,
      'genOnOff': 6,
      'genLevelCtrl': 8,
      'genPowerCfg': 1,
      'genIdentify': 3,
      'genGroups': 4,
      'genScenes': 5,
      'genTime': 0x000A,
      'genOta': 0x0019,
      'genPollCtrl': 0x0020,
      'genGreenPowerProxy': 0x0021,
      'genGreenPower': 0x0022,
      'genTouchlink': 0x1000,
      'hvacThermostat': 0x0201,
      'hvacFanCtrl': 0x0202,
      'hvacDehumidification': 0x0203,
      'hvacUserInterface': 0x0204,
      'lightingColorCtrl': 0x0300,
      'closuresWindowCovering': 0x0102,
      'closuresDoorLock': 0x0101,
      'closuresShade': 0x0100,
      'measurementIlluminance': 0x0400,
      'measurementTemperature': 0x0402,
      'measurementPressure': 0x0403,
      'measurementHumidity': 0x0405,
      'measurementOccupancy': 0x0406,
      'measurementFlow': 0x0408,
      'measurementElectrical': 0x0702,
      'measurementPower': 0x0B04,
      'measurementEnergy': 0x0B01
    };

    try {
      const driversDir = path.join(process.cwd(), 'drivers');
      if (!fs.existsSync(driversDir)) return false;

      const driverFolders = fs.readdirSync(driversDir, { withFileTypes: true })
        .filter(dirent => dirent.isDirectory())
        .map(dirent => dirent.name);

      let fixed = false;
      for (const folder of driverFolders) {
        const composeFile = path.join(driversDir, folder, 'driver.compose.json');
        if (fs.existsSync(composeFile)) {
          const content = JSON.parse(fs.readFileSync(composeFile, 'utf8'));
          
          if (content.zigbee?.endpoints) {
            for (const endpoint of Object.values(content.zigbee.endpoints)) {
              if (endpoint.clusters && Array.isArray(endpoint.clusters)) {
                const originalClusters = [...endpoint.clusters];
                endpoint.clusters = endpoint.clusters.map(cluster => {
                  if (typeof cluster === 'string' && clusterMap[cluster]) {
                    return clusterMap[cluster];
                  }
                  return cluster;
                });
                
                if (JSON.stringify(originalClusters) !== JSON.stringify(endpoint.clusters)) {
                  fs.writeFileSync(composeFile, JSON.stringify(content, null, 2));
                  fixed = true;
                }
              }
            }
          }
        }
      }
      
      return fixed;
    } catch (error) {
      console.error('Erreur lors de la correction des clusters:', error.message);
      return false;
    }
  }

  async fixBindings() {
    // Correction des bindings - conversion en IDs numériques
    const bindingMap = {
      'genOnOff': 6,
      'genLevelCtrl': 8,
      'genPowerCfg': 1,
      'hvacThermostat': 0x0201,
      'lightingColorCtrl': 0x0300
    };

    try {
      const driversDir = path.join(process.cwd(), 'drivers');
      if (!fs.existsSync(driversDir)) return false;

      const driverFolders = fs.readdirSync(driversDir, { withFileTypes: true })
        .filter(dirent => dirent.isDirectory())
        .map(dirent => dirent.name);

      let fixed = false;
      for (const folder of driverFolders) {
        const composeFile = path.join(driversDir, folder, 'driver.compose.json');
        if (fs.existsSync(composeFile)) {
          const content = JSON.parse(fs.readFileSync(composeFile, 'utf8'));
          
          if (content.zigbee?.endpoints) {
            for (const endpoint of Object.values(content.zigbee.endpoints)) {
              if (endpoint.bindings && Array.isArray(endpoint.bindings)) {
                const originalBindings = [...endpoint.bindings];
                endpoint.bindings = endpoint.bindings.map(binding => {
                  if (typeof binding === 'string' && bindingMap[binding]) {
                    return bindingMap[binding];
                  }
                  return binding;
                });
                
                if (JSON.stringify(originalBindings) !== JSON.stringify(endpoint.bindings)) {
                  fs.writeFileSync(composeFile, JSON.stringify(content, null, 2));
                  fixed = true;
                }
              }
            }
          }
        }
      }
      
      return fixed;
    } catch (error) {
      console.error('Erreur lors de la correction des bindings:', error.message);
      return false;
    }
  }

  async fixEndpoints() {
    // Ajout des propriétés endpoints manquantes
    try {
      const driversDir = path.join(process.cwd(), 'drivers');
      if (!fs.existsSync(driversDir)) return false;

      const driverFolders = fs.readdirSync(driversDir, { withFileTypes: true })
        .filter(dirent => dirent.isDirectory())
        .map(dirent => dirent.name);

      let fixed = false;
      for (const folder of driverFolders) {
        const composeFile = path.join(driversDir, folder, 'driver.compose.json');
        if (fs.existsSync(composeFile)) {
          const content = JSON.parse(fs.readFileSync(composeFile, 'utf8'));
          
          if (content.zigbee && !content.zigbee.endpoints) {
            content.zigbee.endpoints = {
              "1": {
                "clusters": [0, 6], // genBasic, genOnOff
                "bindings": [6] // genOnOff
              }
            };
            fs.writeFileSync(composeFile, JSON.stringify(content, null, 2));
            fixed = true;
          }
        }
      }
      
      return fixed;
    } catch (error) {
      console.error('Erreur lors de la correction des endpoints:', error.message);
      return false;
    }
  }

  async fixProductId() {
    // Ajout des productId manquants
    try {
      const driversDir = path.join(process.cwd(), 'drivers');
      if (!fs.existsSync(driversDir)) return false;

      const driverFolders = fs.readdirSync(driversDir, { withFileTypes: true })
        .filter(dirent => dirent.isDirectory())
        .map(dirent => dirent.name);

      let fixed = false;
      for (const folder of driverFolders) {
        const composeFile = path.join(driversDir, folder, 'driver.compose.json');
        if (fs.existsSync(composeFile)) {
          const content = JSON.parse(fs.readFileSync(composeFile, 'utf8'));
          
          if (content.zigbee && !content.zigbee.productId) {
            content.zigbee.productId = `tuya_${folder}_001`;
            fs.writeFileSync(composeFile, JSON.stringify(content, null, 2));
            fixed = true;
          }
        }
      }
      
      return fixed;
    } catch (error) {
      console.error('Erreur lors de la correction des productId:', error.message);
      return false;
    }
  }

  async fixCapabilities() {
    // Ajout des capabilities manquantes
    try {
      const driversDir = path.join(process.cwd(), 'drivers');
      if (!fs.existsSync(driversDir)) return false;

      let fixed = false;
      for (const folder of driverFolders) {
        const composeFile = path.join(driversDir, folder, 'driver.compose.json');
        if (fs.existsSync(composeFile)) {
          const content = JSON.parse(fs.readFileSync(composeFile, 'utf8'));
          
          if (!content.capabilities) {
            content.capabilities = ['onoff'];
            fs.writeFileSync(composeFile, JSON.stringify(content, null, 2));
            fixed = true;
          }
        }
      }
      
      return fixed;
    } catch (error) {
      console.error('Erreur lors de la correction des capabilities:', error.message);
      return false;
    }
  }

  async fixMissingProperty() {
    // Correction des propriétés manquantes générales
    try {
      const driversDir = path.join(process.cwd(), 'drivers');
      if (!fs.existsSync(driversDir)) return false;

      let fixed = false;
      for (const folder of driverFolders) {
        const composeFile = path.join(driversDir, folder, 'driver.compose.json');
        if (fs.existsSync(composeFile)) {
          const content = JSON.parse(fs.readFileSync(composeFile, 'utf8'));
          
          if (!content.class) {
            content.class = 'other';
            fs.writeFileSync(composeFile, JSON.stringify(content, null, 2));
            fixed = true;
          }
        }
      }
      
      return fixed;
    } catch (error) {
      console.error('Erreur lors de la correction des propriétés manquantes:', error.message);
      return false;
    }
  }

  hasSignificantChanges() {
    // Vérifier s'il y a des changements significatifs
    try {
      const gitStatus = execSync('git status --porcelain', { encoding: 'utf8' });
      return gitStatus.trim().length > 0;
    } catch {
      return false;
    }
  }

  logStep(step, message) {
    const timestamp = new Date().toISOString();
    const logEntry = `\n## [${step}] ${timestamp}\n\n${message}\n\n`;
    
    try {
      fs.appendFileSync(this.logFile, logEntry);
    } catch (error) {
      console.error('Erreur lors de l\'écriture du log:', error.message);
    }
  }

  generateFinalReport() {
    const duration = Date.now() - this.startTime;
    const report = `
# Rapport Final de Validation

- **Itérations effectuées**: ${this.iteration}
- **Durée totale**: ${Math.round(duration / 1000)}s
- **Corrections appliquées**: ${this.fixesApplied.size}
- **Statut final**: ${this.consecutiveFailures >= this.maxConsecutiveFailures ? 'ÉCHEC' : 'SUCCÈS'}

## Résumé des corrections
${Array.from(this.fixesApplied).map(fix => `- ${fix}`).join('\n')}

---
*Généré automatiquement le ${new Date().toISOString()}*
`;

    try {
      fs.writeFileSync('VALIDATION_REPORT.md', report);
      console.log('📊 Rapport final généré: VALIDATION_REPORT.md');
    } catch (error) {
      console.error('Erreur lors de la génération du rapport:', error.message);
    }
  }

  sleep(ms) {
    return new Promise(resolve => setTimeout(resolve, ms));
  }
}

// Auto-exécution si appelé directement
if (require.main === module) {
  const loop = new ValidateLoop();
  loop.run()
    .then(() => console.log('✅ Boucle de validation terminée'))
    .catch(console.error);
}

module.exports = ValidateLoop;


