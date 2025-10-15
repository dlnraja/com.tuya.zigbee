#!/usr/bin/env node
'use strict';

const fs = require('fs').promises;
const path = require('path');

/**
 * ADD MULTI-GANG FLOWS
 * Génère flows intelligents pour:
 * - Boutons multiples (button 1-6)
 * - Types de clics (court, long, double)
 * - Contexte adaptatif selon gang count
 */

const MULTI_GANG_FLOWS = {
  // ========================================
  // TRIGGERS - Boutons Individuels
  // ========================================
  triggers: [
    // Button 1 (onoff capability)
    {
      id: 'button_1_pressed',
      title: { en: 'Button 1 pressed', fr: 'Bouton 1 pressé' },
      hint: { en: 'When button 1 is pressed', fr: 'Quand bouton 1 est pressé' },
      tokens: [
        { name: 'press_type', type: 'string', title: { en: 'Press Type', fr: 'Type Pression' }, example: 'short' },
        { name: 'timestamp', type: 'string', title: { en: 'Time', fr: 'Heure' }, example: '14:30:45' }
      ],
      filter: 'capabilities=onoff'
    },
    {
      id: 'button_1_long_press',
      title: { en: 'Button 1 long press', fr: 'Bouton 1 pression longue' },
      hint: { en: 'When button 1 is held down', fr: 'Quand bouton 1 maintenu' },
      tokens: [
        { name: 'duration', type: 'number', title: { en: 'Duration (ms)', fr: 'Durée (ms)' }, example: 1500 }
      ],
      filter: 'capabilities=onoff'
    },
    {
      id: 'button_1_double_press',
      title: { en: 'Button 1 double press', fr: 'Bouton 1 double pression' },
      hint: { en: 'When button 1 is pressed twice quickly', fr: 'Quand bouton 1 pressé 2 fois rapidement' },
      filter: 'capabilities=onoff'
    },
    
    // Button 2
    {
      id: 'button_2_pressed',
      title: { en: 'Button 2 pressed', fr: 'Bouton 2 pressé' },
      hint: { en: 'When button 2 is pressed', fr: 'Quand bouton 2 est pressé' },
      tokens: [
        { name: 'press_type', type: 'string', title: { en: 'Press Type', fr: 'Type Pression' }, example: 'short' }
      ],
      filter: 'capabilities=button.2'
    },
    {
      id: 'button_2_long_press',
      title: { en: 'Button 2 long press', fr: 'Bouton 2 pression longue' },
      filter: 'capabilities=button.2'
    },
    {
      id: 'button_2_double_press',
      title: { en: 'Button 2 double press', fr: 'Bouton 2 double pression' },
      filter: 'capabilities=button.2'
    },
    
    // Button 3
    {
      id: 'button_3_pressed',
      title: { en: 'Button 3 pressed', fr: 'Bouton 3 pressé' },
      filter: 'capabilities=button.3'
    },
    {
      id: 'button_3_long_press',
      title: { en: 'Button 3 long press', fr: 'Bouton 3 pression longue' },
      filter: 'capabilities=button.3'
    },
    {
      id: 'button_3_double_press',
      title: { en: 'Button 3 double press', fr: 'Bouton 3 double pression' },
      filter: 'capabilities=button.3'
    },
    
    // Button 4
    {
      id: 'button_4_pressed',
      title: { en: 'Button 4 pressed', fr: 'Bouton 4 pressé' },
      filter: 'capabilities=button.4'
    },
    {
      id: 'button_4_long_press',
      title: { en: 'Button 4 long press', fr: 'Bouton 4 pression longue' },
      filter: 'capabilities=button.4'
    },
    {
      id: 'button_4_double_press',
      title: { en: 'Button 4 double press', fr: 'Bouton 4 double pression' },
      filter: 'capabilities=button.4'
    },
    
    // Button 5
    {
      id: 'button_5_pressed',
      title: { en: 'Button 5 pressed', fr: 'Bouton 5 pressé' },
      filter: 'capabilities=button.5'
    },
    {
      id: 'button_5_long_press',
      title: { en: 'Button 5 long press', fr: 'Bouton 5 pression longue' },
      filter: 'capabilities=button.5'
    },
    
    // Button 6
    {
      id: 'button_6_pressed',
      title: { en: 'Button 6 pressed', fr: 'Bouton 6 pressé' },
      filter: 'capabilities=button.6'
    },
    {
      id: 'button_6_long_press',
      title: { en: 'Button 6 long press', fr: 'Bouton 6 pression longue' },
      filter: 'capabilities=button.6'
    },
    
    // Generic any button
    {
      id: 'any_button_pressed',
      title: { en: 'Any button pressed', fr: 'N\'importe quel bouton pressé' },
      hint: { en: 'When any button on the device is pressed', fr: 'Quand n\'importe quel bouton est pressé' },
      tokens: [
        { name: 'button_number', type: 'number', title: { en: 'Button Number', fr: 'Numéro Bouton' }, example: 2 },
        { name: 'press_type', type: 'string', title: { en: 'Press Type', fr: 'Type Pression' }, example: 'short' }
      ],
      filter: 'class=button|class=socket'
    }
  ],
  
  // ========================================
  // CONDITIONS
  // ========================================
  conditions: [
    {
      id: 'button_is_enabled',
      title: { en: 'Button !{{is|is not}} enabled', fr: 'Bouton !{{est|n\'est pas}} activé' },
      args: [
        {
          type: 'device',
          name: 'device',
          filter: 'class=button|class=socket'
        },
        {
          type: 'dropdown',
          name: 'button',
          title: { en: 'Button', fr: 'Bouton' },
          values: [
            { id: '1', label: { en: 'Button 1', fr: 'Bouton 1' } },
            { id: '2', label: { en: 'Button 2', fr: 'Bouton 2' } },
            { id: '3', label: { en: 'Button 3', fr: 'Bouton 3' } },
            { id: '4', label: { en: 'Button 4', fr: 'Bouton 4' } },
            { id: '5', label: { en: 'Button 5', fr: 'Bouton 5' } },
            { id: '6', label: { en: 'Button 6', fr: 'Bouton 6' } }
          ]
        }
      ]
    },
    {
      id: 'last_pressed_button',
      title: { en: 'Last pressed button !{{is|is not}}', fr: 'Dernier bouton pressé !{{est|n\'est pas}}' },
      args: [
        {
          type: 'device',
          name: 'device',
          filter: 'class=button|class=socket'
        },
        {
          type: 'dropdown',
          name: 'button',
          title: { en: 'Button', fr: 'Bouton' },
          values: [
            { id: '1', label: { en: 'Button 1', fr: 'Bouton 1' } },
            { id: '2', label: { en: 'Button 2', fr: 'Bouton 2' } },
            { id: '3', label: { en: 'Button 3', fr: 'Bouton 3' } },
            { id: '4', label: { en: 'Button 4', fr: 'Bouton 4' } },
            { id: '5', label: { en: 'Button 5', fr: 'Bouton 5' } },
            { id: '6', label: { en: 'Button 6', fr: 'Bouton 6' } }
          ]
        }
      ]
    }
  ],
  
  // ========================================
  // ACTIONS
  // ========================================
  actions: [
    {
      id: 'trigger_scene_by_button',
      title: { en: 'Trigger scene for button', fr: 'Déclencher scène pour bouton' },
      hint: { en: 'Manually trigger a button scene', fr: 'Déclencher manuellement une scène bouton' },
      args: [
        {
          type: 'device',
          name: 'device',
          filter: 'class=button|class=socket'
        },
        {
          type: 'dropdown',
          name: 'button',
          title: { en: 'Button', fr: 'Bouton' },
          values: [
            { id: '1', label: { en: 'Button 1', fr: 'Bouton 1' } },
            { id: '2', label: { en: 'Button 2', fr: 'Bouton 2' } },
            { id: '3', label: { en: 'Button 3', fr: 'Bouton 3' } },
            { id: '4', label: { en: 'Button 4', fr: 'Bouton 4' } },
            { id: '5', label: { en: 'Button 5', fr: 'Bouton 5' } },
            { id: '6', label: { en: 'Button 6', fr: 'Bouton 6' } }
          ]
        },
        {
          type: 'dropdown',
          name: 'press_type',
          title: { en: 'Press Type', fr: 'Type Pression' },
          values: [
            { id: 'short', label: { en: 'Short press', fr: 'Pression courte' } },
            { id: 'long', label: { en: 'Long press', fr: 'Pression longue' } },
            { id: 'double', label: { en: 'Double press', fr: 'Double pression' } }
          ]
        }
      ]
    },
    {
      id: 'disable_button',
      title: { en: 'Disable button', fr: 'Désactiver bouton' },
      hint: { en: 'Temporarily disable a button', fr: 'Désactiver temporairement un bouton' },
      args: [
        {
          type: 'device',
          name: 'device',
          filter: 'class=button|class=socket'
        },
        {
          type: 'dropdown',
          name: 'button',
          title: { en: 'Button', fr: 'Bouton' },
          values: [
            { id: '1', label: { en: 'Button 1', fr: 'Bouton 1' } },
            { id: '2', label: { en: 'Button 2', fr: 'Bouton 2' } },
            { id: '3', label: { en: 'Button 3', fr: 'Bouton 3' } },
            { id: '4', label: { en: 'Button 4', fr: 'Bouton 4' } },
            { id: '5', label: { en: 'Button 5', fr: 'Bouton 5' } },
            { id: '6', label: { en: 'Button 6', fr: 'Bouton 6' } }
          ]
        }
      ]
    },
    {
      id: 'enable_button',
      title: { en: 'Enable button', fr: 'Activer bouton' },
      hint: { en: 'Re-enable a disabled button', fr: 'Réactiver un bouton désactivé' },
      args: [
        {
          type: 'device',
          name: 'device',
          filter: 'class=button|class=socket'
        },
        {
          type: 'dropdown',
          name: 'button',
          title: { en: 'Button', fr: 'Bouton' },
          values: [
            { id: '1', label: { en: 'Button 1', fr: 'Bouton 1' } },
            { id: '2', label: { en: 'Button 2', fr: 'Bouton 2' } },
            { id: '3', label: { en: 'Button 3', fr: 'Bouton 3' } },
            { id: '4', label: { en: 'Button 4', fr: 'Bouton 4' } },
            { id: '5', label: { en: 'Button 5', fr: 'Bouton 5' } },
            { id: '6', label: { en: 'Button 6', fr: 'Bouton 6' } }
          ]
        }
      ]
    }
  ]
};

