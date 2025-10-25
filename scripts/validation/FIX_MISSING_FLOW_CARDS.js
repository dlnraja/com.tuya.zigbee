#!/usr/bin/env node
/**
 * FIX MISSING FLOW CARDS
 * Creates missing flow cards for button and USB outlet drivers
 */

const fs = require('fs');
const path = require('path');

const APP_JSON_PATH = path.join(__dirname, '../../app.json');

// Missing flow cards from diagnostic logs
const MISSING_CARDS = {
  triggers: [
    { id: 'button_wireless_1_button_pressed', title: { en: 'Button pressed', fr: 'Bouton pressé' }, args: [{ type: 'device', name: 'device', filter: 'driver_id=button_wireless_1' }] },
    { id: 'button_wireless_2_button_pressed', title: { en: 'Button pressed', fr: 'Bouton pressé' }, args: [{ type: 'device', name: 'device', filter: 'driver_id=button_wireless_2' }] },
    { id: 'button_wireless_3_button_pressed', title: { en: 'Button pressed', fr: 'Bouton pressé' }, args: [{ type: 'device', name: 'device', filter: 'driver_id=button_wireless_3' }] },
    { id: 'button_wireless_4_button_pressed', title: { en: 'Button pressed', fr: 'Bouton pressé' }, args: [{ type: 'device', name: 'device', filter: 'driver_id=button_wireless_4' }] },
    { id: 'button_wireless_6_button_pressed', title: { en: 'Button pressed', fr: 'Bouton pressé' }, args: [{ type: 'device', name: 'device', filter: 'driver_id=button_wireless_6' }] },
    { id: 'button_wireless_8_button_pressed', title: { en: 'Button pressed', fr: 'Bouton pressé' }, args: [{ type: 'device', name: 'device', filter: 'driver_id=button_wireless_8' }] },
    { id: 'usb_outlet_1gang_turned_on', title: { en: 'Turned on', fr: 'Allumé' }, args: [{ type: 'device', name: 'device', filter: 'driver_id=usb_outlet_1gang' }] },
    { id: 'usb_outlet_1gang_turned_off', title: { en: 'Turned off', fr: 'Éteint' }, args: [{ type: 'device', name: 'device', filter: 'driver_id=usb_outlet_1gang' }] },
    { id: 'usb_outlet_2port_port1_turned_on', title: { en: 'Port 1 turned on', fr: 'Port 1 allumé' }, args: [{ type: 'device', name: 'device', filter: 'driver_id=usb_outlet_2port' }] },
    { id: 'usb_outlet_2port_port1_turned_off', title: { en: 'Port 1 turned off', fr: 'Port 1 éteint' }, args: [{ type: 'device', name: 'device', filter: 'driver_id=usb_outlet_2port' }] },
    { id: 'usb_outlet_2port_port2_turned_on', title: { en: 'Port 2 turned on', fr: 'Port 2 allumé' }, args: [{ type: 'device', name: 'device', filter: 'driver_id=usb_outlet_2port' }] },
    { id: 'usb_outlet_2port_port2_turned_off', title: { en: 'Port 2 turned off', fr: 'Port 2 éteint' }, args: [{ type: 'device', name: 'device', filter: 'driver_id=usb_outlet_2port' }] },
    { id: 'usb_outlet_3gang_port1_turned_on', title: { en: 'Port 1 turned on', fr: 'Port 1 allumé' }, args: [{ type: 'device', name: 'device', filter: 'driver_id=usb_outlet_3gang' }] },
    { id: 'usb_outlet_3gang_port1_turned_off', title: { en: 'Port 1 turned off', fr: 'Port 1 éteint' }, args: [{ type: 'device', name: 'device', filter: 'driver_id=usb_outlet_3gang' }] },
    { id: 'usb_outlet_3gang_port2_turned_on', title: { en: 'Port 2 turned on', fr: 'Port 2 allumé' }, args: [{ type: 'device', name: 'device', filter: 'driver_id=usb_outlet_3gang' }] },
    { id: 'usb_outlet_3gang_port2_turned_off', title: { en: 'Port 2 turned off', fr: 'Port 2 éteint' }, args: [{ type: 'device', name: 'device', filter: 'driver_id=usb_outlet_3gang' }] },
    { id: 'usb_outlet_3gang_port3_turned_on', title: { en: 'Port 3 turned on', fr: 'Port 3 allumé' }, args: [{ type: 'device', name: 'device', filter: 'driver_id=usb_outlet_3gang' }] },
    { id: 'usb_outlet_3gang_port3_turned_off', title: { en: 'Port 3 turned off', fr: 'Port 3 éteint' }, args: [{ type: 'device', name: 'device', filter: 'driver_id=usb_outlet_3gang' }] }
  ]
};

class FlowCardFixer {
  constructor() {
    this.added = 0;
  }

  log(msg, type = 'info') {
    const colors = {
      info: '\x1b[36m',
      success: '\x1b[32m',
      warning: '\x1b[33m',
      error: '\x1b[31m',
      reset: '\x1b[0m'
    };
    console.log(`${colors[type]}${msg}${colors.reset}`);
  }

  run() {
    this.log('\n🎴 FIX MISSING FLOW CARDS - Starting...', 'info');
    this.log('='.repeat(80), 'info');

    const appJson = JSON.parse(fs.readFileSync(APP_JSON_PATH, 'utf8'));
    
    if (!appJson.flow) {
      appJson.flow = {};
    }
    if (!appJson.flow.triggers) {
      appJson.flow.triggers = [];
    }

    const existingIds = new Set(appJson.flow.triggers.map(t => t.id));
    
    // Add missing triggers
    MISSING_CARDS.triggers.forEach(card => {
      if (!existingIds.has(card.id)) {
        appJson.flow.triggers.push(card);
        this.added++;
        this.log(`✅ Added: ${card.id}`, 'success');
      }
    });

    if (this.added > 0) {
      fs.writeFileSync(APP_JSON_PATH, JSON.stringify(appJson, null, 2), 'utf8');
      this.log(`\n✅ Added ${this.added} missing flow cards`, 'success');
    } else {
      this.log('\n✅ No missing flow cards found', 'success');
    }

    this.log('='.repeat(80) + '\n', 'info');
  }
}

// Run
if (require.main === module) {
  const fixer = new FlowCardFixer();
  fixer.run();
}

module.exports = FlowCardFixer;
