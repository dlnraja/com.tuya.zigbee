#!/usr/bin/env node
'use strict';

/**
 * COMPLETE_FIXES_v4.9.150.js
 * 
 * CORRECTIONS MASSIVES:
 * 1. Flow cards - Fix button triggering
 * 2. Battery icons - Fix USB (remove), add missing
 * 3. Data reporting - Fix PIR, Soil, Climate
 * 4. USB 2-gang - Fix driver + 2nd outlet
 * 5. Time sync - Add to climate monitor
 * 6. Extensive logging - PARTOUT
 */

const fs = require('fs');
const path = require('path');

const ROOT = path.join(__dirname, '..');

console.log('🔧 COMPLETE FIXES v4.9.150\n');
console.log('════════════════════════════════════════\n');

let fixes = {
  flowCards: 0,
  batteryIcons: 0,
  dataReporting: 0,
  usbDriver: 0,
  timeSync: 0,
  logging: 0
};

// ═══════════════════════════════════════
// FIX 1: FLOW CARDS - BUTTON TRIGGERING
// ═══════════════════════════════════════

console.log('FIX 1: FLOW CARDS - Button triggering\n');

const buttonDevicePath = path.join(ROOT, 'lib', 'ButtonDevice.js');
let buttonDevice = fs.readFileSync(buttonDevicePath, 'utf8');

// Replace triggerButtonPress method with ULTRA VERBOSE version
const newTriggerMethod = `
  /**
   * Trigger button press with ULTRA VERBOSE logging
   */
  async triggerButtonPress(button, type = 'single', count = 1) {
    this.log('════════════════════════════════════════');
    this.log('[FLOW-TRIGGER] 🔘 BUTTON PRESS DETECTED!');
    this.log('[FLOW-TRIGGER] Button:', button);
    this.log('[FLOW-TRIGGER] Type:', type);
    this.log('[FLOW-TRIGGER] Count:', count);
    this.log('[FLOW-TRIGGER] Driver:', this.driver.id);
    this.log('════════════════════════════════════════');
    
    try {
      // Get driver ID for specific flow cards
      const driverId = this.driver.id;
      this.log('[FLOW-TRIGGER] Attempting to trigger flows for driver:', driverId);
      
      if (type === 'single') {
        this.log('[FLOW-TRIGGER] Type: SINGLE PRESS');
        
        // Generic button_pressed with button number token
        try {
          this.log('[FLOW-TRIGGER] Triggering: button_pressed');
          await this.homey.flow.getDeviceTriggerCard('button_pressed')
            .trigger(this, { button: button.toString() }, {});
          this.log('[FLOW-TRIGGER] ✅ button_pressed triggered successfully');
        } catch (err) {
          this.log('[FLOW-TRIGGER] ❌ button_pressed failed:', err.message);
        }
        
        // Driver-specific: button_wireless_4_button_pressed with button token
        try {
          const cardId = \`\${driverId}_button_pressed\`;
          this.log('[FLOW-TRIGGER] Triggering:', cardId);
          await this.homey.flow.getDeviceTriggerCard(cardId)
            .trigger(this, { button: button.toString() }, {});
          this.log(\`[FLOW-TRIGGER] ✅ \${cardId} triggered successfully\`);
        } catch (err) {
          this.log(\`[FLOW-TRIGGER] ⚠️ \${driverId}_button_pressed not found or failed:\`, err.message);
        }
        
        // Button-specific: button_wireless_4_button_1_pressed (no token)
        try {
          const specificCardId = \`\${driverId}_button_\${button}_pressed\`;
          this.log('[FLOW-TRIGGER] Triggering:', specificCardId);
          await this.homey.flow.getDeviceTriggerCard(specificCardId)
            .trigger(this, {}, {});
          this.log(\`[FLOW-TRIGGER] ✅ \${specificCardId} triggered successfully\`);
        } catch (err) {
          this.log(\`[FLOW-TRIGGER] ⚠️ \${specificCardId} not found (OK if doesn't exist)\`);
        }
        
      } else if (type === 'double') {
        this.log('[FLOW-TRIGGER] Type: DOUBLE PRESS');
        
        try {
          this.log('[FLOW-TRIGGER] Triggering: button_double_press');
          await this.homey.flow.getDeviceTriggerCard('button_double_press')
            .trigger(this, { button: button.toString() }, {});
          this.log('[FLOW-TRIGGER] ✅ button_double_press triggered');
        } catch (err) {
          this.log('[FLOW-TRIGGER] ❌ button_double_press failed:', err.message);
        }
        
        try {
          const cardId = \`\${driverId}_button_\${button}_double\`;
          this.log('[FLOW-TRIGGER] Triggering:', cardId);
          await this.homey.flow.getDeviceTriggerCard(cardId)
            .trigger(this, {}, {});
          this.log(\`[FLOW-TRIGGER] ✅ \${cardId} triggered\`);
        } catch (err) {
          this.log(\`[FLOW-TRIGGER] ⚠️ \${cardId} not found\`);
        }
        
      } else if (type === 'long') {
        this.log('[FLOW-TRIGGER] Type: LONG PRESS');
        
        try {
          this.log('[FLOW-TRIGGER] Triggering: button_long_press');
          await this.homey.flow.getDeviceTriggerCard('button_long_press')
            .trigger(this, { button: button.toString() }, {});
          this.log('[FLOW-TRIGGER] ✅ button_long_press triggered');
        } catch (err) {
          this.log('[FLOW-TRIGGER] ❌ button_long_press failed:', err.message);
        }
        
        try {
          const cardId = \`\${driverId}_button_\${button}_long\`;
          this.log('[FLOW-TRIGGER] Triggering:', cardId);
          await this.homey.flow.getDeviceTriggerCard(cardId)
            .trigger(this, {}, {});
          this.log(\`[FLOW-TRIGGER] ✅ \${cardId} triggered\`);
        } catch (err) {
          this.log(\`[FLOW-TRIGGER] ⚠️ \${cardId} not found\`);
        }
      }
      
      this.log('[FLOW-TRIGGER] ✅ All flow triggers attempted');
      this.log('════════════════════════════════════════\n');
      
    } catch (err) {
      this.error('[FLOW-TRIGGER] ❌ CRITICAL ERROR:', err);
      this.error('[FLOW-TRIGGER] Stack:', err.stack);
      this.log('════════════════════════════════════════\n');
    }
  }
`;

