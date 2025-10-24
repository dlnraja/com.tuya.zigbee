#!/usr/bin/env node
'use strict';

const fs = require('fs').promises;
const path = require('path');

/**
 * ULTIMATE DEEP CATEGORIZATION & FLOW CARDS
 * Deep research from forum + references to correctly categorize all drivers
 * and add comprehensive flow cards
 */

class UltimateDeepCategorization {
  constructor() {
    this.appJsonPath = path.join(__dirname, '../../app.json');
    this.referencesPath = path.join(__dirname, '../../references');
    this.githubAnalysisPath = path.join(__dirname, '../../github-analysis');
    
    // Deep category knowledge base from research
    this.categoryKnowledgeBase = {
      // SENSORS - All monitoring devices
      sensor: {
        keywords: [
          'sensor', 'detector', 'monitor', 'pir', 'motion', 'occupancy', 'presence',
          'temperature', 'temp', 'humidity', 'humid', 'climate', 'weather',
          'contact', 'door', 'window', 'entry', 'magnetic',
          'water', 'leak', 'flood', 'moisture', 'wet',
          'smoke', 'fire', 'co', 'carbon', 'gas', 'air_quality', 'voc', 'tvoc',
          'pm25', 'pm2.5', 'particulate',
          'vibration', 'shock', 'earthquake',
          'noise', 'sound', 'acoustic', 'db',
          'lux', 'illuminance', 'light_sensor', 'brightness',
          'soil', 'plant', 'garden',
          'multi', 'multisensor', '3in1', '4in1', '5in1',
          'radar', 'mmwave', 'microwave'
        ],
        manufacturerPatterns: [
          'TS0202', 'TS0203', 'TS0205', 'TS0207', 'TS0222', 'TS0225', 'TS0201',
          '_TZ3000_', '_TZE200_', '_TZ3210_' // Common sensor manufacturer prefixes
        ],
        capabilities: [
          'alarm_motion', 'alarm_contact', 'alarm_smoke', 'alarm_co', 'alarm_water',
          'measure_temperature', 'measure_humidity', 'measure_luminance',
          'measure_pressure', 'measure_co2', 'measure_pm25', 'measure_noise'
        ]
      },

      // LIGHTS - All lighting devices
      light: {
        keywords: [
          'bulb', 'lamp', 'light', 'led', 'strip', 'tape', 'ribbon',
          'spot', 'downlight', 'ceiling', 'panel',
          'rgb', 'rgbw', 'rgbcct', 'rgbww', 'tunable', 'color', 'colour',
          'dimmer', 'dimmable', 'brightness',
          'white', 'warm', 'cool', 'cct', 'temperature_light'
        ],
        manufacturerPatterns: [
          'TS0502', 'TS0503', 'TS0504', 'TS0505', 'TS0505B',
          '_TZ3210_', '_TYZB01_', '_TYZB02_'
        ],
        capabilities: [
          'onoff', 'dim', 'light_hue', 'light_saturation', 'light_temperature', 'light_mode'
        ]
      },

      // SOCKETS - Plugs and power outlets
      socket: {
        keywords: [
          'plug', 'socket', 'outlet', 'power', 'energy', 'meter',
          'wall_switch', 'in_wall', 'relay',
          'usb', 'charger',
          '16a', '10a', '13a', 'amp'
        ],
        manufacturerPatterns: [
          'TS011F', 'TS0121', '_TZ3000_g5xawfcq', '_TZ3000_cehuw1lw'
        ],
        capabilities: [
          'onoff', 'measure_power', 'meter_power', 'measure_voltage', 'measure_current'
        ],
        exclude: ['battery', 'wireless', 'remote', 'scene', 'button']
      },

      // BUTTONS - Wireless switches and scene controllers
      button: {
        keywords: [
          'button', 'remote', 'wireless', 'scene', 'controller',
          'switch_battery', 'switch_cr2032', 'switch_cr2450',
          'fob', 'keyfob', 'keypad',
          'sos', 'emergency', 'panic',
          'dimmer_battery', 'scroll'
        ],
        manufacturerPatterns: [
          'TS0041', 'TS0042', 'TS0043', 'TS0044', 'TS004F',
          '_TZ3000_xabckq1v', '_TZ3000_vp6clf9d'
        ],
        capabilities: [
          'button', 'button.1', 'button.2', 'button.3', 'button.4',
          'measure_battery'
        ],
        requireAny: ['battery', 'cr2032', 'cr2450', 'wireless', 'remote']
      },

      // THERMOSTATS - Climate control
      thermostat: {
        keywords: [
          'thermostat', 'trv', 'radiator', 'valve', 'heating',
          'climate', 'hvac', 'temperature_control'
        ],
        manufacturerPatterns: [
          'TS0601', '_TZE200_', '_TYST11_'
        ],
        capabilities: [
          'target_temperature', 'measure_temperature', 'thermostat_mode'
        ]
      },

      // WINDOW COVERINGS - Curtains, blinds, shutters
      windowcoverings: {
        keywords: [
          'curtain', 'blind', 'shade', 'shutter', 'roller', 'cover',
          'window', 'door_cover', 'awning', 'screen'
        ],
        manufacturerPatterns: [
          'TS130F', '_TZE200_fctwhugx', '_TZE200_cowvfni3'
        ],
        capabilities: [
          'windowcoverings_set', 'windowcoverings_state', 'windowcoverings_tilt_set'
        ]
      },

      // DOOR/LOCK - Security locks and doorbells
      lock: {
        keywords: [
          'lock', 'deadbolt', 'latch', 'smart_lock'
        ],
        manufacturerPatterns: [
          '_TYZB01_', 'TS0003'
        ],
        capabilities: [
          'locked', 'lock_mode'
        ]
      },

      doorbell: {
        keywords: [
          'doorbell', 'bell', 'chime', 'ring'
        ],
        capabilities: [
          'alarm_generic', 'button'
        ]
      },

      // HOME ALARM - Sirens and alarms
      homealarm: {
        keywords: [
          'siren', 'alarm', 'horn', 'buzzer', 'strobe',
          'sos', 'panic', 'emergency_button'
        ],
        manufacturerPatterns: [
          'TS0216', 'TS0218', '_TZ3000_'
        ],
        capabilities: [
          'alarm_generic', 'onoff'
        ]
      },

      // OTHER specialized categories
      heater: {
        keywords: [
          'heater', 'radiator', 'warming', 'infrared'
        ],
        capabilities: [
          'onoff', 'target_temperature', 'measure_temperature'
        ]
      },

      fan: {
        keywords: [
          'fan', 'ventilator', 'air_circulation'
        ],
        capabilities: [
          'onoff', 'fan_speed', 'dim'
        ]
      },

      other: {
        keywords: [
          'gateway', 'hub', 'bridge', 'repeater', 'extender',
          'ir', 'infrared', 'blaster', 'universal',
          'pet', 'feeder', 'fountain',
          'valve_water', 'irrigation', 'sprinkler',
          'projector', 'screen'
        ]
      }
    };

    // Flow card templates for each category
    this.flowCardTemplates = {
      sensor_motion: {
        trigger: {
          id: 'motion_detected',
          title: { en: 'Motion detected', fr: 'Mouvement détecté' },
          tokens: [
            { name: 'duration', type: 'number', title: { en: 'Duration (s)', fr: 'Durée (s)' } }
          ]
        },
        condition: {
          id: 'motion_active',
          title: { en: 'Motion is active', fr: 'Mouvement actif' }
        }
      },
      sensor_contact: {
        trigger: {
          id: 'contact_changed',
          title: { en: 'Contact changed', fr: 'Contact changé' },
          tokens: [
            { name: 'state', type: 'boolean', title: { en: 'Open', fr: 'Ouvert' } }
          ]
        },
        condition: {
          id: 'contact_open',
          title: { en: 'Contact is open', fr: 'Contact ouvert' }
        }
      },
      sensor_temperature: {
        trigger: {
          id: 'temperature_changed',
          title: { en: 'Temperature changed', fr: 'Température changée' },
          tokens: [
            { name: 'temperature', type: 'number', title: { en: 'Temperature (°C)', fr: 'Température (°C)' } }
          ]
        },
        condition: {
          id: 'temperature_threshold',
          title: { en: 'Temperature above/below', fr: 'Température sup/inf' },
          args: [
            { name: 'threshold', type: 'number', min: -50, max: 100 },
            { name: 'comparison', type: 'dropdown', values: [
              { id: 'above', label: { en: 'Above', fr: 'Supérieur' } },
              { id: 'below', label: { en: 'Below', fr: 'Inférieur' } }
            ]}
          ]
        }
      },
      sensor_humidity: {
        trigger: {
          id: 'humidity_changed',
          title: { en: 'Humidity changed', fr: 'Humidité changée' },
          tokens: [
            { name: 'humidity', type: 'number', title: { en: 'Humidity (%)', fr: 'Humidité (%)' } }
          ]
        }
      },
      light: {
        action_dim: {
          id: 'set_brightness',
          title: { en: 'Set brightness', fr: 'Régler luminosité' },
          args: [
            { name: 'brightness', type: 'range', min: 0, max: 1, step: 0.01 }
          ]
        },
        action_color: {
          id: 'set_color_hue',
          title: { en: 'Set color', fr: 'Définir couleur' },
          args: [
            { name: 'color', type: 'color' }
          ]
        },
        action_temperature: {
          id: 'set_color_temperature',
          title: { en: 'Set white temperature', fr: 'Régler température blanc' },
          args: [
            { name: 'temperature', type: 'range', min: 0, max: 1 }
          ]
        }
      },
      socket: {
        action_toggle: {
          id: 'toggle_power',
          title: { en: 'Toggle power', fr: 'Basculer alimentation' }
        },
        condition_power: {
          id: 'is_consuming',
          title: { en: 'Is consuming power', fr: 'Consomme énergie' },
          args: [
            { name: 'threshold', type: 'number', min: 0, max: 5000 }
          ]
        }
      },
      button: {
        trigger_press: {
          id: 'button_action',
          title: { en: 'Button action', fr: 'Action bouton' },
          args: [
            { name: 'action', type: 'dropdown', values: [
              { id: 'single', label: { en: 'Single press', fr: 'Simple pression' } },
              { id: 'double', label: { en: 'Double press', fr: 'Double pression' } },
              { id: 'long', label: { en: 'Long press', fr: 'Pression longue' } },
              { id: 'release', label: { en: 'Release', fr: 'Relâché' } }
            ]}
          ]
        }
      },
      thermostat: {
        action_set_temp: {
          id: 'set_target_temperature',
          title: { en: 'Set target temperature', fr: 'Régler température cible' },
          args: [
            { name: 'temperature', type: 'number', min: 5, max: 35, step: 0.5 }
          ]
        },
        condition_heating: {
          id: 'is_heating',
          title: { en: 'Is heating', fr: 'En chauffe' }
        }
      },
      windowcoverings: {
        action_position: {
          id: 'set_position',
          title: { en: 'Set position', fr: 'Définir position' },
          args: [
            { name: 'position', type: 'range', min: 0, max: 1, step: 0.01 }
          ]
        },
        action_preset: {
          id: 'go_to_preset',
          title: { en: 'Go to preset', fr: 'Aller à position' },
          args: [
            { name: 'preset', type: 'dropdown', values: [
              { id: 'open', label: { en: 'Open', fr: 'Ouvert' } },
              { id: 'close', label: { en: 'Close', fr: 'Fermé' } },
              { id: 'stop', label: { en: 'Stop', fr: 'Stop' } }
            ]}
          ]
        }
      },
      alarm: {
        action_trigger: {
          id: 'trigger_alarm',
          title: { en: 'Trigger alarm', fr: 'Déclencher alarme' },
          args: [
            { name: 'duration', type: 'number', min: 1, max: 300, units: 's' }
          ]
        },
        action_silence: {
          id: 'silence_alarm',
          title: { en: 'Silence alarm', fr: 'Couper alarme' }
        }
      }
    };

    this.results = {
      recategorized: 0,
      flowCardsAdded: 0,
      manufacturersAnalyzed: 0,
      references: {}
    };
  }

