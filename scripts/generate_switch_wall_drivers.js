#!/usr/bin/env node

/**
 * Generate Unified Wall Switch Drivers (1-6 gang + touch variants)
 * Based on hybrid architecture with AC/DC auto-detection
 */

const fs = require('fs');
const path = require('path');

const SWITCH_CONFIGS = [
  { gang: 1, type: 'wall' },
  { gang: 2, type: 'wall' },
  { gang: 3, type: 'wall' },
  { gang: 4, type: 'wall' },
  { gang: 6, type: 'wall' },
  { gang: 1, type: 'touch' },
  { gang: 3, type: 'touch' }
];

const DRIVERS_DIR = path.join(__dirname, '..', 'drivers');

// Manufacturer IDs by gang count and type
const MANUFACTURER_IDS = {
  wall: {
    1: [
      'TS0001', 'TS0011', '_TZ3000_tgddllx4', '_TZ3000_o4cjetlm',
      '_TZ3000_yujkchbz', '_TZ3000_npzfdzhq', '_TZ3000_mx3vgyea',
      '_TZ3000_5ucujjts', '_TZ3000_w0qqde0g', '_TZ3000_pdevogdj',
      '_TYZB01_mtunwanm', '_TZ3000_kdi2o9m6', '_TZ3000_uxuxkcvd'
    ],
    2: [
      'TS0002', 'TS0012', '_TZ3000_18ejxno0', '_TZ3000_nPGIPl5D',
      '_TZ3000_4zf0crgo', '_TZ3000_h1ipgkwn', '_TZ3000_ruxexjfz',
      '_TZ3000_fisb3ajo', '_TYZB01_2gxbngba', '_TZ3000_cehuw1lw'
    ],
    3: [
      'TS0003', 'TS0013', '_TZ3000_pdevogdj', '_TZ3000_vjhcenzo',
      '_TZ3000_odygigth', '_TZ3000_4xfqlgqo', '_TZ3000_mlswgkc3',
      '_TZ3000_excgg5kb', '_TZ3000_qmi1cfuq', '_TYZB01_ncutbjdi'
    ],
    4: [
      'TS0004', 'TS0014', '_TZ3000_tygpud44', '_TZ3000_excgg5kb',
      '_TZ3000_w0qqde0g'
    ],
    6: [
      'TS0006', 'TS0016', '_TZ3000_tygpud44', '_TZ3000_4xfqlgqo'
    ]
  },
  touch: {
    1: [
      'TS0601', '_TZE200_7tdtqgwv', '_TZE200_tz32mtza', '_TZE200_9cxuhakf',
      '_TZE200_2wg5qrjy', '_TZE200_vhy3iakz'
    ],
    3: [
      'TS0601', '_TZE200_go3tvswy', '_TZE200_aqnazj70', '_TZE200_1agwnems',
      '_TZE200_k6jhsr0q'
    ]
  }
};

const PRODUCT_IDS = ['TS0001', 'TS0002', 'TS0003', 'TS0004', 'TS0006', 'TS0011', 'TS0012', 'TS0013', 'TS0014', 'TS0016', 'TS0601'];

/**
 * Generate driver.compose.json
 */
