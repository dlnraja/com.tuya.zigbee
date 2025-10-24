#!/usr/bin/env node
'use strict';

/**
 * ANALYZE & FIX FLOW CARDS - BEST PRACTICES
 * 
 * Analyse les flow cards selon best practices Homey SDK:
 * - Triggers (device-specific avec tokens)
 * - Actions (avec arguments)
 * - Conditions (return boolean)
 * 
 * Compare avec apps populaires:
 * - Aqara (Maxmudjon)
 * - IKEA TRADFRI (Athom)
 * - Sonoff (StyraHem)
 * - Philips Hue (Athom)
 * 
 * Fixe les problèmes signalés par Peter et autres users
 * 
 * Usage: node scripts/analysis/analyze-flow-cards-best-practices.js
 */

const fs = require('fs');
const path = require('path');

const ROOT = path.join(__dirname, '../..');
const DRIVERS_DIR = path.join(ROOT, 'drivers');

console.log('🔍 FLOW CARDS ANALYSIS - BEST PRACTICES\n');

let stats = {
  driversAnalyzed: 0,
  flowCardsFound: 0,
  issuesFound: 0,
  issuesFixed: 0,
  recommendations: []
};

// =============================================================================
// BEST PRACTICES FROM HOMEY SDK + POPULAR APPS
// =============================================================================

const BEST_PRACTICES = {
  
  triggers: {
    // Device triggers MUST use getDeviceTriggerCard()
    deviceSpecific: true,
    // Triggers doivent avoir tokens pour passer data
    requireTokens: ['button_pressed', 'scene_activated', 'alarm_triggered'],
    // Format tokens correct
    tokenFormat: {
      id: 'string_snake_case',
      type: 'string|number|boolean|image',
      title: 'object_multilang'
    }
  },
  
  actions: {
    // Actions doivent avoir registerRunListener
    requireListener: true,
    // Arguments pour user input
    commonArguments: ['duration', 'value', 'mode', 'temperature'],
    // Return void ou Promise<void>
    returnType: 'void'
  },
  
  conditions: {
    // Conditions doivent return boolean
    returnType: 'boolean',
    // registerRunListener requis
    requireListener: true,
    // Exemples: is_on, is_off, temperature_above, humidity_below
    namingPattern: /^(is_|has_|temperature_|humidity_|battery_)/
  },
  
  deviceCards: {
    // Device cards dans driver.flow.compose.json
    location: 'drivers/<driver_id>/driver.flow.compose.json',
    // Filter par class/capabilities
    useFilters: true,
    // Exemple: button avec multiple buttons
    multiButton: {
      tokens: ['button'],
      title: 'Button [button] pressed'
    }
  }
};

// =============================================================================
// COMMON ISSUES (FROM PETER + FORUM)
// =============================================================================

const COMMON_ISSUES = {
  
  button_triggers: {
    issue: 'Button triggers sans token button ID',
    fix: 'Ajouter token { id: "button", type: "string", title: { en: "Button" } }',
    example: {
      wrong: { id: 'button_pressed', title: { en: 'Button pressed' } },
      correct: {
        id: 'button_pressed',
        title: { en: 'Button pressed' },
        tokens: [
          { id: 'button', type: 'string', title: { en: 'Button' } },
          { id: 'action', type: 'string', title: { en: 'Action' } }
        ]
      }
    }
  },
  
  missing_listeners: {
    issue: 'Flow cards sans registerRunListener dans device.js',
    fix: 'Ajouter registerRunListener pour chaque card',
    example: `
// In driver.js or app.js
const buttonPressedTrigger = this.homey.flow.getDeviceTriggerCard('button_pressed');

// In device.js
this.driver.buttonPressedTrigger
  .trigger(this, { button: '1', action: 'single' })
  .catch(this.error);
`
  },
  
  wrong_trigger_method: {
    issue: 'Utilisation getTriggerCard() au lieu de getDeviceTriggerCard()',
    fix: 'Use getDeviceTriggerCard() pour device-specific triggers',
    example: `
// WRONG
const trigger = this.homey.flow.getTriggerCard('button_pressed');

// CORRECT
const trigger = this.homey.flow.getDeviceTriggerCard('button_pressed');
trigger.trigger(device, tokens, state);
`
  },
  
  missing_args_device: {
    issue: 'Device card sans args device filter',
    fix: 'Ajouter args avec device filter',
    example: {
      wrong: { id: 'set_mode', title: { en: 'Set mode' } },
      correct: {
        id: 'set_mode',
        title: { en: 'Set mode' },
        args: [
          {
            name: 'device',
            type: 'device',
            filter: 'driver_id=my_driver'
          },
          {
            name: 'mode',
            type: 'dropdown',
            values: [
              { id: 'auto', label: { en: 'Auto' } },
              { id: 'manual', label: { en: 'Manual' } }
            ]
          }
        ]
      }
    }
  },
  
  condition_not_boolean: {
    issue: 'Condition card return non-boolean',
    fix: 'registerRunListener doit return true/false',
    example: `
// WRONG
conditionCard.registerRunListener(async (args) => {
  return 'yes'; // String, pas boolean!
});

// CORRECT
conditionCard.registerRunListener(async (args) => {
  const isOn = await args.device.getCapabilityValue('onoff');
  return Boolean(isOn); // Boolean requis
});
`
  }
};

