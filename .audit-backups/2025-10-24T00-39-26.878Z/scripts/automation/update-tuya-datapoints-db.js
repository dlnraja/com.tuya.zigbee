/**
 * TUYA DATAPOINTS DATABASE UPDATER
 * 
 * Mise à jour automatique de la base de données Tuya datapoints
 * Sources:
 * - Zigbee2MQTT
 * - Home Assistant ZHA
 * - Forum interviews
 * - GitHub issues
 * - Tuya official docs
 * 
 * Intègre toutes les données non-standard et propriétaires
 */

const fs = require('fs').promises;
const path = require('path');

class TuyaDatapointsDBUpdater {

  constructor() {
    this.sourcesPath = path.join(__dirname, '../../data/sources');
    this.dbPath = path.join(__dirname, '../../utils/parsers/tuya-datapoints-database.js');
    this.existingDB = null;
    this.newDatapoints = {};
    this.stats = {
      total_sources: 0,
      new_datapoints: 0,
      updated_datapoints: 0,
      total_datapoints: 0
    };
  }

  /**
   * Point d'entrée principal
   */
  async update() {
    console.log('🔄 Tuya Datapoints DB Updater - Starting...');
    
    try {
      // 1. Charger DB existante
      console.log('📥 Loading existing database...');
      await this.loadExistingDB();
      console.log(`✅ Loaded ${Object.keys(this.existingDB).length} device types`);
      
      // 2. Charger sources
      console.log('📚 Loading external sources...');
      await this.loadAllSources();
      console.log(`✅ Loaded ${this.stats.total_sources} sources`);
      
      // 3. Merger datapoints
      console.log('🔀 Merging datapoints...');
      await this.mergeDatapoints();
      console.log(`✅ ${this.stats.new_datapoints} new, ${this.stats.updated_datapoints} updated`);
      
      // 4. Valider structure
      console.log('✔️  Validating structure...');
      await this.validateStructure();
      console.log('✅ Structure valid');
      
      // 5. Sauvegarder DB
      console.log('💾 Saving updated database...');
      await this.saveDB();
      console.log('✅ Database saved');
      
      // 6. Générer documentation
      console.log('📝 Generating documentation...');
      await this.generateDocumentation();
      console.log('✅ Documentation generated');
      
      return {
        success: true,
        stats: this.stats
      };
      
    } catch (error) {
      console.error('❌ Update failed:', error.message);
      return {
        success: false,
        error: error.message
      };
    }
  }

  /**
   * Charger DB existante
   */
  async loadExistingDB() {
    try {
      // Import existing module
      const dbModule = require(this.dbPath);
      this.existingDB = dbModule;
      
      // Compter total datapoints
      for (const deviceType in this.existingDB) {
        if (typeof this.existingDB[deviceType] === 'object') {
          this.stats.total_datapoints += Object.keys(this.existingDB[deviceType]).length;
        }
      }
      
    } catch (error) {
      console.warn('No existing DB found, creating new one');
      this.existingDB = {};
    }
  }

  /**
   * Charger toutes les sources
   */
  async loadAllSources() {
    const sources = [
      'zigbee2mqtt',
      'home-assistant-zha',
      'blakadder',
      'forum-interviews',
      'github-issues',
      'tuya-docs'
    ];
    
    for (const source of sources) {
      const sourcePath = path.join(this.sourcesPath, source);
      
      try {
        // Charger tuya-datapoints.json si existe
        const datapointsPath = path.join(sourcePath, 'tuya-datapoints.json');
        const content = await fs.readFile(datapointsPath, 'utf8');
        const datapoints = JSON.parse(content);
        
        // Merger dans newDatapoints
        for (const dp in datapoints) {
          if (!this.newDatapoints[dp]) {
            this.newDatapoints[dp] = {
              sources: [],
              names: new Set(),
              types: new Set(),
              capabilities: new Set(),
              parsers: []
            };
          }
          
          this.newDatapoints[dp].sources.push(source);
          
          // Ajouter noms
          if (datapoints[dp].names) {
            datapoints[dp].names.forEach(name => {
              this.newDatapoints[dp].names.add(name);
            });
          }
          
          // Ajouter types
          if (datapoints[dp].types) {
            datapoints[dp].types.forEach(type => {
              this.newDatapoints[dp].types.add(type);
            });
          }
        }
        
        this.stats.total_sources++;
        
      } catch (error) {
        console.warn(`Could not load source ${source}:`, error.message);
      }
    }
  }

