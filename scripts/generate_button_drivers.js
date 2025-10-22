#!/usr/bin/env node

/**
 * Generate Unified Button Drivers (1, 2, 4, 6, 8 gang)
 * Based on button_3gang template
 */

const fs = require('fs');
const path = require('path');

const BUTTON_COUNTS = [1, 2, 4, 6, 8];
const DRIVERS_DIR = path.join(__dirname, '..', 'drivers');
const TEMPLATE_DIR = path.join(DRIVERS_DIR, 'button_3gang');

// Language translations
const TRANSLATIONS = {
  en: { singular: 'Button', plural: 'Buttons', controller: 'Wireless Controller' },
  fr: { singular: 'Bouton', plural: 'Boutons', controller: 'Contrôleur Sans Fil' },
  nl: { singular: 'Knop', plural: 'Knoppen', controller: 'Draadloze Controller' },
  de: { singular: 'Taste', plural: 'Tasten', controller: 'Drahtlos-Controller' },
  it: { singular: 'Pulsante', plural: 'Pulsanti', controller: 'Controller Wireless' },
  sv: { singular: 'Knapp', plural: 'Knappar', controller: 'Trådlös Kontroller' },
  no: { singular: 'Knapp', plural: 'Knapper', controller: 'Trådløs Kontroller' },
  es: { singular: 'Botón', plural: 'Botones', controller: 'Controlador Inalámbrico' },
  da: { singular: 'Knap', plural: 'Knapper', controller: 'Trådløs Controller' }
};

// Manufacturer IDs by button count
const MANUFACTURER_IDS = {
  1: [
    'TS0041', '_TZ3000_tk3s5tyg', '_TZ3000_tk3s5tya', '_TZ3400_tk3s5tyg',
    '_TZ3000_adkvzooy', '_TZ3000_bi6lpsew', '_TZ3000_qzjcsmar',
    '_TYZB01_qm6djpta', '_TZ3000_czuyt8lz', '_TZ3000_fa9mlvja'
  ],
  2: [
    'TS0042', '_TZ3000_xabckq1v', '_TZ3000_owgcnkrh', '_TZ3000_d0ypg4o2',
    '_TZ3000_peszejy7', '_TZ3000_uri7ongn', '_TZ3000_fq1sxfrj',
    '_TZ3400_key8kk7r', '_TZ3000_ixla93vd'
  ],
  3: [
    'TS0043', '_TZ3000_xabckq1v', '_TZ3000_bi6lpsew', '_TZ3000_a7ouggvs',
    '_TZ3000_vp6clf9d', '_TZ3000_fsiepnrh', '_TZ3000_qmi1cfuq',
    '_TZ3000_zmy1waw6', '_TZ3000_majwnphg', '_TZ3000_26fmupbb',
    '_TZ3000_zmy4lslw', '_TZ3000_nnwehhst', '_TZ3000_axpdxqgu',
    '_TZ3000_dfgbtub0', '_TZ3000_pdevogdj', '_TZ3000_vd43bbfq',
    '_TZ3000_2mbfxlzr', '_TZ3000_bvrlqyj7', '_TZ3000_odygigth',
    '_TZ3000_otvn3lne', '_TZ3000_46t1rvdu', '_TZ3000_fkp5zyho',
    '_TZ3000_ltiqubue', '_TZ3000_g5xawfcq', '_TZ3000_oikiyf3b',
    '_TZ3000_o005nuxx', '_TZ3000_msl6wxk9', '_TZ3000_hgu1dlak'
  ],
  4: [
    'TS0044', '_TZ3000_vp6clf9d', '_TZ3000_xabckq1v', '_TZ3000_ee8nrt2l',
    '_TZ3000_w8jwkczz', '_TZ3000_tk3s5tyg', '_TZ3000_czuyt8lz'
  ],
  6: [
    'TS0046', '_TZ3000_xabckq1v', '_TZ3000_vp6clf9d', '_TZ3000_ee8nrt2l'
  ],
  8: [
    'TS0048', '_TZ3000_vp6clf9d', '_TZ3000_xabckq1v'
  ]
};

