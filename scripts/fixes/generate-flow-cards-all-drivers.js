#!/usr/bin/env node
'use strict';

/**
 * GENERATE FLOW CARDS FOR ALL DRIVERS
 * 
 * Génère automatiquement les flow cards manquantes selon best practices:
 * - Buttons: triggers avec tokens (button, action)
 * - Motion sensors: triggers + conditions
 * - Door/window sensors: triggers + conditions
 * - Climate devices: actions + conditions
 * - Switches: triggers + actions
 * 
 * Fix le problème signalé par Peter: pas de flow cards pour buttons/actions
 * 
 * Usage: node scripts/fixes/generate-flow-cards-all-drivers.js
 */

const fs = require('fs');
const path = require('path');

const ROOT = path.join(__dirname, '../..');
const DRIVERS_DIR = path.join(ROOT, 'drivers');

console.log('🎯 GENERATE FLOW CARDS - ALL DRIVERS\n');

let stats = {
  driversScanned: 0,
  flowCardsGenerated: 0,
  driversModified: 0
};

// =============================================================================
// FLOW CARD TEMPLATES BY DEVICE TYPE
// =============================================================================

const FLOW_TEMPLATES = {
  
  // Buttons, wireless switches, scene controllers
  button: {
    triggers: [
      {
        id: 'button_pressed',
        title: { en: 'Button pressed', fr: 'Bouton appuyé' },
        hint: { en: 'Triggered when a button is pressed' },
        tokens: [
          {
            name: 'button',
            type: 'string',
            title: { en: 'Button', fr: 'Bouton' },
            example: '1'
          },
          {
            name: 'action',
            type: 'string',
            title: { en: 'Action', fr: 'Action' },
            example: 'single'
          }
        ]
      }
    ]
  },
  
  // Motion sensors
  motion: {
    triggers: [
      {
        id: 'motion_detected',
        title: { en: 'Motion detected', fr: 'Mouvement détecté' },
        hint: { en: 'Triggered when motion is detected' }
      },
      {
        id: 'motion_cleared',
        title: { en: 'Motion cleared', fr: 'Mouvement terminé' },
        hint: { en: 'Triggered when motion detection ends' }
      }
    ],
    conditions: [
      {
        id: 'motion_active',
        title: { en: 'Motion is active', fr: 'Mouvement actif' }
      }
    ]
  },
  
  // Door/window sensors
  contact: {
    triggers: [
      {
        id: 'contact_opened',
        title: { en: 'Opened', fr: 'Ouvert' },
        hint: { en: 'Triggered when door/window is opened' }
      },
      {
        id: 'contact_closed',
        title: { en: 'Closed', fr: 'Fermé' },
        hint: { en: 'Triggered when door/window is closed' }
      }
    ],
    conditions: [
      {
        id: 'is_open',
        title: { en: 'Is open', fr: 'Est ouvert' }
      },
      {
        id: 'is_closed',
        title: { en: 'Is closed', fr: 'Est fermé' }
      }
    ]
  },
  
  // SOS emergency button
  sos: {
    triggers: [
      {
        id: 'sos_triggered',
        title: { en: 'SOS triggered', fr: 'SOS déclenché' },
        hint: { en: 'Triggered when SOS button is pressed' }
      }
    ]
  },
  
  // Smart plugs
  plug: {
    actions: [
      {
        id: 'turn_on_duration',
        title: { en: 'Turn on for...', fr: 'Allumer pendant...' },
        titleFormatted: {
          en: 'Turn on for [[duration]] seconds',
          fr: 'Allumer pendant [[duration]] secondes'
        },
        args: [
          {
            name: 'duration',
            type: 'number',
            title: { en: 'Duration (seconds)', fr: 'Durée (secondes)' },
            min: 1,
            max: 86400,
            step: 1
          }
        ]
      }
    ]
  },
  
  // Thermostats
  thermostat: {
    actions: [
      {
        id: 'set_thermostat_mode',
        title: { en: 'Set mode', fr: 'Définir mode' },
        titleFormatted: {
          en: 'Set mode to [[mode]]',
          fr: 'Définir mode à [[mode]]'
        },
        args: [
          {
            name: 'mode',
            type: 'dropdown',
            title: { en: 'Mode', fr: 'Mode' },
            values: [
              { id: 'auto', label: { en: 'Auto', fr: 'Auto' } },
              { id: 'heat', label: { en: 'Heat', fr: 'Chauffage' } },
              { id: 'cool', label: { en: 'Cool', fr: 'Refroidissement' } },
              { id: 'off', label: { en: 'Off', fr: 'Arrêt' } }
            ]
          }
        ]
      }
    ],
    conditions: [
      {
        id: 'mode_is',
        title: { en: 'Mode is...', fr: 'Mode est...' },
        titleFormatted: {
          en: 'Mode !{{is|is not}} [[mode]]',
          fr: 'Mode !{{est|n\'est pas}} [[mode]]'
        },
        args: [
          {
            name: 'mode',
            type: 'dropdown',
            title: { en: 'Mode', fr: 'Mode' },
            values: [
              { id: 'auto', label: { en: 'Auto', fr: 'Auto' } },
              { id: 'heat', label: { en: 'Heat', fr: 'Chauffage' } },
              { id: 'cool', label: { en: 'Cool', fr: 'Refroidissement' } }
            ]
          }
        ]
      }
    ]
  }
};

// =============================================================================
// DETECT DRIVER TYPE
// =============================================================================