function generateDriverCompose(gang, type) {
  const driverName = `switch_${type}_${gang}gang`;
  
  const name = {
    en: `${gang}-Gang ${type === 'touch' ? 'Touch' : 'Wall'} Switch`,
    fr: `Interrupteur ${type === 'touch' ? 'Tactile' : 'Mural'} ${gang} Gang`,
    nl: `${gang}-Gang ${type === 'touch' ? 'Touch' : 'Muur'} Schakelaar`,
    de: `${gang}-Gang ${type === 'touch' ? 'Touch' : 'Wand'} Schalter`,
    it: `Interruttore ${type === 'touch' ? 'Touch' : 'a Muro'} ${gang} Gang`,
    sv: `${gang}-Gang ${type === 'touch' ? 'Touch' : 'Vägg'} Strömbrytare`,
    no: `${gang}-Gang ${type === 'touch' ? 'Touch' : 'Vegg'} Bryter`,
    es: `Interruptor ${type === 'touch' ? 'Táctil' : 'de Pared'} ${gang} Gang`,
    da: `${gang}-Gang ${type === 'touch' ? 'Touch' : 'Væg'} Kontakt`
  };

  const capabilities = ['onoff'];
  for (let i = 2; i <= gang; i++) {
    capabilities.push(`onoff.switch_${i}`);
  }

  // Add energy monitoring for AC switches
  const energyCapabilities = ['measure_power', 'meter_power', 'measure_voltage', 'measure_current'];
  
  const endpoints = {};
  for (let i = 1; i <= gang; i++) {
    endpoints[i] = {
      clusters: i === 1 ? [0, 3, 4, 5, 6, 1794, 2820] : [4, 5, 6],
      bindings: i === 1 ? [6, 1794] : [6]
    };
  }

  // Add endpoint 242 for OTA
  endpoints[242] = {
    clusters: [],
    bindings: [33]
  };

  return {
    name,
    class: 'socket',
    capabilities,
    capabilitiesOptions: {
      onoff: {
        title: { en: gang === 1 ? 'Switch' : 'Switch 1', fr: gang === 1 ? 'Interrupteur' : 'Interrupteur 1' }
      }
    },
    energy: {
      approximation: {
        usageOn: 0.5,
        usageOff: 0.5
      }
    },
    zigbee: {
      manufacturerName: MANUFACTURER_IDS[type][gang] || [],
      productId: PRODUCT_IDS,
      endpoints,
      learnmode: {
        image: `/drivers/${driverName}/assets/learnmode.svg`,
        instruction: {
          en: 'Press and hold the power button for 5 seconds until the LED blinks',
          fr: 'Appuyez et maintenez le bouton d\'alimentation pendant 5 secondes jusqu\'à ce que la LED clignote'
        }
      }
    },
    images: {
      small: `/drivers/${driverName}/assets/images/small.png`,
      large: `/drivers/${driverName}/assets/images/large.png`
    },
    platforms: ['local'],
    connectivity: ['zigbee'],
    settings: [
      {
        type: 'group',
        label: { en: 'Power Management', fr: 'Gestion Énergie' },
        children: [
          {
            id: 'power_reporting',
            type: 'checkbox',
            label: { en: 'Enable Power Reporting', fr: 'Activer Rapport Énergie' },
            value: true,
            hint: { en: 'Report power consumption (AC only)', fr: 'Rapporter consommation (AC uniquement)' }
          },
          {
            id: 'power_reporting_interval',
            type: 'number',
            label: { en: 'Reporting Interval (seconds)', fr: 'Intervalle Rapport (secondes)' },
            value: 60,
            min: 10,
            max: 3600
          }
        ]
      },
      {
        type: 'group',
        label: { en: 'Switch Behavior', fr: 'Comportement Interrupteur' },
        children: [
          {
            id: 'power_on_behavior',
            type: 'dropdown',
            label: { en: 'Power-On Behavior', fr: 'Comportement au Démarrage' },
            value: 'previous',
            values: [
              { id: 'off', label: { en: 'Always Off', fr: 'Toujours Éteint' } },
              { id: 'on', label: { en: 'Always On', fr: 'Toujours Allumé' } },
              { id: 'previous', label: { en: 'Restore Previous State', fr: 'Restaurer État Précédent' } }
            ]
          },
          {
            id: 'invert_switch',
            type: 'checkbox',
            label: { en: 'Invert Switch Logic', fr: 'Inverser Logique Interrupteur' },
            value: false,
            hint: { en: 'Swap ON/OFF behavior', fr: 'Inverser ON/OFF' }
          }
        ]
      }
    ]
  };
}

/**
 * Generate device.js
 */