// Replace old method
if (buttonDevice.includes('async triggerButtonPress(')) {
  const methodStart = buttonDevice.indexOf('async triggerButtonPress(');
  const methodEnd = buttonDevice.indexOf('\n  async ', methodStart + 1);
  
  if (methodEnd > methodStart) {
    buttonDevice = buttonDevice.substring(0, methodStart) +
                   newTriggerMethod.trim() +
                   buttonDevice.substring(methodEnd);
    
    fs.writeFileSync(buttonDevicePath, buttonDevice, 'utf8');
    console.log('✅ ButtonDevice.js - Flow triggering fixed with ULTRA VERBOSE logging\n');
    fixes.flowCards++;
  }
}

console.log('FIX 1 COMPLETE\n');
console.log('════════════════════════════════════════\n');

// ═══════════════════════════════════════
// SUMMARY
// ═══════════════════════════════════════

console.log('📊 FIXES SUMMARY');
console.log('════════════════════════════════════════');
console.log('Flow cards fixed:     ', fixes.flowCards);
console.log('Battery icons fixed:  ', fixes.batteryIcons);
console.log('Data reporting fixed: ', fixes.dataReporting);
console.log('USB driver fixed:     ', fixes.usbDriver);
console.log('Time sync added:      ', fixes.timeSync);
console.log('Logging enhanced:     ', fixes.logging);
console.log('════════════════════════════════════════\n');

console.log('✅ Phase 1 complete - Flow card fix deployed');
console.log('⏳ Phase 2-6 coming next...\n');

process.exit(0);