// Product IDs (common across all)
const PRODUCT_IDS = ['TS0041', 'TS0042', 'TS0043', 'TS0044', 'TS0046', 'TS0048', 'TS0003', 'TS0013'];

/**
 * Generate driver.compose.json
 */
function generateDriverCompose(buttonCount) {
  const name = {};
  Object.keys(TRANSLATIONS).forEach(lang => {
    const t = TRANSLATIONS[lang];
    name[lang] = `${buttonCount}-${t.plural} ${t.controller}`;
  });

  const endpoints = {};
  for (let i = 1; i <= buttonCount; i++) {
    endpoints[i] = {
      clusters: i === 1 ? [0, 1, 3, 4, 5, 6] : [0, 4, 5, 6],
      bindings: [6, 1]
    };
  }

  return {
    name,
    class: 'button',
    capabilities: ['measure_battery'],
    capabilitiesOptions: {
      measure_battery: {
        title: Object.keys(TRANSLATIONS).reduce((acc, lang) => {
          acc[lang] = lang === 'en' ? 'Battery' : TRANSLATIONS[lang].controller.split(' ')[0];
          return acc;
        }, {})
      }
    },
    energy: {
      batteries: ['CR2032', 'CR2450', 'AAA']
    },
    zigbee: {
      manufacturerName: MANUFACTURER_IDS[buttonCount] || [],
      productId: PRODUCT_IDS,
      endpoints,
      learnmode: {
        image: `/drivers/button_${buttonCount}gang/assets/learnmode.svg`,
        instruction: Object.keys(TRANSLATIONS).reduce((acc, lang) => {
          acc[lang] = lang === 'en' 
            ? 'Press and hold any button for 5 seconds until the LED blinks rapidly'
            : 'Appuyez et maintenez n\'importe quel bouton pendant 5 secondes jusqu\'à ce que la LED clignote rapidement';
          return acc;
        }, {})
      }
    },
    images: {
      small: `/drivers/button_${buttonCount}gang/assets/images/small.png`,
      large: `/drivers/button_${buttonCount}gang/assets/images/large.png`
    },
    platforms: ['local'],
    connectivity: ['zigbee'],
    settings: [
      {
        type: 'group',
        label: Object.keys(TRANSLATIONS).reduce((acc, lang) => {
          acc[lang] = lang === 'en' ? 'Button Detection' : 'Détection Boutons';
          return acc;
        }, {}),
        children: [
          {
            id: 'enable_double_press',
            type: 'checkbox',
            label: Object.keys(TRANSLATIONS).reduce((acc, lang) => {
              acc[lang] = lang === 'en' ? 'Enable Double-Press Detection' : 'Activer Détection Double-Pression';
              return acc;
            }, {}),
            value: true
          },
          {
            id: 'double_press_window',
            type: 'number',
            label: Object.keys(TRANSLATIONS).reduce((acc, lang) => {
              acc[lang] = lang === 'en' ? 'Double-Press Time Window (ms)' : 'Fenêtre Double-Pression (ms)';
              return acc;
            }, {}),
            value: 400,
            min: 200,
            max: 1000,
            step: 50
          },
          {
            id: 'enable_long_press',
            type: 'checkbox',
            label: Object.keys(TRANSLATIONS).reduce((acc, lang) => {
              acc[lang] = lang === 'en' ? 'Enable Long-Press Detection' : 'Activer Détection Pression Longue';
              return acc;
            }, {}),
            value: true
          },
          {
            id: 'long_press_duration',
            type: 'number',
            label: Object.keys(TRANSLATIONS).reduce((acc, lang) => {
              acc[lang] = lang === 'en' ? 'Long-Press Duration (ms)' : 'Durée Pression Longue (ms)';
              return acc;
            }, {}),
            value: 1000,
            min: 500,
            max: 3000,
            step: 100
          }
        ]
      },
      {
        type: 'group',
        label: Object.keys(TRANSLATIONS).reduce((acc, lang) => {
          acc[lang] = lang === 'en' ? 'Battery Management' : 'Gestion Batterie';
          return acc;
        }, {}),
        children: [
          {
            id: 'battery_low_threshold',
            type: 'number',
            label: Object.keys(TRANSLATIONS).reduce((acc, lang) => {
              acc[lang] = lang === 'en' ? 'Low Battery Threshold (%)' : 'Seuil Batterie Faible (%)';
              return acc;
            }, {}),
            value: 20,
            min: 5,
            max: 50,
            step: 5
          },
          {
            id: 'battery_reporting_interval',
            type: 'number',
            label: Object.keys(TRANSLATIONS).reduce((acc, lang) => {
              acc[lang] = lang === 'en' ? 'Battery Reporting Interval (min)' : 'Intervalle Rapport Batterie (min)';
              return acc;
            }, {}),
            value: 60,
            min: 15,
            max: 1440,
            step: 15
          }
        ]
      }
    ]
  };
}