function generateDeviceJs(gang, type) {
  const className = `Switch${type.charAt(0).toUpperCase() + type.slice(1)}${gang}GangDevice`;
  
  return `'use strict';

const SwitchDevice = require('../../lib/SwitchDevice');

/**
 * ${className} - Unified ${gang}-gang ${type} switch
 * Auto-detects AC/DC power source
 * Handles ${gang} independent switch${gang > 1 ? 'es' : ''}
 */
class ${className} extends SwitchDevice {

  async onNodeInit() {
    this.log('${className} initializing...');
    
    // Set switch count for this device
    this.switchCount = ${gang};
    this.switchType = '${type}';
    
    // Initialize base (power detection + switch control)
    await super.onNodeInit();
    
    this.log('${className} initialized - ${gang} switch${gang > 1 ? 'es' : ''} ready');
  }

  /**
   * Register capabilities for ${gang} switches
   */
  async registerSwitchCapabilities() {
    // Main switch (endpoint 1)
    this.registerCapability('onoff', this.CLUSTER.ON_OFF, {
      endpoint: 1
    });
    
    ${gang > 1 ? `// Additional switches (endpoints 2-${gang})
    ${Array.from({ length: gang - 1 }, (_, i) => {
      const num = i + 2;
      return `this.registerCapability('onoff.switch_${num}', this.CLUSTER.ON_OFF, {
      endpoint: ${num}
    });`;
    }).join('\n    ')}` : ''}
  }

  async onDeleted() {
    this.log('${className} deleted');
    await super.onDeleted();
  }
}

module.exports = ${className};
`;
}

/**
 * Generate driver.js
 */
function generateDriverJs(gang, type) {
  const className = `Switch${type.charAt(0).toUpperCase() + type.slice(1)}${gang}GangDriver`;
  
  return `'use strict';

const { ZigBeeDriver } = require('homey-zigbeedriver');

class ${className} extends ZigBeeDriver {

  async onInit() {
    this.log('${className} initialized');
  }
}

module.exports = ${className};
`;
}

/**
 * Create driver directory structure
 */
function createDriver(gang, type) {
  const driverName = `switch_${type}_${gang}gang`;
  const driverDir = path.join(DRIVERS_DIR, driverName);
  const assetsDir = path.join(driverDir, 'assets');
  const imagesDir = path.join(assetsDir, 'images');

  // Create directories
  [driverDir, assetsDir, imagesDir].forEach(dir => {
    if (!fs.existsSync(dir)) {
      fs.mkdirSync(dir, { recursive: true });
    }
  });

  // Generate files
  fs.writeFileSync(
    path.join(driverDir, 'driver.compose.json'),
    JSON.stringify(generateDriverCompose(gang, type), null, 2)
  );

  fs.writeFileSync(
    path.join(driverDir, 'device.js'),
    generateDeviceJs(gang, type)
  );

  fs.writeFileSync(
    path.join(driverDir, 'driver.js'),
    generateDriverJs(gang, type)
  );

  // Copy images from existing wall switch driver
  const templateDriver = gang === 1 
    ? 'zemismart_wall_switch_1gang_ac'
    : gang === 3
    ? 'zemismart_wall_switch_3gang_ac'
    : 'zemismart_wall_switch_1gang_ac';
  
  const templateDir = path.join(DRIVERS_DIR, templateDriver);
  const templateImages = path.join(templateDir, 'assets', 'images');
  const templateIcon = path.join(templateDir, 'assets', 'icon.svg');

  if (fs.existsSync(templateImages)) {
    ['small.png', 'large.png', 'xlarge.png'].forEach(img => {
      const src = path.join(templateImages, img);
      const dest = path.join(imagesDir, img);
      if (fs.existsSync(src)) {
        fs.copyFileSync(src, dest);
      }
    });
  }

  if (fs.existsSync(templateIcon)) {
    fs.copyFileSync(templateIcon, path.join(assetsDir, 'learnmode.svg'));
  }

  console.log(`✅ Created ${driverName}`);
}

// Main execution
console.log('🚀 Generating unified wall switch drivers...\n');

SWITCH_CONFIGS.forEach(config => {
  createDriver(config.gang, config.type);
});

console.log('\n✅ All wall switch drivers generated successfully!');
console.log('\nCreated drivers:');
console.log('  - switch_wall_1gang (AC/DC auto-detect)');
console.log('  - switch_wall_2gang (AC/DC auto-detect)');
console.log('  - switch_wall_3gang (AC/DC auto-detect)');
console.log('  - switch_wall_4gang (AC/DC auto-detect)');
console.log('  - switch_wall_6gang (AC/DC auto-detect)');
console.log('  - switch_touch_1gang (Tuya MCU)');
console.log('  - switch_touch_3gang (Tuya MCU)');
console.log('\nNext steps:');
console.log('1. Run: homey app validate');
console.log('2. Test with real devices');
console.log('3. Continue with sensor consolidation');
