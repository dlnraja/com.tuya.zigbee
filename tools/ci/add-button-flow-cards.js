#!/usr/bin/env node
'use strict';

/**
 * P26.4 — Add flow card triggers for buttons 2, 3, 4 in button_wireless_smart
 *
 * The current driver.flow.compose.json only has button 1 triggers.
 * For multi-endpoint devices (e.g., _TZ3000_yj6k7vfo with 4 buttons),
 * we need triggers for buttons 2, 3, 4 too.
 *
 * Adds: button_2_pressed, button_2_double, button_2_long, button_2_triple, button_2_release
 *        button_3_* and button_4_*
 */

const fs = require('fs');
const path = require('path');

const FLOW_PATH = 'C:/Users/Dell/Documents/homey/master/drivers/button_wireless_smart/driver.flow.compose.json';

const flow = JSON.parse(fs.readFileSync(FLOW_PATH, 'utf8'));

const buttonPressTypes = [
  { suffix: 'pressed', en: 'pressed', fr: 'appuyé' },
  { suffix: 'double', en: 'double-pressed', fr: 'double-cliqué' },
  { suffix: 'long', en: 'long-pressed', fr: 'pressé longtemps' },
  { suffix: 'triple', en: 'triple-pressed', fr: 'triple-cliqué' },
  { suffix: 'release', en: 'released - after hold', fr: 'relâché - après maintien' },
];

for (let btn = 2; btn <= 4; btn++) {
  for (const pt of buttonPressTypes) {
    const id = `button_wireless_smart_button_1gang_button_${btn}_${pt.suffix}`;
    // Check if already exists
    if (flow.triggers.some(t => t.id === id)) continue;

    flow.triggers.push({
      id,
      title: {
        en: `Button ${btn} ${pt.en}`,
        fr: `Bouton ${btn} ${pt.fr}`,
      },
      args: [],
      titleFormatted: {
        en: `Button ${btn} ${pt.en}`,
        fr: `Bouton ${btn} ${pt.fr}`,
      },
    });
  }
}

fs.writeFileSync(FLOW_PATH, JSON.stringify(flow, null, 2));
console.log(`Updated ${FLOW_PATH}`);
console.log(`Total triggers: ${flow.triggers.length}`);
console.log(`Added buttons 2, 3, 4 triggers (15 new)`);