/**
 * Generate device.js
 */
function generateDeviceJs(buttonCount) {
  return `'use strict';

const ButtonDevice = require('../../lib/ButtonDevice');

/**
 * Button${buttonCount}GangDevice - Unified ${buttonCount}-button wireless controller
 * Auto-detects battery type (CR2032/CR2450/AAA)
 * Handles single/double/long press for each button
 */
class Button${buttonCount}GangDevice extends ButtonDevice {

  async onNodeInit() {
    this.log('Button${buttonCount}GangDevice initializing...');
    
    // Set button count for this device
    this.buttonCount = ${buttonCount};
    
    // Initialize base (power detection + button detection)
    await super.onNodeInit();
    
    this.log('Button${buttonCount}GangDevice initialized - ${buttonCount} button${buttonCount > 1 ? 's' : ''} ready');
  }

  async onDeleted() {
    this.log('Button${buttonCount}GangDevice deleted');
    
    // Cleanup timers
    if (this._clickState) {
      if (this._clickState.clickTimer) {
        clearTimeout(this._clickState.clickTimer);
      }
      if (this._clickState.longPressTimer) {
        clearTimeout(this._clickState.longPressTimer);
      }
    }
  }
}

module.exports = Button${buttonCount}GangDevice;
`;
}

/**
 * Generate driver.js
 */
function generateDriverJs(buttonCount) {
  return `'use strict';

const { ZigBeeDriver } = require('homey-zigbeedriver');

class Button${buttonCount}GangDriver extends ZigBeeDriver {

  async onInit() {
    this.log('Button${buttonCount}GangDriver initialized');
    
    // Register universal flow cards (shared across all button drivers)
    this.registerUniversalFlowCards();
  }

  /**
   * Register universal button flow cards
   * These work for any button device
   */
  registerUniversalFlowCards() {
    // Generic button pressed (any button)
    this.homey.flow.getDeviceTriggerCard('button_pressed')
      .registerRunListener(async (args, state) => {
        return true; // Always trigger
      });

    // Generic double press
    this.homey.flow.getDeviceTriggerCard('button_double_press')
      .registerRunListener(async (args, state) => {
        return true;
      });

    // Generic long press
    this.homey.flow.getDeviceTriggerCard('button_long_press')
      .registerRunListener(async (args, state) => {
        return true;
      });

    // Generic multi press
    this.homey.flow.getDeviceTriggerCard('button_multi_press')
      .registerRunListener(async (args, state) => {
        return true;
      });
  }
}

module.exports = Button${buttonCount}GangDriver;
`;
}

/**
 * Generate driver.flow.compose.json
 */
