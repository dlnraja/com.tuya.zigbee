#!/usr/bin/env node
'use strict';

/**
 * P27.1 — Apply button_mode setting to all button drivers
 *
 * Adds the button_mode setting to drivers that have buttons:
 * - button_wireless_1/2/3/4
 * - button_wireless_smart
 * - button_wireless_usb
 * - smart_knob_rotary
 */

const fs = require('fs');
const path = require('path');

const DRIVERS_DIR = 'C:/Users/Dell/Documents/homey/master/drivers';
const TARGETS = [
  'button_wireless_1', 'button_wireless_2', 'button_wireless_3', 'button_wireless_4',
  'button_wireless_smart', 'button_wireless_usb', 'smart_knob_rotary',
];

const SETTING = {
  id: 'button_mode',
  type: 'dropdown',
  label: {
    en: 'Button mode (advanced)',
    fr: 'Mode bouton (avancé)',
  },
  value: 'auto',
  values: [
    { id: 'auto', label: { en: 'Auto (default)', fr: 'Auto (par défaut)' } },
    { id: 'scene', label: { en: 'Force scene mode', fr: 'Forcer mode scène' } },
    { id: 'dimmer', label: { en: 'Force dimmer mode', fr: 'Forcer mode variateur' } },
  ],
  hint: {
    en: 'Scene mode sends cluster 0x05 commands. Use "Force scene mode" for TS0041 4-endpoint devices.',
    fr: 'Mode scène envoie des commandes cluster 0x05. Utiliser "Forcer mode scène" pour TS0041 4-endpoints.',
  },
};

let updated = 0;
for (const d of TARGETS) {
  const composePath = path.join(DRIVERS_DIR, d, 'driver.compose.json');
  if (!fs.existsSync(composePath)) continue;
  const compose = JSON.parse(fs.readFileSync(composePath, 'utf8'));
  const has = (compose.settings || []).some(s => s.id === 'button_mode');
  if (has) continue;
  compose.settings = (compose.settings || []).concat(SETTING);
  fs.writeFileSync(composePath, JSON.stringify(compose, null, 2));
  updated++;
  console.log(`  ✓ ${d}`);
}
console.log(`\nUpdated ${updated} drivers with button_mode setting`);