function detectDriverType(driverName, composeData) {
  // Button devices
  if (driverName.includes('button') || 
      driverName.includes('switch') && driverName.includes('wireless') ||
      driverName.includes('scene') ||
      driverName.includes('remote')) {
    return 'button';
  }
  
  // Motion sensors
  if (driverName.includes('motion') || 
      driverName.includes('pir') ||
      driverName.includes('radar')) {
    return 'motion';
  }
  
  // Contact sensors
  if (driverName.includes('contact') ||
      driverName.includes('door') ||
      driverName.includes('window')) {
    return 'contact';
  }
  
  // SOS button
  if (driverName.includes('sos') ||
      driverName.includes('emergency')) {
    return 'sos';
  }
  
  // Smart plugs
  if (driverName.includes('plug') ||
      driverName.includes('socket') ||
      driverName.includes('outlet')) {
    return 'plug';
  }
  
  // Thermostats
  if (driverName.includes('thermostat') ||
      driverName.includes('climate')) {
    return 'thermostat';
  }
  
  return null;
}

// =============================================================================
// ADD DEVICE ARG TO ALL CARDS
// =============================================================================

function addDeviceArg(cards, driverName) {
  if (!cards) return cards;
  
  return cards.map(card => {
    // Add device arg if not present
    if (!card.args) {
      card.args = [];
    }
    
    const hasDeviceArg = card.args.some(arg => arg.name === 'device');
    if (!hasDeviceArg) {
      card.args.unshift({
        name: 'device',
        type: 'device',
        filter: `driver_id=${driverName}`
      });
    }
    
    return card;
  });
}

// =============================================================================
// GENERATE FLOW CARDS
// =============================================================================

console.log('='.repeat(80));
console.log('SCANNING DRIVERS');
console.log('='.repeat(80) + '\n');

const drivers = fs.readdirSync(DRIVERS_DIR)
  .filter(d => fs.statSync(path.join(DRIVERS_DIR, d)).isDirectory())
  .filter(d => !d.startsWith('.'));

for (const driverName of drivers) {
  stats.driversScanned++;
  
  const driverPath = path.join(DRIVERS_DIR, driverName);
  const flowComposePath = path.join(driverPath, 'driver.flow.compose.json');
  const driverComposePath = path.join(driverPath, 'driver.compose.json');
  
  // Skip if flow cards already exist
  if (fs.existsSync(flowComposePath)) {
    continue;
  }
  
  // Get driver info
  let composeData = {};
  if (fs.existsSync(driverComposePath)) {
    try {
      composeData = JSON.parse(fs.readFileSync(driverComposePath, 'utf8'));
    } catch (e) {
      // Skip
    }
  }
  
  // Detect driver type
  const driverType = detectDriverType(driverName, composeData);
  
  if (!driverType) {
    continue; // Not a type we want to generate cards for
  }
  
  // Get template
  const template = FLOW_TEMPLATES[driverType];
  if (!template) {
    continue;
  }
  
  // Generate flow cards
  const flowCards = {};
  
  if (template.triggers) {
    flowCards.triggers = addDeviceArg(
      JSON.parse(JSON.stringify(template.triggers)),
      driverName
    );
    stats.flowCardsGenerated += template.triggers.length;
  }
  
  if (template.actions) {
    flowCards.actions = addDeviceArg(
      JSON.parse(JSON.stringify(template.actions)),
      driverName
    );
    stats.flowCardsGenerated += template.actions.length;
  }
  
  if (template.conditions) {
    flowCards.conditions = addDeviceArg(
      JSON.parse(JSON.stringify(template.conditions)),
      driverName
    );
    stats.flowCardsGenerated += template.conditions.length;
  }
  
  // Write driver.flow.compose.json
  fs.writeFileSync(
    flowComposePath,
    JSON.stringify(flowCards, null, 2),
    'utf8'
  );
  
  stats.driversModified++;
  console.log(`✅ ${driverName}: ${driverType} (${Object.keys(flowCards).join(', ')})`);
}

// =============================================================================
// SUMMARY
// =============================================================================

console.log('\n' + '='.repeat(80));
console.log('📊 GENERATION SUMMARY');
console.log('='.repeat(80));

console.log(`\nDrivers scanned: ${stats.driversScanned}`);
console.log(`Drivers modified: ${stats.driversModified}`);
console.log(`Flow cards generated: ${stats.flowCardsGenerated}`);

console.log('\n📋 TYPES DETECTED:');
console.log('  - button: Button triggers with tokens');
console.log('  - motion: Motion triggers + conditions');
console.log('  - contact: Door/window triggers + conditions');
console.log('  - sos: SOS emergency triggers');
console.log('  - plug: Smart plug actions');
console.log('  - thermostat: Thermostat actions + conditions');

console.log('\n⚠️  NEXT STEPS:');
console.log('1. Run: homey app build (to generate flow/*.json)');
console.log('2. Implement registerRunListener in device.js');
console.log('3. Test flow cards in Homey app');
console.log('4. Add more custom cards as needed');

console.log('\n📚 IMPLEMENTATION EXAMPLE (device.js):');
console.log(`
// For button devices:
async onButton(button, action) {
  const buttonPressedTrigger = this.driver.buttonPressedTrigger ||
    this.homey.flow.getDeviceTriggerCard('button_pressed');
  
  await buttonPressedTrigger
    .trigger(this, { button: String(button), action: String(action) })
    .catch(this.error);
}
`);

console.log('\n' + '='.repeat(80));
console.log('✅ Flow cards generation complete!');
console.log('='.repeat(80));

process.exit(0);