  /**
   * Merger datapoints
   */
  async mergeDatapoints() {
    // Device types standards
    const DEVICE_TYPES = [
      'GAS_DETECTOR',
      'SMOKE_DETECTOR',
      'MOTION_SENSOR',
      'MULTI_SENSOR',
      'WATER_LEAK',
      'DOOR_WINDOW',
      'SOS_BUTTON',
      'BUTTON',
      'THERMOSTAT',
      'CURTAIN',
      'SWITCH',
      'DIMMER',
      'RGB_LIGHT',
      'AIR_QUALITY',
      'CO2_SENSOR',
      'COMMON'
    ];
    
    // Datapoints connus par device type
    const KNOWN_DATAPOINTS = {
      GAS_DETECTOR: {
        1: { name: 'gas_alarm', type: 'bool', capability: 'alarm_smoke' },
        13: { name: 'co_alarm', type: 'bool', capability: 'alarm_co' },
        2: { name: 'gas_sensitivity', type: 'enum', values: { 0: 'low', 1: 'medium', 2: 'high' } }
      },
      SMOKE_DETECTOR: {
        1: { name: 'smoke_alarm', type: 'bool', capability: 'alarm_smoke' },
        14: { name: 'battery_percentage', type: 'value', capability: 'measure_battery' },
        15: { name: 'tamper', type: 'bool', capability: 'alarm_tamper' }
      },
      MULTI_SENSOR: {
        101: { name: 'temperature', type: 'value', capability: 'measure_temperature', divide: 10 },
        102: { name: 'humidity', type: 'value', capability: 'measure_humidity' },
        103: { name: 'battery', type: 'value', capability: 'measure_battery' },
        104: { name: 'illuminance', type: 'value', capability: 'measure_luminance' },
        105: { name: 'motion', type: 'bool', capability: 'alarm_motion' }
      },
      WATER_LEAK: {
        15: { name: 'water_leak', type: 'bool', capability: 'alarm_water' },
        14: { name: 'battery_percentage', type: 'value', capability: 'measure_battery' }
      },
      THERMOSTAT: {
        16: { name: 'target_temperature', type: 'value', capability: 'target_temperature', divide: 10 },
        24: { name: 'current_temperature', type: 'value', capability: 'measure_temperature', divide: 10 },
        2: { name: 'mode', type: 'enum', capability: 'thermostat_mode', values: { 0: 'auto', 1: 'manual', 2: 'holiday' } },
        107: { name: 'child_lock', type: 'bool', capability: 'lock_child' },
        45: { name: 'fault', type: 'bitmap', capability: 'alarm_fault' }
      },
      CURTAIN: {
        1: { name: 'control', type: 'enum', values: { 0: 'open', 1: 'stop', 2: 'close' } },
        2: { name: 'position', type: 'value', capability: 'windowcoverings_set', max: 100 },
        5: { name: 'direction', type: 'enum', values: { 0: 'forward', 1: 'reverse' } }
      },
      RGB_LIGHT: {
        20: { name: 'onoff', type: 'bool', capability: 'onoff' },
        22: { name: 'brightness', type: 'value', capability: 'dim', max: 1000 },
        24: { name: 'color', type: 'hex_color', capability: 'light_hue' },
        25: { name: 'color_temp', type: 'value', capability: 'light_temperature' },
        21: { name: 'mode', type: 'enum', values: { 'white': 'white', 'colour': 'color', 'scene': 'scene' } }
      },
      AIR_QUALITY: {
        2: { name: 'pm25', type: 'value', capability: 'measure_pm25' },
        18: { name: 'co2', type: 'value', capability: 'measure_co2' },
        19: { name: 'voc', type: 'value', capability: 'measure_voc' },
        22: { name: 'formaldehyde', type: 'value', capability: 'measure_formaldehyde', divide: 1000 }
      }
    };
    
    // Merger avec DB existante
    for (const deviceType of DEVICE_TYPES) {
      if (!this.existingDB[deviceType]) {
        this.existingDB[deviceType] = {};
      }
      
      // Ajouter datapoints connus
      if (KNOWN_DATAPOINTS[deviceType]) {
        for (const dp in KNOWN_DATAPOINTS[deviceType]) {
          const dpId = parseInt(dp);
          
          if (!this.existingDB[deviceType][dpId]) {
            this.existingDB[deviceType][dpId] = KNOWN_DATAPOINTS[deviceType][dp];
            this.stats.new_datapoints++;
          } else {
            // Merger info
            const existing = this.existingDB[deviceType][dpId];
            const new_dp = KNOWN_DATAPOINTS[deviceType][dp];
            
            // Ajouter capability si manquant
            if (!existing.capability && new_dp.capability) {
              existing.capability = new_dp.capability;
              this.stats.updated_datapoints++;
            }
            
            // Ajouter parser info si manquant
            if (!existing.divide && new_dp.divide) {
              existing.divide = new_dp.divide;
              this.stats.updated_datapoints++;
            }
            
            if (!existing.max && new_dp.max) {
              existing.max = new_dp.max;
              this.stats.updated_datapoints++;
            }
            
            if (!existing.values && new_dp.values) {
              existing.values = new_dp.values;
              this.stats.updated_datapoints++;
            }
          }
        }
      }
      
      // Ajouter datapoints depuis sources externes
      for (const dp in this.newDatapoints) {
        const dpId = parseInt(dp);
        
        // Essayer de mapper au bon device type
        const names = Array.from(this.newDatapoints[dp].names);
        
        if (this.shouldAddToDeviceType(names, deviceType)) {
          if (!this.existingDB[deviceType][dpId]) {
            this.existingDB[deviceType][dpId] = {
              name: names[0],
              type: Array.from(this.newDatapoints[dp].types)[0] || 'unknown',
              capability: this.inferCapability(names[0])
            };
            this.stats.new_datapoints++;
          }
        }
      }
    }
  }

