'use strict';

const BaseHybridDevice = require('./BaseHybridDevice');

/**
 * ButtonDevice - Base class for wireless button controllers
 * Handles single/double/long press detection
 * Automatically detects battery type (CR2032/CR2450/AAA)
 */
class ButtonDevice extends BaseHybridDevice {

  async onNodeInit({ zclNode }) {
    // Initialize hybrid base (power detection)
    await super.onNodeInit({ zclNode });
    
    // Setup button-specific functionality
    await this.setupButtonDetection();
    
    this.log('ButtonDevice ready');
  }

  /**
   * Setup button click detection
   * Handles single, double, long press, and multi-press
   * 
   * Tuya TS0043/TS0044 devices send commands via:
   * - scenes.recall (MOST COMMON for Tuya buttons)
   * - onOff.toggle/on/off (some devices)
   * - levelControl.step (dimmer buttons)
   */
  async setupButtonDetection() {
    this.log('🔘 Setting up button detection...');
    
    // Click detection state
    this._clickState = {
      lastClick: 0,
      clickCount: 0,
      clickTimer: null,
      longPressTimer: null,
      buttonPressed: false,
      activeButton: null
    };
    
    // Timing constants
    const DOUBLE_CLICK_WINDOW = 400;  // ms
    const LONG_PRESS_DURATION = 1000; // ms
    const DEBOUNCE_TIME = 50;         // ms
    
    // Listen for commands on all endpoints
    const endpoints = this.buttonCount || 1;
    
    for (let ep = 1; ep <= endpoints; ep++) {
      try {
        // CRITICAL: Join groups FIRST (Tuya buttons use groups cluster for broadcasting!)
        const groupsCluster = this.zclNode.endpoints[ep]?.clusters?.groups;
        if (groupsCluster) {
          try {
            this.log(`[GROUPS] Joining group 0 on endpoint ${ep} for broadcast reception...`);
            await groupsCluster.add({ groupId: 0, groupName: 'HomeyGroup' });
            this.log(`[GROUPS] ✅ Endpoint ${ep} joined group 0`);
          } catch (err) {
            this.log(`[GROUPS] Group join failed (may already be member):`, err.message);
          }
        }
        
        // PRIORITY 1: Scenes cluster (Tuya TS0043/TS0044 use this!)
        const scenesCluster = this.zclNode.endpoints[ep]?.clusters?.scenes;
        if (scenesCluster) {
          this.log(`[SETUP] Listening to scenes cluster on endpoint ${ep}...`);
          
          // CRITICAL: Bind to coordinator first!
          if (typeof scenesCluster.bind === 'function') {
            try {
              await scenesCluster.bind();
              this.log(`[BIND] ✅ Scenes cluster bound on endpoint ${ep}`);
            } catch (err) {
              this.log(`[BIND] Scenes bind failed (non-critical):`, err.message);
            }
          } else {
            this.log(`[BIND] Scenes bind not supported (SDK3 limitation)`);
          }
          
          scenesCluster.on('command', async (commandName, commandPayload) => {
            this.log(`[SCENE] Button ${ep} command: ${commandName}`, commandPayload);
            
            // Scene recall = button press (most common for Tuya)
            if (commandName === 'recall') {
              const sceneId = commandPayload?.sceneId || commandPayload?.scene || 0;
              this.log(`🔘 Button ${ep} pressed (scene ${sceneId})`);
              
              // Map scene ID to press type
              // Scene 0 = single press
              // Scene 1 = double press
              // Scene 2 = long press
              if (sceneId === 0) {
                await this.triggerButtonPress(ep, 'single');
              } else if (sceneId === 1) {
                await this.triggerButtonPress(ep, 'double');
              } else if (sceneId === 2) {
                await this.triggerButtonPress(ep, 'long');
              } else {
                // Fallback: treat any scene as single press
                await this.triggerButtonPress(ep, 'single');
              }
            }
          });
          
          this.log(`[OK] ✅ Button ${ep} scenes detection configured`);
        }
        
        // PRIORITY 2: OnOff cluster (alternative for some devices)
        const onOffCluster = this.zclNode.endpoints[ep]?.clusters?.onOff;
        if (onOffCluster) {
          this.log(`[SETUP] Listening to onOff cluster on endpoint ${ep}...`);
          
          // CRITICAL: Bind to coordinator first (if supported)!
          if (typeof onOffCluster.bind === 'function') {
            try {
              await onOffCluster.bind();
              this.log(`[BIND] ✅ OnOff cluster bound on endpoint ${ep}`);
            } catch (err) {
              this.log(`[BIND] OnOff bind failed (non-critical):`, err.message);
            }
          } else {
            this.log(`[BIND] ⚠️  OnOff cluster bind not supported (SDK3 limitation)`);
          }
          
          onOffCluster.on('command', async (commandName) => {
            this.log(`[ONOFF] Button ${ep} command: ${commandName}`);
            
            if (commandName === 'toggle' || commandName === 'on' || commandName === 'off') {
              await this.handleButtonCommand(ep, commandName, {
                DOUBLE_CLICK_WINDOW,
                LONG_PRESS_DURATION,
                DEBOUNCE_TIME
              });
            }
          });
          
          this.log(`[OK] ✅ Button ${ep} onOff detection configured`);
        }
        
        // PRIORITY 3: Level Control cluster (dimmer buttons)
        const levelCluster = this.zclNode.endpoints[ep]?.clusters?.levelControl;
        if (levelCluster) {
          this.log(`[SETUP] Listening to levelControl cluster on endpoint ${ep}...`);
          
          levelCluster.on('command', async (commandName, payload) => {
            this.log(`[LEVEL] Button ${ep} command: ${commandName}`, payload);
            
            if (commandName === 'step' || commandName === 'stepWithOnOff') {
              const stepMode = payload?.stepMode || payload?.mode || 0;
              // 0 = up, 1 = down
              this.log(`🔘 Button ${ep} ${stepMode === 0 ? 'UP' : 'DOWN'}`);
              await this.triggerButtonPress(ep, 'single');
            } else if (commandName === 'move' || commandName === 'moveWithOnOff') {
              this.log(`🔘 Button ${ep} LONG PRESS (moving)`);
              await this.triggerButtonPress(ep, 'long');
            } else if (commandName === 'stop' || commandName === 'stopWithOnOff') {
              this.log(`🔘 Button ${ep} RELEASE`);
              // Release handled internally
            }
          });
          
          this.log(`[OK] ✅ Button ${ep} levelControl detection configured`);
        }
        
        // Log if NO clusters found
        if (!scenesCluster && !onOffCluster && !levelCluster) {
          this.log(`[WARN] ⚠️  No button clusters found on endpoint ${ep}`);
        }
        
      } catch (err) {
        this.error(`Failed to setup button ${ep}:`, err.message);
      }
    }
    
    this.log(`[OK] Button detection configured for ${endpoints} button(s)`);
  }