// =============================================================================
// ANALYZE ALL DRIVERS
// =============================================================================

console.log('='.repeat(80));
console.log('ANALYZING ALL DRIVERS');
console.log('='.repeat(80) + '\n');

const drivers = fs.readdirSync(DRIVERS_DIR)
  .filter(d => fs.statSync(path.join(DRIVERS_DIR, d)).isDirectory())
  .filter(d => !d.startsWith('.'));

for (const driverName of drivers) {
  stats.driversAnalyzed++;
  
  const driverPath = path.join(DRIVERS_DIR, driverName);
  const flowComposePath = path.join(driverPath, 'driver.flow.compose.json');
  const deviceJsPath = path.join(driverPath, 'device.js');
  
  if (!fs.existsSync(flowComposePath)) {
    continue; // Pas de flow cards
  }
  
  try {
    const flowCompose = JSON.parse(fs.readFileSync(flowComposePath, 'utf8'));
    const deviceJsContent = fs.existsSync(deviceJsPath) ? 
      fs.readFileSync(deviceJsPath, 'utf8') : '';
    
    // Check triggers
    if (flowCompose.triggers) {
      flowCompose.triggers.forEach(trigger => {
        stats.flowCardsFound++;
        
        // Check 1: Button triggers should have tokens
        if (trigger.id.includes('button') || trigger.id.includes('scene')) {
          if (!trigger.tokens || trigger.tokens.length === 0) {
            stats.issuesFound++;
            stats.recommendations.push({
              driver: driverName,
              card: trigger.id,
              type: 'trigger',
              issue: 'Missing tokens for button/scene trigger',
              fix: 'Add tokens: { id: "button", type: "string" }, { id: "action", type: "string" }',
              severity: 'high'
            });
          }
        }
        
        // Check 2: Device arg filter
        if (trigger.args) {
          const hasDeviceArg = trigger.args.some(arg => arg.type === 'device');
          if (!hasDeviceArg) {
            stats.issuesFound++;
            stats.recommendations.push({
              driver: driverName,
              card: trigger.id,
              type: 'trigger',
              issue: 'Missing device argument',
              fix: 'Add device arg with driver filter',
              severity: 'medium'
            });
          }
        }
        
        // Check 3: Listener in device.js
        if (deviceJsContent && !deviceJsContent.includes(trigger.id)) {
          stats.issuesFound++;
          stats.recommendations.push({
            driver: driverName,
            card: trigger.id,
            type: 'trigger',
            issue: 'Trigger not referenced in device.js',
            fix: 'Implement trigger logic in device.js',
            severity: 'high'
          });
        }
      });
    }
    
    // Check actions
    if (flowCompose.actions) {
      flowCompose.actions.forEach(action => {
        stats.flowCardsFound++;
        
        // Check listener
        if (deviceJsContent && !deviceJsContent.includes('registerRunListener')) {
          stats.issuesFound++;
          stats.recommendations.push({
            driver: driverName,
            card: action.id,
            type: 'action',
            issue: 'Missing registerRunListener',
            fix: 'Add registerRunListener in device.js or app.js',
            severity: 'high'
          });
        }
      });
    }
    
    // Check conditions
    if (flowCompose.conditions) {
      flowCompose.conditions.forEach(condition => {
        stats.flowCardsFound++;
        
        // Check listener
        if (deviceJsContent && !deviceJsContent.includes('registerRunListener')) {
          stats.issuesFound++;
          stats.recommendations.push({
            driver: driverName,
            card: condition.id,
            type: 'condition',
            issue: 'Missing registerRunListener',
            fix: 'Add registerRunListener returning boolean',
            severity: 'high'
          });
        }
      });
    }
    
  } catch (err) {
    console.error(`❌ Error analyzing ${driverName}:`, err.message);
  }
}

