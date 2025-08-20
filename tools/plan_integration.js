/**
 * Integration Planning Tool
 * Compares extracted device candidates with existing drivers and generates integration plan
 */

const fs = require('fs');
const path = require('path');

class IntegrationPlanner {
  constructor() {
    this.researchDir = path.join(__dirname, '../research');
    this.driversDir = path.join(__dirname, '../drivers');
    this.outputFile = path.join(this.researchDir, 'integration_actions.json');
  }

  async initialize() {
    if (!fs.existsSync(this.researchDir)) {
      fs.mkdirSync(this.researchDir, { recursive: true });
    }
    console.log('📋 Integration Planner initialisé');
  }

  async planIntegration() {
    console.log('🚀 Démarrage de la planification d\'intégration...');
    
    // Charger les candidats extraits
    const candidates = await this.loadCandidates();
    
    // Analyser les drivers existants
    const existingDrivers = await this.analyzeExistingDrivers();
    
    // Comparer et générer le plan
    const integrationPlan = this.generateIntegrationPlan(candidates, existingDrivers);
    
    await this.writeOutput(integrationPlan);
    console.log(`✅ Planification terminée: ${integrationPlan.actions.length} actions planifiées`);
    
    return integrationPlan;
  }

  async loadCandidates() {
    const candidatesFile = path.join(this.researchDir, 'device_candidates.json');
    if (!fs.existsSync(candidatesFile)) {
      console.log('⚠️ Fichier candidats non trouvé, utilisation de données mock');
      return this.generateMockCandidates();
    }
    
    const content = await fs.promises.readFile(candidatesFile, 'utf8');
    return JSON.parse(content);
  }

  generateMockCandidates() {
    return {
      extracted_at: new Date().toISOString(),
      total_candidates: 2,
      candidates: [
        {
          device_id: '_TZ3000_abc123',
          manufacturer: 'Tuya',
          model: 'TS0601_switch',
          source: 'forum',
          capabilities: ['onoff'],
          technical_details: {
            clusters: ['genBasic', 'genOnOff'],
            endpoints: [1]
          }
        },
        {
          device_id: '_TZE200_xyz789',
          manufacturer: 'Tuya',
          model: 'TS0601',
          source: 'github',
          capabilities: ['onoff', 'dim'],
          technical_details: {
            clusters: ['genBasic', 'genOnOff', 'genLevelCtrl'],
            endpoints: [1]
          }
        }
      ]
    };
  }

  async analyzeExistingDrivers() {
    const drivers = [];
    
    if (fs.existsSync(this.driversDir)) {
      const driverFolders = fs.readdirSync(this.driversDir, { withFileTypes: true })
        .filter(dirent => dirent.isDirectory())
        .map(dirent => dirent.name);
      
      for (const folder of driverFolders) {
        const driverPath = path.join(this.driversDir, folder);
        const driverInfo = await this.analyzeDriver(driverPath, folder);
        drivers.push(driverInfo);
      }
    }
    
    return drivers;
  }

  async analyzeDriver(driverPath, folderName) {
    const driverInfo = {
      name: folderName,
      path: driverPath,
      hasDevice: fs.existsSync(path.join(driverPath, 'device.js')),
      hasDriver: fs.existsSync(path.join(driverPath, 'driver.js')),
      hasCompose: fs.existsSync(path.join(driverPath, 'driver.compose.json')),
      fingerprints: [],
      capabilities: []
    };
    
    // Analyser le fichier device.js pour les fingerprints
    const deviceFile = path.join(driverPath, 'device.js');
    if (fs.existsSync(deviceFile)) {
      const deviceContent = await fs.promises.readFile(deviceFile, 'utf8');
      driverInfo.fingerprints = this.extractFingerprints(deviceContent);
      driverInfo.capabilities = this.extractCapabilities(deviceContent);
    }
    
    return driverInfo;
  }

  extractFingerprints(content) {
    const fingerprints = [];
    
    // Rechercher les patterns de fingerprints
    const fingerprintPatterns = [
      /_TZ[0-9A-Z_]+/g,
      /_TZE[0-9A-Z_]+/g,
      /_TYZB[0-9A-Z_]+/g,
      /TS[0-9]{3,4}[A-Za-z_]*/g
    ];
    
    for (const pattern of fingerprintPatterns) {
      const matches = content.match(pattern);
      if (matches) {
        fingerprints.push(...matches);
      }
    }
    
    return [...new Set(fingerprints)];
  }