  /**
   * Déterminer si datapoint devrait être ajouté à device type
   */
  shouldAddToDeviceType(names, deviceType) {
    const keywords = {
      GAS_DETECTOR: ['gas', 'co', 'alarm', 'sensitivity'],
      SMOKE_DETECTOR: ['smoke', 'fire', 'alarm', 'tamper'],
      MULTI_SENSOR: ['temperature', 'humidity', 'illuminance', 'motion', 'battery'],
      WATER_LEAK: ['water', 'leak', 'flood'],
      THERMOSTAT: ['temperature', 'target', 'mode', 'heating', 'valve'],
      CURTAIN: ['position', 'control', 'open', 'close', 'direction'],
      RGB_LIGHT: ['color', 'brightness', 'hue', 'saturation', 'temperature'],
      AIR_QUALITY: ['pm25', 'co2', 'voc', 'formaldehyde', 'aqi']
    };
    
    const deviceKeywords = keywords[deviceType] || [];
    
    for (const name of names) {
      const nameLower = name.toLowerCase();
      for (const keyword of deviceKeywords) {
        if (nameLower.includes(keyword)) {
          return true;
        }
      }
    }
    
    return false;
  }

  /**
   * Inférer capability depuis nom datapoint
   */
  inferCapability(name) {
    const CAPABILITY_MAP = {
      'temperature': 'measure_temperature',
      'humidity': 'measure_humidity',
      'battery': 'measure_battery',
      'illuminance': 'measure_luminance',
      'motion': 'alarm_motion',
      'water': 'alarm_water',
      'leak': 'alarm_water',
      'gas': 'alarm_smoke',
      'smoke': 'alarm_smoke',
      'co': 'alarm_co',
      'pm25': 'measure_pm25',
      'co2': 'measure_co2',
      'voc': 'measure_voc',
      'onoff': 'onoff',
      'brightness': 'dim',
      'position': 'windowcoverings_set'
    };
    
    const nameLower = name.toLowerCase();
    
    for (const keyword in CAPABILITY_MAP) {
      if (nameLower.includes(keyword)) {
        return CAPABILITY_MAP[keyword];
      }
    }
    
    return null;
  }

