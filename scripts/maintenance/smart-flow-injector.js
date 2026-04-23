#!/usr/bin/env node
'use strict';
const fs = require('fs');
const path = require('path');

const ROOT = process.cwd();
const DRIVERS_DIR = path.join(ROOT, 'drivers');

const SMART_CARDS = {
  triggers: [
    {
      id: "radio_presence_detected",
      title: { en: "Radio sensing presence detected", fr: "PrÃ©sence dÃ©tectÃ©e par radio (LQI)" }
    }
  ],
  conditions: [
    {
      id: "is_radio_presence_detected",
      title: { en: "Radio presence is detected", fr: "PrÃ©sence radio dÃ©tectÃ©e" }
    }
  ],
  actions: [
    {
      id: "calibrate_virtual_energy",
      title: { en: "Calibrate virtual energy", fr: "Calibrer l'Ã©nergie virtuelle" },
      args: [{ name: "watts", type: "number", placeholder: { en: "Nominal Watts", fr: "Watts nominaux" } }]
    },
    {
       id: "set_sensing_threshold",
       title: { en: "Set radio sensing sensitivity", fr: "RÃ©gler la dÃ©tection radio" },
       args: [{ name: "threshold", type: "number", placeholder: "2-50" }]
    }
  ]
};

async function main() {
  const entries = fs.readdirSync(DRIVERS_DIR);
  for (const entry of entries) {
    const composePath = path.join(DRIVERS_DIR, entry, 'driver.compose.json');
    if (!fs.existsSync(composePath)) continue;

    try {
      const compose = JSON.parse(fs.readFileSync(composePath, 'utf8'));
      
      // Inject Flow Cards
      if (!compose.flow) compose.flow = {};
      
      Object.keys(SMART_CARDS).forEach(type => {
         if (!compose.flow[type]) compose.flow[type] = [];
         SMART_CARDS[type].forEach(card => {
            if (!compose.flow[type].find(c => c.id === card.id)) {
               compose.flow[type].push(card);
            }
         });
      });

      // Inject Native Adaptive Lighting Support Metadata
      if (compose.capabilities?.includes('light_color_temp')) {
         if (!compose.metadata ) compose.metadata = {};
         compose.metadata.homey = { ...compose.metadata.homey, 'natural_light': true };
      }

      fs.writeFileSync(composePath, JSON.stringify(compose, null, 2));
    } catch (e) {}
  }
  console.log(' All drivers updated with Smart Flow Cards & Metadata.');
}

main().catch(console.error);
