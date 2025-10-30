#!/usr/bin/env node

/**
 * AUTOMATIC FLOW CARDS GENERATOR
 * 
 * Scans all drivers and generates flow cards automatically based on:
 * - Driver capabilities (temperature, humidity, motion, contact, etc.)
 * - Driver class (button, sensor, thermostat, etc.)
 * - Existing flow cards patterns
 * 
 * This ensures NO FLOW CARD IS MISSING and all drivers have complete flows!
 * 
 * Usage: node scripts/automation/generate-flow-cards-auto.js
 */

const fs = require('fs');
const path = require('path');

// Flow card templates based on capability
const FLOW_CARD_TEMPLATES = {
  // TEMPERATURE
  'measure_temperature': {
    trigger: {
      id: '_temperature_changed',
      title: { en: 'Temperature changed', fr: 'Température changée' },
      tokens: [
        { name: 'current', type: 'number', title: { en: 'Current (°C)', fr: 'Actuel (°C)' } },
        { name: 'previous', type: 'number', title: { en: 'Previous (°C)', fr: 'Précédent (°C)' } },
        { name: 'change', type: 'number', title: { en: 'Change (°C)', fr: 'Changement (°C)' } }
      ]
    }
  },
  
  // HUMIDITY
  'measure_humidity': {
    trigger: {
      id: '_humidity_changed',
      title: { en: 'Humidity changed', fr: 'Humidité changée' },
      tokens: [
        { name: 'current', type: 'number', title: { en: 'Current (%)', fr: 'Actuel (%)' } },
        { name: 'previous', type: 'number', title: { en: 'Previous (%)', fr: 'Précédent (%)' } },
        { name: 'change', type: 'number', title: { en: 'Change (%)', fr: 'Changement (%)' } }
      ]
    }
  },
  
  // MOTION
  'alarm_motion': {
    triggers: [
      {
        id: '_motion_detected',
        title: { en: 'Motion detected', fr: 'Mouvement détecté' },
        tokens: [
          { name: 'timestamp', type: 'string', title: { en: 'Timestamp', fr: 'Horodatage' } }
        ]
      },
      {
        id: '_motion_stopped',
        title: { en: 'Motion stopped', fr: 'Mouvement arrêté' },
        tokens: [
          { name: 'duration', type: 'number', title: { en: 'Duration (s)', fr: 'Durée (s)' } },
          { name: 'timestamp', type: 'string', title: { en: 'Timestamp', fr: 'Horodatage' } }
        ]
      }
    ]
  },
  
  // CONTACT
  'alarm_contact': {
    triggers: [
      {
        id: '_contact_opened',
        title: { en: 'Contact opened', fr: 'Contact ouvert' },
        tokens: [
          { name: 'duration_closed', type: 'number', title: { en: 'Was closed for (s)', fr: 'Fermé pendant (s)' } },
          { name: 'timestamp', type: 'string', title: { en: 'Timestamp', fr: 'Horodatage' } }
        ]
      },
      {
        id: '_contact_closed',
        title: { en: 'Contact closed', fr: 'Contact fermé' },
        tokens: [
          { name: 'duration_open', type: 'number', title: { en: 'Was open for (s)', fr: 'Ouvert pendant (s)' } },
          { name: 'timestamp', type: 'string', title: { en: 'Timestamp', fr: 'Horodatage' } }
        ]
      }
    ]
  },
  
  // BATTERY
  'measure_battery': {
    triggers: [
      {
        id: '_battery_low',
        title: { en: 'Battery low', fr: 'Batterie faible' },
        tokens: [
          { name: 'battery', type: 'number', title: { en: 'Battery (%)', fr: 'Batterie (%)' } },
          { name: 'voltage', type: 'number', title: { en: 'Voltage (V)', fr: 'Tension (V)' } }
        ]
      },
      {
        id: '_battery_critical',
        title: { en: 'Battery critical', fr: 'Batterie critique' },
        tokens: [
          { name: 'battery', type: 'number', title: { en: 'Battery (%)', fr: 'Batterie (%)' } },
          { name: 'voltage', type: 'number', title: { en: 'Voltage (V)', fr: 'Tension (V)' } }
        ]
      }
    ]
  },
  
  // BUTTON PRESS
  'button': {
    trigger: {
      id: '_button_pressed',
      title: { en: 'Button pressed', fr: 'Bouton appuyé' },
      tokens: [
        { name: 'button', type: 'string', title: { en: 'Button', fr: 'Bouton' }, example: '1' },
        { name: 'action', type: 'string', title: { en: 'Action', fr: 'Action' }, example: 'single' }
      ],
      args: [
        {
          name: 'button',
          type: 'dropdown',
          title: { en: 'Button', fr: 'Bouton' },
          values: '$dynamic' // Will be generated per driver
        },
        {
          name: 'action',
          type: 'dropdown',
          title: { en: 'Action', fr: 'Action' },
          values: [
            { id: 'single', title: { en: 'Single press', fr: 'Appui simple' } },
            { id: 'double', title: { en: 'Double press', fr: 'Double appui' } },
            { id: 'long', title: { en: 'Long press', fr: 'Appui long' } }
          ]
        }
      ]
    }
  }
};