  async run() {
    console.log('🚀 ULTIMATE DEEP CATEGORIZATION - Starting...\n');
    console.log('='.repeat(70));
    
    // Phase 1: Load all references
    await this.loadReferences();
    
    // Phase 2: Deep categorization
    await this.deepCategorizeDrivers();
    
    // Phase 3: Add comprehensive flow cards
    await this.addComprehensiveFlowCards();
    
    // Phase 4: Generate report
    await this.generateReport();
    
    console.log('\n✅ ULTIMATE DEEP CATEGORIZATION COMPLETE!\n');
  }

  async loadReferences() {
    console.log('\n📚 PHASE 1: Loading All References\n');
    
    try {
      // Load GitHub analysis
      const issuesPath = path.join(this.githubAnalysisPath, 'all_issues.json');
      const issues = JSON.parse(await fs.readFile(issuesPath, 'utf8'));
      this.results.references.githubIssues = issues.length;
      console.log(`  ✅ GitHub Issues: ${issues.length} loaded`);
      
      // Load Blakadder database
      const blakadderPath = path.join(this.referencesPath, 'BLAKADDER_DEVICES.json');
      const blakadder = JSON.parse(await fs.readFile(blakadderPath, 'utf8'));
      this.results.references.blakadderDevices = Object.keys(blakadder).length;
      console.log(`  ✅ Blakadder Database: ${Object.keys(blakadder).length} devices`);
      
      // Load Tuya complete database
      const tuyaPath = path.join(this.referencesPath, 'TUYA_COMPLETE_DATABASE.json');
      const tuya = JSON.parse(await fs.readFile(tuyaPath, 'utf8'));
      this.results.references.tuyaDevices = Object.keys(tuya).length;
      console.log(`  ✅ Tuya Complete Database: ${Object.keys(tuya).length} devices`);
      
      // Store for later use
      this.references = { issues, blakadder, tuya };
      
    } catch (err) {
      console.log(`  ⚠️  Some references not available: ${err.message}`);
      this.references = { issues: [], blakadder: {}, tuya: {} };
    }
  }

