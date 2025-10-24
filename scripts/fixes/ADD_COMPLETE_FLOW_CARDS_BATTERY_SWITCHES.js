#!/usr/bin/env node

/**
 * ADD COMPLETE FLOW CARDS TO ALL BATTERY SWITCHES
 * Ajoute: single/double/long press, battery low trigger, manual trigger action
 */

const fs = require('fs');
const path = require('path');

// Tous les drivers battery switch
const BATTERY_SWITCH_DRIVERS = [
  'wireless_switch_1gang_cr2032',
  'wireless_switch_2gang_cr2032',
  'wireless_switch_3gang_cr2032',
  'wireless_switch_4gang_cr2032',
  'wireless_switch_4gang_cr2450',
  'wireless_switch_5gang_cr2032',
  'wireless_switch_6gang_cr2032',
  'wireless_switch_cr2032',
  'switch_1gang_battery',
  'switch_3gang_battery',
  'switch_4gang_battery_cr2032',
  'switch_5gang_battery',
  'scene_controller_2button_cr2032',
  'scene_controller_4button_cr2032',
  'scene_controller_6button_cr2032',
  'scene_controller_8button_cr2032',
  'scene_controller_battery',
  'wireless_scene_controller_4button_battery',
  'wireless_button_2gang_battery',
  'remote_switch_cr2032',
  'mini_switch_cr2032',
  'roller_shutter_switch_cr2032',
  'roller_shutter_switch_advanced_battery'
];

function getButtonCount(driverName) {
  if (driverName.includes('1gang') || driverName.includes('1_gang')) return 1;
  if (driverName.includes('2gang') || driverName.includes('2button') || driverName.includes('2_gang')) return 2;
  if (driverName.includes('3gang') || driverName.includes('3_gang')) return 3;
  if (driverName.includes('4gang') || driverName.includes('4button') || driverName.includes('4_gang')) return 4;
  if (driverName.includes('5gang') || driverName.includes('5_gang')) return 5;
  if (driverName.includes('6gang') || driverName.includes('6button') || driverName.includes('6_gang')) return 6;
  if (driverName.includes('8button')) return 8;
  return 1; // default
}

