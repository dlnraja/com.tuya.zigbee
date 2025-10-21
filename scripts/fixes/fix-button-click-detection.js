#!/usr/bin/env node

/**
 * FIX BUTTON CLICK DETECTION
 * 
 * Amélioration détection clicks pour tous les boutons/switches:
 * - Single click detection
 * - Double click detection  
 * - Long press detection
 * - Debounce logic
 * - Multi-button support
 * 
 * Basé sur GitHub Issue #423 (_TZ3000_rco1yzb1 TS004F)
 * 
 * Usage: node scripts/fixes/fix-button-click-detection.js
 */

const fs = require('fs');
const path = require('path');

const PROJECT_ROOT = path.join(__dirname, '..', '..');
const DRIVERS_DIR = path.join(PROJECT_ROOT, 'drivers');

console.log('🔘 FIX BUTTON CLICK DETECTION\n');
console.log('Improving click detection for all button/switch drivers...\n');
console.log('='.repeat(80));

const BUTTON_DRIVERS = [
  'wireless_switch_cr2032',
  'wireless_switch_1gang_cr2032',
  'wireless_switch_2gang_cr2032',
  'wireless_switch_3gang_cr2032',
  'wireless_switch_4gang_cr2032',
  'wireless_switch_5gang_cr2032',
  'wireless_switch_6gang_cr2032',
  'sos_emergency_button_cr2032',
  'panic_button_battery',
  'scene_controller',
  'scene_controller_battery',
  'scene_controller_2button_cr2032',
  'scene_controller_4button_cr2032',
  'scene_controller_6button_cr2032',
  'scene_controller_8button_cr2032',
  'wireless_button_2gang_battery',
  'wireless_scene_controller_4button_battery'
];

/**
 * Template détection clicks optimisé
 */
const OPTIMIZED_CLICK_TEMPLATE = `
    // ==========================================
    // BUTTON CLICK DETECTION - OPTIMIZED
    // ==========================================
    
    // Click detection state
    this._clickState = {
      lastClick: 0,
      clickCount: 0,
      clickTimer: null,
      longPressTimer: null,
      buttonPressed: false
    };
    
    // Timing constants
    const DOUBLE_CLICK_WINDOW = 400;  // ms
    const LONG_PRESS_DURATION = 1000; // ms
    const DEBOUNCE_TIME = 50;         // ms
    
    // Register onOff cluster for button events
    if (this.hasCapability('onoff')) {
      this.registerCapability('onoff', 'onOff', {
        endpoint: 1
      });
    }
    
    // Listen for onOff commands (button press/release)
    const onOffCluster = this.zclNode.endpoints[1]?.clusters?.onOff;
    
    if (onOffCluster) {
      // Press detection
      onOffCluster.on('command', async (command) => {
        const now = Date.now();
        
        // Debounce
        if (now - this._clickState.lastClick < DEBOUNCE_TIME) {
          this.log('Debounced click');
          return;
        }
        
        this.log('Button command:', command);
        
        if (command === 'on' || command === 'off' || command === 'toggle') {
          this._clickState.buttonPressed = true;
          this._clickState.lastClick = now;
          
          // Start long press timer
          this._clickState.longPressTimer = setTimeout(() => {
            if (this._clickState.buttonPressed) {
              this.log('🔘 LONG PRESS detected');
              this.homey.flow.getDeviceTriggerCard('button_long_press')
                .trigger(this, {}, {})
                .catch(this.error);
              
              // Reset state after long press
              this._clickState.buttonPressed = false;
              this._clickState.clickCount = 0;
              if (this._clickState.clickTimer) {
                clearTimeout(this._clickState.clickTimer);
                this._clickState.clickTimer = null;
              }
            }
          }, LONG_PRESS_DURATION);
          
        } else if (command === 'commandButtonRelease' || this._clickState.buttonPressed) {
          // Button released
          this._clickState.buttonPressed = false;
          
          // Clear long press timer
          if (this._clickState.longPressTimer) {
            clearTimeout(this._clickState.longPressTimer);
            this._clickState.longPressTimer = null;
          }
          
          // Increment click count
          this._clickState.clickCount++;
          
          // Clear existing timer
          if (this._clickState.clickTimer) {
            clearTimeout(this._clickState.clickTimer);
          }
          
          // Wait for potential second click
          this._clickState.clickTimer = setTimeout(() => {
            const clicks = this._clickState.clickCount;
            this._clickState.clickCount = 0;
            this._clickState.clickTimer = null;
            
            if (clicks === 1) {
              this.log('🔘 SINGLE CLICK detected');
              this.homey.flow.getDeviceTriggerCard('button_pressed')
                .trigger(this, {}, {})
                .catch(this.error);
                
            } else if (clicks === 2) {
              this.log('🔘 DOUBLE CLICK detected');
              this.homey.flow.getDeviceTriggerCard('button_double_press')
                .trigger(this, {}, {})
                .catch(this.error);
                
            } else if (clicks >= 3) {
              this.log(\`🔘 MULTI CLICK detected (\${clicks})\`);
              this.homey.flow.getDeviceTriggerCard('button_multi_press')
                .trigger(this, { count: clicks }, {})
                .catch(this.error);
            }
          }, DOUBLE_CLICK_WINDOW);
        }
      });
      
      this.log('Button click detection initialized');
      
    } else {
      this.error('OnOff cluster not found for button detection');
    }
    
    // Alternative: Level Control cluster for some buttons
    const levelControlCluster = this.zclNode.endpoints[1]?.clusters?.levelControl;
    
    if (levelControlCluster) {
      levelControlCluster.on('command', async (command) => {
        this.log('Level control command:', command);
        
        // Some buttons use step/move commands
        if (command === 'step' || command === 'stepWithOnOff') {
          this.log('🔘 BUTTON STEP detected (single click alternative)');
          this.homey.flow.getDeviceTriggerCard('button_pressed')
            .trigger(this, {}, {})
            .catch(this.error);
        }
      });
    }
`.trim();