  /**
   * Valider structure
   */
  async validateStructure() {
    // Vérifier que chaque device type a structure valide
    for (const deviceType in this.existingDB) {
      if (typeof this.existingDB[deviceType] !== 'object') {
        throw new Error(`Invalid device type: ${deviceType}`);
      }
      
      for (const dp in this.existingDB[deviceType]) {
        const datapoint = this.existingDB[deviceType][dp];
        
        if (!datapoint.name) {
          throw new Error(`Missing name for DP ${dp} in ${deviceType}`);
        }
        
        if (!datapoint.type) {
          throw new Error(`Missing type for DP ${dp} in ${deviceType}`);
        }
      }
    }
  }

  /**
   * Sauvegarder DB
   */
  async saveDB() {
    // Générer module JavaScript
    let dbContent = `/**
 * TUYA DATAPOINTS DATABASE
 * 
 * Base de données complète des datapoints Tuya pour tous types de devices
 * 
 * Sources:
 * - Zigbee2MQTT
 * - Home Assistant ZHA
 * - Blakadder Database
 * - Forum Homey Community
 * - GitHub Issues/PRs
 * - Tuya Official Documentation
 * 
 * Auto-généré le: ${new Date().toISOString()}
 * Total device types: ${Object.keys(this.existingDB).length}
 * Total datapoints: ${this.stats.total_datapoints + this.stats.new_datapoints}
 */

module.exports = ${JSON.stringify(this.existingDB, null, 2)};
`;

    await fs.writeFile(this.dbPath, dbContent);
    
    // Créer backup
    const backupPath = this.dbPath.replace('.js', `.backup.${Date.now()}.js`);
    await fs.writeFile(backupPath, dbContent);
  }

  /**
   * Générer documentation
   */
  async generateDocumentation() {
    let doc = `# Tuya Datapoints Database

**Auto-généré le:** ${new Date().toISOString()}

## 📊 Statistiques

- **Device Types:** ${Object.keys(this.existingDB).length}
- **Total Datapoints:** ${this.stats.total_datapoints + this.stats.new_datapoints}
- **New Datapoints:** ${this.stats.new_datapoints}
- **Updated Datapoints:** ${this.stats.updated_datapoints}

## 📚 Device Types

`;

    for (const deviceType in this.existingDB) {
      const datapoints = this.existingDB[deviceType];
      const dpCount = Object.keys(datapoints).length;
      
      doc += `### ${deviceType} (${dpCount} datapoints)\n\n`;
      doc += `| DP | Name | Type | Capability | Parser |\n`;
      doc += `|----|------|------|------------|--------|\n`;
      
      for (const dp in datapoints) {
        const info = datapoints[dp];
        const parser = info.divide ? `÷${info.divide}` : (info.max ? `/${info.max}` : '-');
        doc += `| ${dp} | ${info.name} | ${info.type} | ${info.capability || '-'} | ${parser} |\n`;
      }
      
      doc += `\n`;
    }
    
    const docPath = path.join(__dirname, '../../docs/TUYA_DATAPOINTS_DATABASE.md');
    await fs.writeFile(docPath, doc);
  }

}

// Run if called directly
if (require.main === module) {
  const updater = new TuyaDatapointsDBUpdater();
  updater.update().then(result => {
    console.log('\n📊 Final Result:', result);
    process.exit(result.success ? 0 : 1);
  });
}

module.exports = TuyaDatapointsDBUpdater;