function generateFlowCards(driverName) {
  const driverId = driverName;
  const buttonCount = getButtonCount(driverName);
  
  const flowCards = {
    triggers: [
      // Generic button pressed (all actions)
      {
        id: `${driverId}_button_pressed`,
        title: { en: "Button pressed", fr: "Bouton appuyé" },
        hint: { 
          en: "Triggered when any button is pressed (any action type)", 
          fr: "Déclenché quand un bouton est pressé (tout type d'action)" 
        },
        tokens: [
          { name: "button", type: "string", title: { en: "Button", fr: "Bouton" }, example: "1" },
          { name: "action", type: "string", title: { en: "Action", fr: "Action" }, example: "single" }
        ],
        args: [{ name: "device", type: "device", filter: `driver_id=${driverId}` }]
      },
      // Single press
      {
        id: `${driverId}_single_press`,
        title: { en: "Button single press", fr: "Bouton pression simple" },
        hint: { en: "Triggered when a button is pressed once", fr: "Déclenché lors d'une pression simple" },
        tokens: [{ name: "button", type: "string", title: { en: "Button", fr: "Bouton" }, example: "1" }],
        args: [{ name: "device", type: "device", filter: `driver_id=${driverId}` }]
      },
      // Double press
      {
        id: `${driverId}_double_press`,
        title: { en: "Button double press", fr: "Bouton double pression" },
        hint: { en: "Triggered when a button is pressed twice quickly", fr: "Déclenché lors d'une double pression rapide" },
        tokens: [{ name: "button", type: "string", title: { en: "Button", fr: "Bouton" }, example: "1" }],
        args: [{ name: "device", type: "device", filter: `driver_id=${driverId}` }]
      },
      // Long press
      {
        id: `${driverId}_long_press`,
        title: { en: "Button long press", fr: "Bouton pression longue" },
        hint: { en: "Triggered when a button is held down", fr: "Déclenché lors d'une pression longue" },
        tokens: [{ name: "button", type: "string", title: { en: "Button", fr: "Bouton" }, example: "1" }],
        args: [{ name: "device", type: "device", filter: `driver_id=${driverId}` }]
      },
      // Battery low
      {
        id: `${driverId}_battery_low`,
        title: { en: "Battery is low", fr: "Batterie faible" },
        hint: { en: "Triggered when battery drops below threshold", fr: "Déclenché quand la batterie passe sous le seuil" },
        tokens: [{ name: "battery_percentage", type: "number", title: { en: "Battery %", fr: "Batterie %" }, example: 15 }],
        args: [{ name: "device", type: "device", filter: `driver_id=${driverId}` }]
      }
    ],
    actions: [
      // Manual trigger
      {
        id: `${driverId}_trigger_button`,
        title: { en: "Trigger button manually", fr: "Activer bouton manuellement" },
        hint: { en: "Simulate a button press without physical interaction", fr: "Simuler une pression de bouton sans interaction physique" },
        args: [
          { name: "device", type: "device", filter: `driver_id=${driverId}` },
          {
            name: "button",
            type: "dropdown",
            title: { en: "Button", fr: "Bouton" },
            values: Array.from({ length: buttonCount }, (_, i) => ({
              id: String(i + 1),
              label: { en: `Button ${i + 1}`, fr: `Bouton ${i + 1}` }
            }))
          },
          {
            name: "action",
            type: "dropdown",
            title: { en: "Action", fr: "Action" },
            values: [
              { id: "single", label: { en: "Single press", fr: "Pression simple" } },
              { id: "double", label: { en: "Double press", fr: "Double pression" } },
              { id: "long", label: { en: "Long press", fr: "Pression longue" } }
            ]
          }
        ]
      }
    ]
  };
  
  // Add gang control action if multi-gang
  if (buttonCount > 1) {
    flowCards.actions.push({
      id: `${driverId}_set_gang`,
      title: { en: "Turn gang on/off", fr: "Allumer/éteindre bouton" },
      hint: { en: "Control gang state", fr: "Contrôler l'état du bouton" },
      args: [
        { name: "device", type: "device", filter: `driver_id=${driverId}` },
        {
          name: "gang",
          type: "dropdown",
          title: { en: "Gang", fr: "Bouton" },
          values: Array.from({ length: buttonCount }, (_, i) => ({
            id: String(i + 1),
            label: { en: `Gang ${i + 1}`, fr: `Bouton ${i + 1}` }
          }))
        },
        {
          name: "state",
          type: "dropdown",
          title: { en: "State", fr: "État" },
          values: [
            { id: "on", label: { en: "On", fr: "Allumé" } },
            { id: "off", label: { en: "Off", fr: "Éteint" } },
            { id: "toggle", label: { en: "Toggle", fr: "Basculer" } }
          ]
        }
      ]
    });
  }
  
  return flowCards;
}

function updateDriver(driverName) {
  const flowPath = path.join(__dirname, '..', '..', 'drivers', driverName, 'driver.flow.compose.json');
  
  if (!fs.existsSync(flowPath)) {
    console.log(`⚠️  No flow file: ${driverName}`);
    return false;
  }
  
  try {
    const flowCards = generateFlowCards(driverName);
    fs.writeFileSync(flowPath, JSON.stringify(flowCards, null, 2) + '\n', 'utf8');
    console.log(`✅ ${driverName}: Complete flow cards added`);
    return true;
  } catch (err) {
    console.error(`❌ Error updating ${driverName}:`, err.message);
    return false;
  }
}

console.log(`\n🔧 Adding complete flow cards to ${BATTERY_SWITCH_DRIVERS.length} battery switch drivers...\n`);

let updated = 0;
BATTERY_SWITCH_DRIVERS.forEach(driverName => {
  if (updateDriver(driverName)) {
    updated++;
  }
});

console.log(`\n✅ Updated ${updated} drivers with complete flow cards\n`);
console.log(`
FLOW CARDS ADDED:
✅ button_pressed (generic - all actions)
✅ single_press (specific)
✅ double_press (specific)
✅ long_press (specific)
✅ battery_low (with percentage token)
✅ trigger_button (manual activation action)
✅ set_gang (gang control action - multi-gang only)
`);