  /**
   * Handle button command (press/release)
   */
  async handleButtonCommand(endpoint, command, timing) {
    const now = Date.now();
    
    // Debounce
    if (now - this._clickState.lastClick < timing.DEBOUNCE_TIME) {
      return;
    }
    
    this.log(`Button ${endpoint} command:`, command);
    
    // Button press detected
    if (command === 'on' || command === 'off' || command === 'toggle') {
      this._clickState.buttonPressed = true;
      this._clickState.activeButton = endpoint;
      this._clickState.lastClick = now;
      
      // Start long press timer
      this._clickState.longPressTimer = setTimeout(() => {
        if (this._clickState.buttonPressed && this._clickState.activeButton === endpoint) {
          this.log(`🔘 LONG PRESS detected (button ${endpoint})`);
          this.triggerButtonPress(endpoint, 'long');
          
          // Reset state after long press
          this._clickState.buttonPressed = false;
          this._clickState.clickCount = 0;
          this._clickState.activeButton = null;
          if (this._clickState.clickTimer) {
            clearTimeout(this._clickState.clickTimer);
            this._clickState.clickTimer = null;
          }
        }
      }, timing.LONG_PRESS_DURATION);
      
    } 
    // Button release detected
    else if (command === 'commandButtonRelease' || this._clickState.buttonPressed) {
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
      
      // Wait for potential additional clicks
      this._clickState.clickTimer = setTimeout(() => {
        const clicks = this._clickState.clickCount;
        const button = this._clickState.activeButton || endpoint;
        this._clickState.clickCount = 0;
        this._clickState.clickTimer = null;
        this._clickState.activeButton = null;
        
        if (clicks === 1) {
          this.log(`🔘 SINGLE CLICK detected (button ${button})`);
          this.triggerButtonPress(button, 'single');
          
        } else if (clicks === 2) {
          this.log(`🔘 DOUBLE CLICK detected (button ${button})`);
          this.triggerButtonPress(button, 'double');
          
        } else if (clicks >= 3) {
          this.log(`🔘 MULTI CLICK detected (button ${button}, ${clicks} times)`);
          this.triggerButtonPress(button, 'multi', clicks);
        }
      }, timing.DOUBLE_CLICK_WINDOW);
    }
  }

