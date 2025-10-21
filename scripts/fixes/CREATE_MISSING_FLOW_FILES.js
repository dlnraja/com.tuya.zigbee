#!/usr/bin/env node

/**
 * CREATE MISSING FLOW FILES FOR BATTERY SWITCHES
 */

const fs = require('fs');
const path = require('path');

const DRIVERS_MISSING_FLOWS = [
  { name: 'switch_1gang_battery', buttons: 1 },
  { name: 'switch_3gang_battery', buttons: 3 },
  { name: 'switch_4gang_battery_cr2032', buttons: 4 },
  { name: 'switch_5gang_battery', buttons: 5 },
  { name: 'mini_switch_cr2032', buttons: 1 },
  { name: 'roller_shutter_switch_cr2032', buttons: 2 },
  { name: 'roller_shutter_switch_advanced_battery', buttons: 2 }
];

function generateFlowCards(driverId, buttonCount) {
  const flowCards = {
    triggers: [
      {
        id: `${driverId}_button_pressed`,
        title: { en: "Button pressed", fr: "Bouton appuyé" },
        hint: { en: "Triggered when any button is pressed (any action type)", fr: "Déclenché quand un bouton est pressé (tout type d'action)" },
        tokens: [
          { name: "button", type: "string", title: { en: "Button", fr: "Bouton" }, example: "1" },
          { name: "action", type: "string", title: { en: "Action", fr: "Action" }, example: "single" }
        ],
        args: [{ name: "device", type: "device", filter: `driver_id=${driverId}` }]
      },
      {
        id: `${driverId}_single_press`,
        title: { en: "Button single press", fr: "Bouton pression simple" },
        hint: { en: "Triggered when a button is pressed once", fr: "Déclenché lors d'une pression simple" },
        tokens: [{ name: "button", type: "string", title: { en: "Button", fr: "Bouton" }, example: "1" }],
        args: [{ name: "device", type: "device", filter: `driver_id=${driverId}` }]
      },
      {
        id: `${driverId}_double_press`,
        title: { en: "Button double press", fr: "Bouton double pression" },
        hint: { en: "Triggered when a button is pressed twice quickly", fr: "Déclenché lors d'une double pression rapide" },
        tokens: [{ name: "button", type: "string", title: { en: "Button", fr: "Bouton" }, example: "1" }],
        args: [{ name: "device", type: "device", filter: `driver_id=${driverId}` }]
      },
      {
        id: `${driverId}_long_press`,
        title: { en: "Button long press", fr: "Bouton pression longue" },
        hint: { en: "Triggered when a button is held down", fr: "Déclenché lors d'une pression longue" },
        tokens: [{ name: "button", type: "string", title: { en: "Button", fr: "Bouton" }, example: "1" }],
        args: [{ name: "device", type: "device", filter: `driver_id=${driverId}` }]
      },
      {
        id: `${driverId}_battery_low`,
        title: { en: "Battery is low", fr: "Batterie faible" },
        hint: { en: "Triggered when battery drops below threshold", fr: "Déclenché quand la batterie passe sous le seuil" },
        tokens: [{ name: "battery_percentage", type: "number", title: { en: "Battery %", fr: "Batterie %" }, example: 15 }],
        args: [{ name: "device", type: "device", filter: `driver_id=${driverId}` }]
      }
    ],
    actions: [
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

console.log(`\n🔧 Creating missing flow files for ${DRIVERS_MISSING_FLOWS.length} drivers...\n`);

let created = 0;
DRIVERS_MISSING_FLOWS.forEach(driver => {
  const flowPath = path.join(__dirname, '..', '..', 'drivers', driver.name, 'driver.flow.compose.json');
  
  try {
    const flowCards = generateFlowCards(driver.name, driver.buttons);
    fs.writeFileSync(flowPath, JSON.stringify(flowCards, null, 2) + '\n', 'utf8');
    console.log(`✅ ${driver.name}: Flow file created (${driver.buttons} buttons)`);
    created++;
  } catch (err) {
    console.error(`❌ Error creating ${driver.name}:`, err.message);
  }
});

console.log(`\n✅ Created ${created} flow files\n`);