let fixed = 0;
let errors = 0;

console.log(`\nProcessing ${BUTTON_DRIVERS.length} button/switch drivers...\n`);

for (const driverId of BUTTON_DRIVERS) {
  const deviceJsPath = path.join(DRIVERS_DIR, driverId, 'device.js');
  
  if (!fs.existsSync(deviceJsPath)) {
    console.log(`⏭️  ${driverId}: device.js not found`);
    continue;
  }
  
  console.log(`\n🔍 Processing: ${driverId}`);
  
  let code = fs.readFileSync(deviceJsPath, 'utf8');
  
  // Backup
  fs.writeFileSync(deviceJsPath + '.backup-clicks', code, 'utf8');
  
  // Vérifier si déjà optimisé
  if (code.includes('BUTTON CLICK DETECTION - OPTIMIZED')) {
    console.log('   ✅ Already optimized');
    continue;
  }
  
  // Trouver onNodeInit
  const onInitMatch = code.match(/async\s+onNodeInit\s*\([^)]*\)\s*\{/);
  
  if (!onInitMatch) {
    console.log('   ❌ Cannot find onNodeInit');
    errors++;
    continue;
  }
  
  // Chercher section button existante
  const buttonMatch = code.match(/\/\/\s*(Button|Click|onOff cluster).*?(?=\n\s{2,4}\/\/|$)/si);
  
  if (buttonMatch) {
    code = code.replace(buttonMatch[0], OPTIMIZED_CLICK_TEMPLATE);
    console.log('   ✅ Replaced existing button code');
  } else {
    const insertPos = onInitMatch.index + onInitMatch[0].length;
    code = code.slice(0, insertPos) + '\n\n' + OPTIMIZED_CLICK_TEMPLATE + code.slice(insertPos);
    console.log('   ✅ Added button detection code');
  }
  
  fs.writeFileSync(deviceJsPath, code, 'utf8');
  fixed++;
}

console.log('\n' + '='.repeat(80));
console.log('📊 SUMMARY:\n');
console.log(`   ✅ Fixed: ${fixed} drivers`);
console.log(`   ❌ Errors: ${errors} drivers`);
console.log(`   📦 Total button drivers: ${BUTTON_DRIVERS.length}`);
console.log('='.repeat(80));

if (fixed > 0) {
  console.log('\n🎉 SUCCESS! Button click detection improved\n');
  console.log('Features added:');
  console.log('  ✓ Single click detection (reliable)');
  console.log('  ✓ Double click detection (400ms window)');
  console.log('  ✓ Long press detection (1000ms)');
  console.log('  ✓ Multi-click counting (3+)');
  console.log('  ✓ Debounce logic (50ms)');
  console.log('  ✓ Alternative levelControl support');
  console.log('\nNext steps:');
  console.log('  1. Add flow cards to app.json');
  console.log('  2. npm run validate:publish');
  console.log('  3. Test with TS004F device');
  console.log('');
}