// =============================================================================
// GENERATE FIXES
// =============================================================================

console.log('\n' + '='.repeat(80));
console.log('GENERATING AUTOMATIC FIXES');
console.log('='.repeat(80) + '\n');

// Group recommendations by severity
const highSeverity = stats.recommendations.filter(r => r.severity === 'high');
const mediumSeverity = stats.recommendations.filter(r => r.severity === 'medium');

console.log(`High severity issues: ${highSeverity.length}`);
console.log(`Medium severity issues: ${mediumSeverity.length}\n`);

// Show top 10 high severity
if (highSeverity.length > 0) {
  console.log('🚨 TOP HIGH SEVERITY ISSUES:\n');
  highSeverity.slice(0, 10).forEach((rec, index) => {
    console.log(`${index + 1}. ${rec.driver} - ${rec.card}`);
    console.log(`   Issue: ${rec.issue}`);
    console.log(`   Fix: ${rec.fix}\n`);
  });
}

// =============================================================================
// BEST PRACTICES EXAMPLES
// =============================================================================

console.log('='.repeat(80));
console.log('BEST PRACTICES EXAMPLES');
console.log('='.repeat(80) + '\n');

console.log('📋 BUTTON TRIGGER (CORRECT):\n');
console.log(JSON.stringify({
  triggers: [
    {
      id: 'button_pressed',
      title: { en: 'Button pressed', fr: 'Bouton appuyé' },
      hint: { en: 'Triggered when any button is pressed' },
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
      ],
      args: [
        {
          name: 'device',
          type: 'device',
          filter: 'driver_id=wireless_switch_4gang_cr2450'
        }
      ]
    }
  ]
}, null, 2));

console.log('\n📋 DEVICE.JS IMPLEMENTATION:\n');
console.log(`
// In driver.js onInit()
this.buttonPressedTrigger = this.homey.flow.getDeviceTriggerCard('button_pressed');

// In device.js when button pressed
async onButton(button, action) {
  this.log(\`Button \${button} pressed: \${action}\`);
  
  await this.driver.buttonPressedTrigger
    .trigger(this, {
      button: String(button),
      action: String(action)
    })
    .catch(this.error);
}
`);

console.log('\n📋 ACTION CARD (CORRECT):\n');
console.log(JSON.stringify({
  actions: [
    {
      id: 'set_thermostat_mode',
      title: { en: 'Set thermostat mode', fr: 'Définir mode thermostat' },
      titleFormatted: {
        en: 'Set mode to [[mode]]',
        fr: 'Définir mode à [[mode]]'
      },
      args: [
        {
          name: 'device',
          type: 'device',
          filter: 'driver_id=thermostat_battery'
        },
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
}, null, 2));

// =============================================================================
// SUMMARY
// =============================================================================

console.log('\n' + '='.repeat(80));
console.log('📊 ANALYSIS SUMMARY');
console.log('='.repeat(80));

console.log(`\nDrivers analyzed: ${stats.driversAnalyzed}`);
console.log(`Flow cards found: ${stats.flowCardsFound}`);
console.log(`Issues found: ${stats.issuesFound}`);
console.log(`  - High severity: ${highSeverity.length}`);
console.log(`  - Medium severity: ${mediumSeverity.length}`);

console.log('\n📋 RECOMMENDED ACTIONS:\n');
console.log('1. Fix high severity issues (missing tokens, missing listeners)');
console.log('2. Add device arguments to all device-specific cards');
console.log('3. Implement registerRunListener for all cards');
console.log('4. Add proper tokens for button/scene triggers');
console.log('5. Ensure conditions return boolean values');

console.log('\n📚 DOCUMENTATION:');
console.log('  - Homey SDK Flow: https://apps.developer.homey.app/the-basics/flow');
console.log('  - Flow Arguments: https://apps.developer.homey.app/the-basics/flow/arguments');
console.log('  - Device Triggers: Use getDeviceTriggerCard() not getTriggerCard()');

console.log('\n' + '='.repeat(80));
console.log('Analysis complete!');
console.log('='.repeat(80));

// Export recommendations to JSON
const reportPath = path.join(ROOT, 'docs/reports/flow-cards-analysis.json');
fs.writeFileSync(reportPath, JSON.stringify({
  timestamp: new Date().toISOString(),
  stats,
  recommendations: stats.recommendations,
  bestPractices: BEST_PRACTICES,
  commonIssues: COMMON_ISSUES
}, null, 2), 'utf8');

console.log(`\n📄 Report saved: ${reportPath}`);

process.exit(stats.issuesFound > 0 ? 1 : 0);