/**
 * Scan drivers directory
 */
function scanDrivers(driversPath) {
  console.log('[SCAN] Reading drivers directory:', driversPath);
  
  const drivers = [];
  const driverDirs = fs.readdirSync(driversPath);
  
  for (const driverDir of driverDirs) {
    const driverPath = path.join(driversPath, driverDir);
    const stat = fs.statSync(driverPath);
    
    if (!stat.isDirectory()) continue;
    
    // Check for driver.compose.json or driver.json
    const composeFile = path.join(driverPath, 'driver.compose.json');
    const jsonFile = path.join(driverPath, 'driver.json');
    
    let driverData = null;
    
    if (fs.existsSync(composeFile)) {
      driverData = JSON.parse(fs.readFileSync(composeFile, 'utf8'));
    } else if (fs.existsSync(jsonFile)) {
      driverData = JSON.parse(fs.readFileSync(jsonFile, 'utf8'));
    }
    
    if (driverData) {
      drivers.push({
        id: driverDir,
        data: driverData,
        path: driverPath
      });
    }
  }
  
  console.log(`[SCAN] Found ${drivers.length} drivers`);
  return drivers;
}

/**
 * Generate flow cards for a driver based on capabilities
 */
function generateFlowCardsForDriver(driver) {
  const flowCards = [];
  const capabilities = driver.data.capabilities || [];
  const driverClass = driver.data.class || 'sensor';
  const driverId = driver.id;
  
  console.log(`[GEN] Generating flow cards for: ${driverId} (class: ${driverClass})`);
  console.log(`[GEN]   Capabilities: ${capabilities.join(', ')}`);
  
  // Special handling for button drivers
  if (driverClass === 'button' || driverId.includes('button') || driverId.includes('switch')) {
    const buttonCount = extractButtonCount(driverId);
    const buttonTemplate = JSON.parse(JSON.stringify(FLOW_CARD_TEMPLATES['button'].trigger));
    
    // Generate button dropdown values
    const buttonValues = [];
    for (let i = 1; i <= buttonCount; i++) {
      buttonValues.push({
        id: String(i),
        title: { en: `Button ${i}`, fr: `Bouton ${i}` }
      });
    }
    
    // Remove the template id to avoid duplication
    delete buttonTemplate.id;
    
    // Create flow card with correct ID format
    const gangSuffix = buttonCount > 1 ? `_${buttonCount}gang` : '';
    const flowCard = {
      id: `${driverId}${gangSuffix}_button_pressed`,
      ...buttonTemplate
    };
    
    // Replace $dynamic with actual values
    if (flowCard.args) {
      flowCard.args[0].values = buttonValues;
    }
    
    flowCards.push(flowCard);
    console.log(`[GEN]   ✅ Generated button flow card: ${flowCard.id}`);
  }
  
  // Generate capability-based flow cards
  for (const capability of capabilities) {
    const template = FLOW_CARD_TEMPLATES[capability];
    
    if (!template) continue;
    
    // Handle single trigger
    if (template.trigger) {
      const triggerCopy = JSON.parse(JSON.stringify(template.trigger));
      // Remove id from copy to avoid duplication
      delete triggerCopy.id;
      
      const flowCard = {
        id: `${driverId}${template.trigger.id}`,
        ...triggerCopy
      };
      flowCards.push(flowCard);
      console.log(`[GEN]   ✅ Generated: ${flowCard.id}`);
    }
    
    // Handle multiple triggers
    if (template.triggers) {
      for (const trig of template.triggers) {
        const trigCopy = JSON.parse(JSON.stringify(trig));
        // Remove id from copy to avoid duplication
        delete trigCopy.id;
        
        const flowCard = {
          id: `${driverId}${trig.id}`,
          ...trigCopy
        };
        flowCards.push(flowCard);
        console.log(`[GEN]   ✅ Generated: ${flowCard.id}`);
      }
    }
  }
  
  return flowCards;
}