  extractCapabilities(content) {
    const capabilities = [];
    
    // Rechercher les capacités Homey
    const capabilityPatterns = [
      /'onoff'/g,
      /'dim'/g,
      /'measure_power'/g,
      /'measure_temperature'/g,
      /'target_temperature'/g,
      /'measure_humidity'/g
    ];
    
    for (const pattern of capabilityPatterns) {
      const matches = content.match(pattern);
      if (matches) {
        capabilities.push(...matches.map(m => m.replace(/'/g, '')));
      }
    }
    
    return [...new Set(capabilities)];
  }

  generateIntegrationPlan(candidates, existingDrivers) {
    const plan = {
      generated_at: new Date().toISOString(),
      summary: {
        total_candidates: candidates.total_candidates || candidates.candidates?.length || 0,
        total_existing_drivers: existingDrivers.length,
        actions_planned: 0
      },
      actions: []
    };
    
    const candidatesList = candidates.candidates || candidates;
    
    for (const candidate of candidatesList) {
      const action = this.planActionForCandidate(candidate, existingDrivers);
      if (action) {
        plan.actions.push(action);
        plan.summary.actions_planned++;
      }
    }
    
    return plan;
  }

  planActionForCandidate(candidate, existingDrivers) {
    // Vérifier si le device est déjà supporté
    const existingSupport = this.findExistingSupport(candidate, existingDrivers);
    
    if (existingSupport) {
      return {
        type: 'enhance_existing',
        priority: 'medium',
        candidate: candidate.device_id,
        action: `Enhance existing driver ${existingSupport.driver} with additional capabilities`,
        details: {
          driver: existingSupport.driver,
          missing_capabilities: this.findMissingCapabilities(candidate, existingSupport),
          technical_updates: this.planTechnicalUpdates(candidate, existingSupport)
        },
        estimated_effort: 'low'
      };
    } else {
      return {
        type: 'create_new_driver',
        priority: 'high',
        candidate: candidate.device_id,
        action: `Create new driver for ${candidate.device_id}`,
        details: {
          manufacturer: candidate.manufacturer,
          model: candidate.model,
          capabilities: candidate.capabilities,
          technical_requirements: candidate.technical_details,
          suggested_driver_name: this.suggestDriverName(candidate)
        },
        estimated_effort: 'medium'
      };
    }
  }

  findExistingSupport(candidate, existingDrivers) {
    for (const driver of existingDrivers) {
      if (driver.fingerprints.includes(candidate.device_id)) {
        return {
          driver: driver.name,
          capabilities: driver.capabilities,
          fingerprints: driver.fingerprints
        };
      }
    }
    return null;
  }

  findMissingCapabilities(candidate, existingSupport) {
    const missing = [];
    for (const capability of candidate.capabilities || []) {
      if (!existingSupport.capabilities.includes(capability)) {
        missing.push(capability);
      }
    }
    return missing;
  }

  planTechnicalUpdates(candidate, existingSupport) {
    const updates = [];
    
    if (candidate.technical_details?.clusters) {
      updates.push('Update cluster bindings');
    }
    
    if (candidate.technical_details?.endpoints) {
      updates.push('Verify endpoint mapping');
    }
    
    return updates;
  }

  suggestDriverName(candidate) {
    const baseName = candidate.model?.toLowerCase().replace(/[^a-z0-9]/g, '_') || 'unknown';
    return `tuya_${baseName}`;
  }

  async writeOutput(plan) {
    await fs.promises.writeFile(this.outputFile, JSON.stringify(plan, null, 2));
    console.log(`💾 Plan d'intégration sauvegardé: ${this.outputFile}`);
  }
}

// Auto-exécution si appelé directement
if (require.main === module) {
  const planner = new IntegrationPlanner();
  planner.initialize()
    .then(() => planner.planIntegration())
    .then(() => console.log('✅ Planification d\'intégration terminée'))
    .catch(console.error);
}

module.exports = IntegrationPlanner;