  async deepCategorizeDrivers() {
    console.log('\n🔍 PHASE 2: Deep Categorization of All Drivers\n');
    
    const appJson = JSON.parse(await fs.readFile(this.appJsonPath, 'utf8'));
    
    for (const driver of appJson.drivers || []) {
      const analysis = this.analyzeDriver(driver);
      const newCategory = this.determineOptimalCategory(analysis);
      
      if (driver.class !== newCategory) {
        console.log(`  📌 ${driver.id}:`);
        console.log(`     ${driver.class} → ${newCategory}`);
        console.log(`     Reason: ${analysis.reason}`);
        
        driver.class = newCategory;
        this.results.recategorized++;
      }
      
      this.results.manufacturersAnalyzed += driver.zigbee?.manufacturerName?.length || 0;
    }
    
    await fs.writeFile(this.appJsonPath, JSON.stringify(appJson, null, 2));
    
    console.log(`\n  ✅ Recategorized ${this.results.recategorized} drivers`);
    console.log(`  ✅ Analyzed ${this.results.manufacturersAnalyzed} manufacturer IDs`);
  }

  analyzeDriver(driver) {
    const driverName = driver.id.toLowerCase();
    const capabilities = driver.capabilities || [];
    const manufacturers = driver.zigbee?.manufacturerName || [];
    
    const analysis = {
      name: driverName,
      capabilities,
      manufacturers,
      scores: {},
      reason: ''
    };
    
    // Score each category
    for (const [category, knowledge] of Object.entries(this.categoryKnowledgeBase)) {
      let score = 0;
      const reasons = [];
      
      // Check keywords
      for (const keyword of knowledge.keywords || []) {
        if (driverName.includes(keyword)) {
          score += 10;
          reasons.push(`keyword: ${keyword}`);
        }
      }
      
      // Check manufacturer patterns
      for (const pattern of knowledge.manufacturerPatterns || []) {
        if (manufacturers.some(m => m.includes(pattern))) {
          score += 15;
          reasons.push(`manufacturer: ${pattern}`);
        }
      }
      
      // Check capabilities
      for (const cap of knowledge.capabilities || []) {
        if (capabilities.includes(cap)) {
          score += 20;
          reasons.push(`capability: ${cap}`);
        }
      }
      
      // Check exclusions
      if (knowledge.exclude) {
        for (const exclude of knowledge.exclude) {
          if (driverName.includes(exclude)) {
            score -= 50;
            reasons.push(`excluded: ${exclude}`);
          }
        }
      }
      
      // Check requirements
      if (knowledge.requireAny) {
        const hasAny = knowledge.requireAny.some(req => driverName.includes(req));
        if (!hasAny) {
          score -= 30;
        }
      }
      
      analysis.scores[category] = { score, reasons };
    }
    
    return analysis;
  }