/**
 * Extract button count from driver ID
 */
function extractButtonCount(driverId) {
  // button_wireless_4 -> 4
  // button_wireless_1 -> 1
  // switch_internal_2gang -> 2
  
  const match = driverId.match(/(\d+)gang/);
  if (match) return parseInt(match[1]);
  
  const match2 = driverId.match(/button_wireless_(\d+)/);
  if (match2) return parseInt(match2[1]);
  
  const match3 = driverId.match(/switch_internal_(\d+)gang/);
  if (match3) return parseInt(match3[1]);
  
  return 1; // Default single button
}

/**
 * Main execution
 */
function main() {
  console.log('\n╔══════════════════════════════════════════════════════╗');
  console.log('║  🤖 AUTOMATIC FLOW CARDS GENERATOR                 ║');
  console.log('╚══════════════════════════════════════════════════════╝\n');
  
  const projectRoot = path.join(__dirname, '../..');
  const driversPath = path.join(projectRoot, 'drivers');
  
  // Scan all drivers
  const drivers = scanDrivers(driversPath);
  
  // Generate flow cards for each driver
  const allFlowCards = [];
  const summary = {
    totalDrivers: drivers.length,
    driversWithFlows: 0,
    totalFlowCards: 0,
    byCapability: {}
  };
  
  for (const driver of drivers) {
    const flowCards = generateFlowCardsForDriver(driver);
    
    if (flowCards.length > 0) {
      summary.driversWithFlows++;
      summary.totalFlowCards += flowCards.length;
      
      allFlowCards.push({
        driver: driver.id,
        flowCards: flowCards
      });
    }
  }
  
  // Save generated flow cards
  const outputPath = path.join(projectRoot, 'project-data', 'generated-flow-cards.json');
  fs.writeFileSync(outputPath, JSON.stringify(allFlowCards, null, 2));
  
  console.log('\n╔══════════════════════════════════════════════════════╗');
  console.log('║  📊 GENERATION SUMMARY                              ║');
  console.log('╚══════════════════════════════════════════════════════╝');
  console.log(`Total drivers scanned: ${summary.totalDrivers}`);
  console.log(`Drivers with flow cards: ${summary.driversWithFlows}`);
  console.log(`Total flow cards generated: ${summary.totalFlowCards}`);
  console.log(`\nOutput saved to: ${outputPath}`);
  
  console.log('\n✅ FLOW CARDS GENERATED SUCCESSFULLY!\n');
  console.log('Next steps:');
  console.log('1. Review generated flow cards in project-data/generated-flow-cards.json');
  console.log('2. Run merge script to update app.json');
  console.log('3. Validate with: homey app validate --level publish\n');
}

// Run!
main();
