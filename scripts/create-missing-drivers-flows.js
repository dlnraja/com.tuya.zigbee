#!/usr/bin/env node
/**
 * 🎯 CREATE MISSING DRIVERS & FLOWS
 * 
 * Crée les drivers manquants identifiés + flows
 * RESPECTE nomenclature UNBRANDED!
 */

const fs = require('fs');
const path = require('path');

// Drivers à créer (nomenclature UNBRANDED!)
const MISSING_DRIVERS = [
  // Advanced Presence (HIGH priority)
  {
    id: 'presence_sensor_fp1_battery',
    name: { en: 'Presence Sensor FP1 (Advanced)', fr: 'Capteur de présence FP1 (Avancé)' },
    class: 'sensor',
    caps: ['alarm_motion', 'measure_battery', 'presence_timeout'],
    mfr: ['lumi.motion.ac01', 'lumi.motion.agl04'],
    clusters: [0, 1, 0xFCC0],
    note: 'Aqara FP1 - mmWave presence detection'
  },
  {
    id: 'presence_sensor_fp2_ac',
    name: { en: 'Presence Sensor FP2 (Zones)', fr: 'Capteur de présence FP2 (Zones)' },
    class: 'sensor',
    caps: ['alarm_motion', 'presence_timeout'],
    mfr: ['lumi.motion.ac02'],
    clusters: [0, 0xFCC0],
    note: 'Aqara FP2 - Multi-zone presence detection'
  },
  
  // IKEA Controllers (MEDIUM priority)
  {
    id: 'sound_controller_battery',
    name: { en: 'Sound Controller (IKEA)', fr: 'Contrôleur audio (IKEA)' },
    class: 'button',
    caps: ['measure_battery'],
    mfr: ['IKEA of Sweden', 'TRADFRI'],
    productId: ['SYMFONISK'],
    clusters: [0, 1, 6, 8],
    note: 'IKEA SYMFONISK Sound Controller'
  },
  {
    id: 'remote_4button_styrbar_battery',
    name: { en: 'Remote 4 Button (IKEA)', fr: 'Télécommande 4 boutons (IKEA)' },
    class: 'button',
    caps: ['measure_battery'],
    mfr: ['IKEA of Sweden'],
    productId: ['STYRBAR', 'E2001', 'E2002'],
    clusters: [0, 1, 6, 8],
    note: 'IKEA STYRBAR Remote Control'
  },
  {
    id: 'shortcut_button_battery',
    name: { en: 'Shortcut Button', fr: 'Bouton raccourci' },
    class: 'button',
    caps: ['measure_battery'],
    mfr: ['IKEA of Sweden'],
    productId: ['SOMRIG', 'E2213'],
    clusters: [0, 1, 6],
    note: 'IKEA SOMRIG Shortcut Button'
  }
];

// Flows à ajouter
const MISSING_FLOWS = {
  triggers: [
    {
      id: 'presence_detected_fp',
      title: { en: 'Presence detected (Advanced)', fr: 'Présence détectée (Avancé)' },
      hint: { en: 'Triggered when advanced presence is detected', fr: 'Déclenché quand présence avancée détectée' },
      tokens: [
        { name: 'zone', type: 'string', title: { en: 'Zone', fr: 'Zone' } }
      ]
    },
    {
      id: 'presence_timeout_fp',
      title: { en: 'Presence timeout', fr: 'Délai présence expiré' },
      hint: { en: 'Triggered when presence timeout expires', fr: 'Déclenché quand délai présence expire' }
    },
    {
      id: 'air_quality_changed',
      title: { en: 'Air quality changed', fr: 'Qualité d\'air changée' },
      hint: { en: 'Triggered when air quality level changes', fr: 'Déclenché quand niveau qualité air change' },
      tokens: [
        { name: 'level', type: 'string', title: { en: 'Level', fr: 'Niveau' } }
      ]
    }
  ],
  
  conditions: [
    {
      id: 'pm25_above',
      title: { en: 'PM2.5 !{{above|below}}', fr: 'PM2.5 !{{au-dessus|en-dessous}}' },
      hint: { en: 'Check if PM2.5 is above threshold', fr: 'Vérifier si PM2.5 dépasse seuil' },
      args: [
        { name: 'threshold', type: 'number', placeholder: { en: 'Threshold', fr: 'Seuil' } }
      ]
    },
    {
      id: 'voc_above',
      title: { en: 'VOC !{{above|below}}', fr: 'COV !{{au-dessus|en-dessous}}' },
      hint: { en: 'Check if VOC is above threshold', fr: 'Vérifier si COV dépasse seuil' },
      args: [
        { name: 'threshold', type: 'number', placeholder: { en: 'Threshold', fr: 'Seuil' } }
      ]
    }
  ],
  
  actions: [
    {
      id: 'set_presence_timeout',
      title: { en: 'Set presence timeout', fr: 'Définir délai présence' },
      hint: { en: 'Set presence detection timeout', fr: 'Définir délai détection présence' },
      args: [
        { name: 'seconds', type: 'number', placeholder: { en: 'Seconds', fr: 'Secondes' } }
      ]
    }
  ]
};

class MissingCreator {
  constructor() {
    this.rootDir = path.resolve(__dirname, '..');
    this.driversDir = path.join(this.rootDir, 'drivers');
    this.flowsDir = path.join(this.rootDir, '.homeycompose', 'flow');
    this.stats = { drivers: 0, flows: 0 };
  }

  log(msg, color = 'reset') {
    const COLORS = { reset: '\x1b[0m', green: '\x1b[32m', cyan: '\x1b[36m', magenta: '\x1b[35m' };
    console.log(`${COLORS[color]}${msg}${COLORS.reset}`);
  }