async function main() {
  console.log('🎮 ADDING MULTI-GANG & BUTTON FLOWS\n');
  
  // Load app.json
  const appJsonPath = path.join(__dirname, '../..', 'app.json');
  const appJsonData = await fs.readFile(appJsonPath, 'utf8');
  const appJson = JSON.parse(appJsonData);
  
  let stats = {
    triggers_added: 0,
    conditions_added: 0,
    actions_added: 0,
    skipped: 0
  };
  
  // Add triggers
  MULTI_GANG_FLOWS.triggers.forEach(trigger => {
    const exists = appJson.flow.triggers.find(t => t.id === trigger.id);
    if (!exists) {
      // Add device arg
      if (!trigger.args) {
        trigger.args = [];
      }
      if (!trigger.args.some(a => a.type === 'device')) {
        trigger.args.unshift({
          type: 'device',
          name: 'device',
          filter: trigger.filter || 'driver_uri=homey:app:com.dlnraja.tuya.zigbee'
        });
      }
      delete trigger.filter;
      
      appJson.flow.triggers.push(trigger);
      stats.triggers_added++;
      console.log(`  ✅ Trigger: ${trigger.id}`);
    } else {
      stats.skipped++;
    }
  });
  
  // Add conditions
  MULTI_GANG_FLOWS.conditions.forEach(condition => {
    const exists = appJson.flow.conditions.find(c => c.id === condition.id);
    if (!exists) {
      appJson.flow.conditions.push(condition);
      stats.conditions_added++;
      console.log(`  ✅ Condition: ${condition.id}`);
    } else {
      stats.skipped++;
    }
  });
  
  // Add actions
  MULTI_GANG_FLOWS.actions.forEach(action => {
    const exists = appJson.flow.actions.find(a => a.id === action.id);
    if (!exists) {
      appJson.flow.actions.push(action);
      stats.actions_added++;
      console.log(`  ✅ Action: ${action.id}`);
    } else {
      stats.skipped++;
    }
  });
  
  // Write updated app.json
  await fs.writeFile(appJsonPath, JSON.stringify(appJson, null, 2));
  
  console.log('\n\n✅ MULTI-GANG FLOWS ADDED!\n');
  console.log(`📊 Statistics:`);
  console.log(`  Triggers added: ${stats.triggers_added}`);
  console.log(`  Conditions added: ${stats.conditions_added}`);
  console.log(`  Actions added: ${stats.actions_added}`);
  console.log(`  Skipped (already exist): ${stats.skipped}`);
  console.log(`\n  Total new flows: ${stats.triggers_added + stats.conditions_added + stats.actions_added}`);
  console.log(`\n  Total flows in app.json: ${appJson.flow.triggers.length + appJson.flow.conditions.length + appJson.flow.actions.length}`);
  
  console.log('\n🎯 Flow Coverage:');
  console.log('  Button 1: 3 press types (short, long, double)');
  console.log('  Button 2: 3 press types');
  console.log('  Button 3: 3 press types');
  console.log('  Button 4: 3 press types');
  console.log('  Button 5: 2 press types');
  console.log('  Button 6: 2 press types');
  console.log('  Generic: any_button_pressed');
  console.log('\n  Total button triggers: 16');
  console.log('  Conditions: 2 (state checks)');
  console.log('  Actions: 3 (enable/disable/trigger)');
}

main().catch(console.error);