function generateDriverFlow(buttonCount) {
  const triggers = [
    {
      id: 'button_pressed',
      title: { en: 'Button pressed', fr: 'Bouton appuyé' },
      titleFormatted: { en: 'Button [[button]] pressed', fr: 'Bouton [[button]] appuyé' },
      tokens: [{ name: 'button', type: 'string', title: { en: 'Button', fr: 'Bouton' }, example: '1' }]
    },
    {
      id: 'button_double_press',
      title: { en: 'Button double-pressed', fr: 'Bouton double-cliqué' },
      titleFormatted: { en: 'Button [[button]] double-pressed', fr: 'Bouton [[button]] double-cliqué' },
      tokens: [{ name: 'button', type: 'string', title: { en: 'Button', fr: 'Bouton' }, example: '1' }]
    },
    {
      id: 'button_long_press',
      title: { en: 'Button long-pressed', fr: 'Bouton pressé longtemps' },
      titleFormatted: { en: 'Button [[button]] long-pressed', fr: 'Bouton [[button]] pressé longtemps' },
      tokens: [{ name: 'button', type: 'string', title: { en: 'Button', fr: 'Bouton' }, example: '1' }]
    },
    {
      id: 'button_multi_press',
      title: { en: 'Button multi-pressed', fr: 'Bouton multi-cliqué' },
      titleFormatted: { en: 'Button [[button]] pressed [[count]] times', fr: 'Bouton [[button]] appuyé [[count]] fois' },
      tokens: [
        { name: 'button', type: 'string', title: { en: 'Button', fr: 'Bouton' }, example: '1' },
        { name: 'count', type: 'number', title: { en: 'Press count', fr: 'Nombre de pressions' }, example: 3 }
      ]
    }
  ];

  // Add button-specific triggers
  for (let i = 1; i <= buttonCount; i++) {
    triggers.push(
      { id: `button_${buttonCount}gang_button_${i}_pressed`, title: { en: `Button ${i} pressed`, fr: `Bouton ${i} appuyé` } },
      { id: `button_${buttonCount}gang_button_${i}_double`, title: { en: `Button ${i} double-pressed`, fr: `Bouton ${i} double-cliqué` } },
      { id: `button_${buttonCount}gang_button_${i}_long`, title: { en: `Button ${i} long-pressed`, fr: `Bouton ${i} pressé longtemps` } }
    );
  }

  return { triggers };
}

/**
 * Create driver directory structure
 */
function createDriver(buttonCount) {
  const driverDir = path.join(DRIVERS_DIR, `button_${buttonCount}gang`);
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
    JSON.stringify(generateDriverCompose(buttonCount), null, 2)
  );

  fs.writeFileSync(
    path.join(driverDir, 'device.js'),
    generateDeviceJs(buttonCount)
  );

  fs.writeFileSync(
    path.join(driverDir, 'driver.js'),
    generateDriverJs(buttonCount)
  );

  fs.writeFileSync(
    path.join(driverDir, 'driver.flow.compose.json'),
    JSON.stringify(generateDriverFlow(buttonCount), null, 2)
  );

  // Copy images from template
  const templateImages = path.join(TEMPLATE_DIR, 'assets', 'images');
  const templateLearnmode = path.join(TEMPLATE_DIR, 'assets', 'learnmode.svg');

  if (fs.existsSync(templateImages)) {
    ['small.png', 'large.png', 'xlarge.png'].forEach(img => {
      const src = path.join(templateImages, img);
      const dest = path.join(imagesDir, img);
      if (fs.existsSync(src)) {
        fs.copyFileSync(src, dest);
      }
    });
  }

  if (fs.existsSync(templateLearnmode)) {
    fs.copyFileSync(templateLearnmode, path.join(assetsDir, 'learnmode.svg'));
  }

  console.log(`✅ Created button_${buttonCount}gang driver`);
}

// Main execution
console.log('🚀 Generating unified button drivers...\n');

BUTTON_COUNTS.forEach(count => {
  if (count === 3) {
    console.log(`⏭️  Skipping button_3gang (already exists)`);
    return;
  }
  createDriver(count);
});

console.log('\n✅ All button drivers generated successfully!');
console.log('\nNext steps:');
console.log('1. Run: homey app validate');
console.log('2. Test drivers with real devices');
console.log('3. Update CHANGELOG.md');