  createDriver(driver) {
    const driverPath = path.join(this.driversDir, driver.id);
    if (fs.existsSync(driverPath)) {
      this.log(`  ⏭️  ${driver.id}: existe déjà`, 'cyan');
      return;
    }
    
    fs.mkdirSync(driverPath, { recursive: true });
    fs.mkdirSync(path.join(driverPath, 'assets', 'images'), { recursive: true });
    
    // driver.compose.json
    const compose = {
      id: driver.id,
      name: driver.name,
      class: driver.class,
      capabilities: driver.caps,
      platforms: ['local'],
      connectivity: ['zigbee'],
      images: {
        small: '{{driverAssetsPath}}/images/small.png',
        large: '{{driverAssetsPath}}/images/large.png',
        xlarge: '{{driverAssetsPath}}/images/xlarge.png'
      },
      zigbee: {
        manufacturerName: driver.mfr,
        productId: driver.productId || [],
        endpoints: {
          1: {
            clusters: driver.clusters,
            bindings: driver.clusters.includes(6) ? [6] : []
          }
        },
        learnmode: {
          image: '{{driverAssetsPath}}/learnmode.svg',
          instruction: {
            en: 'Follow device pairing instructions',
            fr: 'Suivre les instructions d\'appairage'
          }
        }
      }
    };
    
    fs.writeFileSync(
      path.join(driverPath, 'driver.compose.json'),
      JSON.stringify(compose, null, 2)
    );
    
    // device.js simple
    const deviceJS = `'use strict';

const { ZigBeeDevice } = require('homey-zigbeedriver');
const { CLUSTER } = require('zigbee-clusters');

class ${this.toPascalCase(driver.id)}Device extends ZigBeeDevice {
  
  async onNodeInit({ zclNode }) {
    this.printNode();
    
    // ${driver.note}
    
    this.log('${driver.name.en} initialized');
  }
}

module.exports = ${this.toPascalCase(driver.id)}Device;
`;
    
    fs.writeFileSync(path.join(driverPath, 'device.js'), deviceJS);
    this.stats.drivers++;
    this.log(`  ✅ ${driver.id}`, 'green');
  }

  createFlows() {
    fs.mkdirSync(this.flowsDir, { recursive: true });
    
    // Triggers
    if (MISSING_FLOWS.triggers) {
      const triggersPath = path.join(this.flowsDir, 'triggers.json');
      let triggers = [];
      if (fs.existsSync(triggersPath)) {
        triggers = JSON.parse(fs.readFileSync(triggersPath, 'utf8'));
      }
      
      MISSING_FLOWS.triggers.forEach(trigger => {
        if (!triggers.find(t => t.id === trigger.id)) {
          triggers.push(trigger);
          this.stats.flows++;
          this.log(`  ✅ Trigger: ${trigger.id}`, 'green');
        }
      });
      
      fs.writeFileSync(triggersPath, JSON.stringify(triggers, null, 2));
    }
    
    // Conditions
    if (MISSING_FLOWS.conditions) {
      const conditionsPath = path.join(this.flowsDir, 'conditions.json');
      let conditions = [];
      if (fs.existsSync(conditionsPath)) {
        conditions = JSON.parse(fs.readFileSync(conditionsPath, 'utf8'));
      }
      
      MISSING_FLOWS.conditions.forEach(condition => {
        if (!conditions.find(c => c.id === condition.id)) {
          conditions.push(condition);
          this.stats.flows++;
          this.log(`  ✅ Condition: ${condition.id}`, 'green');
        }
      });
      
      fs.writeFileSync(conditionsPath, JSON.stringify(conditions, null, 2));
    }
    
    // Actions
    if (MISSING_FLOWS.actions) {
      const actionsPath = path.join(this.flowsDir, 'actions.json');
      let actions = [];
      if (fs.existsSync(actionsPath)) {
        actions = JSON.parse(fs.readFileSync(actionsPath, 'utf8'));
      }
      
      MISSING_FLOWS.actions.forEach(action => {
        if (!actions.find(a => a.id === action.id)) {
          actions.push(action);
          this.stats.flows++;
          this.log(`  ✅ Action: ${action.id}`, 'green');
        }
      });
      
      fs.writeFileSync(actionsPath, JSON.stringify(actions, null, 2));
    }
  }

  toPascalCase(str) {
    return str.split('_').map(w => w.charAt(0).toUpperCase() + w.slice(1)).join('');
  }

  async run() {
    this.log('\n╔══════════════════════════════════════════════════════════════════════╗', 'magenta');
    this.log('║     🎯 CREATE MISSING DRIVERS & FLOWS                               ║', 'magenta');
    this.log('╚══════════════════════════════════════════════════════════════════════╝\n', 'magenta');
    
    this.log('📦 Création drivers manquants (UNBRANDED):\n', 'cyan');
    MISSING_DRIVERS.forEach(d => this.createDriver(d));
    
    this.log('\n🔄 Création flows manquants:\n', 'cyan');
    this.createFlows();
    
    this.log('\n═══════════════════════════════════════════════════════════════════════', 'magenta');
    this.log(`  ✅ Drivers créés: ${this.stats.drivers}`, 'green');
    this.log(`  ✅ Flows ajoutés: ${this.stats.flows}`, 'green');
    this.log('═══════════════════════════════════════════════════════════════════════\n', 'magenta');
    this.log('✅ CRÉATION TERMINÉE!\n', 'green');
  }
}

if (require.main === module) {
  const creator = new MissingCreator();
  creator.run().catch(err => {
    console.error('❌ Erreur:', err);
    process.exit(1);
  });
}

module.exports = MissingCreator;