  /**
   * Trigger flow cards for button press - ULTRA VERBOSE VERSION
   */
  async triggerButtonPress(button, type = 'single', count = 1) {
    this.log('════════════════════════════════════════');
    this.log('[FLOW-TRIGGER] 🔘 BUTTON PRESS DETECTED!');
    this.log('[FLOW-TRIGGER] Button:', button);
    this.log('[FLOW-TRIGGER] Type:', type);
    this.log('[FLOW-TRIGGER] Count:', count);
    this.log('[FLOW-TRIGGER] Driver ID:', this.driver.id);
    this.log('[FLOW-TRIGGER] Device Name:', this.getName());
    this.log('════════════════════════════════════════');
    
    try {
      const driverId = this.driver.id;
      this.log('[FLOW-TRIGGER] 📢 Attempting to trigger flows...');
    
      if (type === 'single') {
        this.log('[FLOW-TRIGGER] Type: SINGLE PRESS');
        
        // Try 1: Generic button_pressed with button token
        try {
          this.log('[FLOW-TRIGGER] Trying: button_pressed (generic)');
          await this.homey.flow.getDeviceTriggerCard('button_pressed')
            .trigger(this, { button: button.toString() }, {});
          this.log('[FLOW-TRIGGER] ✅ button_pressed SUCCESS');
        } catch (err) {
          this.log('[FLOW-TRIGGER] ❌ button_pressed FAILED:', err.message);
        }
        
        // Try 2: Driver-specific with button token (e.g. button_wireless_4_button_4gang_button_pressed)
        try {
          // CRITICAL FIX: app.json has extra "_button_Xgang" in ID!
          const gangCount = this.buttonCount || 1;
          const cardId = `${driverId}_button_${gangCount}gang_button_pressed`;
          this.log('[FLOW-TRIGGER] Trying:', cardId);
          await this.homey.flow.getDeviceTriggerCard(cardId)
            .trigger(this, { button: button.toString() }, {});
          this.log(`[FLOW-TRIGGER] ✅ ${cardId} SUCCESS`);
        } catch (err) {
          this.log(`[FLOW-TRIGGER] ⚠️  Flow card NOT FOUND or FAILED:`, err.message);
        }
        
        // Try 3: Button-specific without token (e.g. button_wireless_4_button_1_pressed)
        try {
          const specificCardId = `${driverId}_button_${button}_pressed`;
          this.log('[FLOW-TRIGGER] Trying:', specificCardId);
          await this.homey.flow.getDeviceTriggerCard(specificCardId)
            .trigger(this, {}, {});
          this.log(`[FLOW-TRIGGER] ✅ ${specificCardId} SUCCESS`);
        } catch (err) {
          this.log(`[FLOW-TRIGGER] ⚠️  ${specificCardId} NOT FOUND (normal if doesn't exist)`);
        }
        
      } else if (type === 'double') {
        this.log('[FLOW-TRIGGER] Type: DOUBLE PRESS');
        
        try {
          this.log('[FLOW-TRIGGER] Trying: button_double_press');
          await this.homey.flow.getDeviceTriggerCard('button_double_press')
            .trigger(this, { button: button.toString() }, {});
          this.log('[FLOW-TRIGGER] ✅ button_double_press SUCCESS');
        } catch (err) {
          this.log('[FLOW-TRIGGER] ❌ button_double_press FAILED:', err.message);
        }
        
        try {
          const cardId = `${driverId}_button_${button}_double`;
          this.log('[FLOW-TRIGGER] Trying:', cardId);
          await this.homey.flow.getDeviceTriggerCard(cardId)
            .trigger(this, {}, {});
          this.log(`[FLOW-TRIGGER] ✅ ${cardId} SUCCESS`);
        } catch (err) {
          this.log(`[FLOW-TRIGGER] ⚠️  ${cardId} NOT FOUND`);
        }
        
      } else if (type === 'long') {
        this.log('[FLOW-TRIGGER] Type: LONG PRESS');
        
        try {
          this.log('[FLOW-TRIGGER] Trying: button_long_press');
          await this.homey.flow.getDeviceTriggerCard('button_long_press')
            .trigger(this, { button: button.toString() }, {});
          this.log('[FLOW-TRIGGER] ✅ button_long_press SUCCESS');
        } catch (err) {
          this.log('[FLOW-TRIGGER] ❌ button_long_press FAILED:', err.message);
        }
        
        try {
          const cardId = `${driverId}_button_${button}_long`;
          this.log('[FLOW-TRIGGER] Trying:', cardId);
          await this.homey.flow.getDeviceTriggerCard(cardId)
            .trigger(this, {}, {});
          this.log(`[FLOW-TRIGGER] ✅ ${cardId} SUCCESS`);
        } catch (err) {
          this.log(`[FLOW-TRIGGER] ⚠️  ${cardId} NOT FOUND`);
        }
        
      } else if (type === 'multi') {
        this.log('[FLOW-TRIGGER] Type: MULTI PRESS (count:', count, ')');
        
        try {
          this.log('[FLOW-TRIGGER] Trying: button_multi_press');
          await this.homey.flow.getDeviceTriggerCard('button_multi_press')
            .trigger(this, { button: button.toString(), count }, {});
          this.log('[FLOW-TRIGGER] ✅ button_multi_press SUCCESS');
        } catch (err) {
          this.log('[FLOW-TRIGGER] ❌ button_multi_press FAILED:', err.message);
        }
      }
      
      this.log('[FLOW-TRIGGER] ✅ All flow card attempts completed');
      this.log('════════════════════════════════════════\n');
      
    } catch (err) {
      this.error('[FLOW-TRIGGER] ❌ CRITICAL ERROR in triggerButtonPress:');
      this.error('[FLOW-TRIGGER] Error:', err.message);
      this.error('[FLOW-TRIGGER] Stack:', err.stack);
      this.log('════════════════════════════════════════\n');
    }
  }

  /**
   * Set number of buttons for this device
   */
  setButtonCount(count) {
    this.buttonCount = count;
  }

  /**
   * Get button count
   */
  getButtonCount() {
    return this.buttonCount || 1;
  }
}

module.exports = ButtonDevice;