  determineOptimalCategory(analysis) {
    // Find category with highest score
    let bestCategory = 'other';
    let bestScore = 0;
    
    for (const [category, data] of Object.entries(analysis.scores)) {
      if (data.score > bestScore) {
        bestScore = data.score;
        bestCategory = category;
      }
    }
    
    // Set reason
    if (analysis.scores[bestCategory]?.reasons?.length > 0) {
      analysis.reason = analysis.scores[bestCategory].reasons.slice(0, 2).join(', ');
    } else {
      analysis.reason = 'default categorization';
    }
    
    return bestCategory;
  }

  async addComprehensiveFlowCards() {
    console.log('\n🎨 PHASE 3: Adding Comprehensive Flow Cards\n');
    
    const appJson = JSON.parse(await fs.readFile(this.appJsonPath, 'utf8'));
    
    // Ensure flow object exists
    if (!appJson.flow) {
      appJson.flow = { triggers: [], conditions: [], actions: [] };
    }
    
    // Get unique driver categories
    const categoriesInUse = [...new Set(appJson.drivers.map(d => d.class))];
    
    console.log(`  Categories in use: ${categoriesInUse.join(', ')}`);
    
    // Add flow cards for each category
    for (const category of categoriesInUse) {
      await this.addFlowCardsForCategory(category, appJson);
    }
    
    await fs.writeFile(this.appJsonPath, JSON.stringify(appJson, null, 2));
    
    console.log(`\n  ✅ Added ${this.results.flowCardsAdded} flow cards`);
  }

  async addFlowCardsForCategory(category, appJson) {
    // Map category to flow card templates
    const templates = this.flowCardTemplates[category] || {};
    
    for (const [type, cards] of Object.entries(templates)) {
      const cardType = type.split('_')[0]; // trigger, condition, or action
      const flowArray = appJson.flow[cardType + 's'];
      
      if (!flowArray) continue;
      
      // Check if card already exists
      const cardId = cards.id;
      if (flowArray.some(c => c.id === cardId)) {
        continue; // Already exists
      }
      
      // Add device filter
      const flowCard = {
        ...cards,
        args: [
          {
            type: 'device',
            name: 'device',
            filter: `driver_id=${category}*`
          },
          ...(cards.args || [])
        ]
      };
      
      // Add titleFormatted
      flowCard.titleFormatted = {
        en: `${flowCard.title.en} [[device]]`,
        fr: `${flowCard.title.fr} [[device]]`
      };
      
      flowArray.push(flowCard);
      this.results.flowCardsAdded++;
      
      console.log(`    ✅ Added ${cardType}: ${cardId} for ${category}`);
    }
  }

  async generateReport() {
    console.log('\n📝 PHASE 4: Generating Report\n');
    
    const report = {
      timestamp: new Date().toISOString(),
      version: '2.15.89',
      summary: {
        drivers_recategorized: this.results.recategorized,
        flow_cards_added: this.results.flowCardsAdded,
        manufacturers_analyzed: this.results.manufacturersAnalyzed,
        references_loaded: this.results.references
      }
    };
    
    const reportPath = path.join(__dirname, '../../reports/ULTIMATE_CATEGORIZATION_v2.15.89.json');
    await fs.writeFile(reportPath, JSON.stringify(report, null, 2));
    
    console.log(`  ✅ Report saved: ${reportPath}`);
    console.log(`\n📊 Summary:`);
    console.log(`    - Drivers Recategorized: ${this.results.recategorized}`);
    console.log(`    - Flow Cards Added: ${this.results.flowCardsAdded}`);
    console.log(`    - Manufacturers Analyzed: ${this.results.manufacturersAnalyzed}`);
  }
}

async function main() {
  const categorization = new UltimateDeepCategorization();
  await categorization.run();
}

main().catch(console.error);
