'use strict';

const BaseHybridDevice = require('./BaseHybridDevice');

/**
 * ButtonDevice - Base class for wireless button controllers
 * Handles single/double/long press detection
 * Automatically detects battery type (CR2032/CR2450/AAA)
 */
class ButtonDevice extends BaseHybridDevice {

  async onNodeInit() {
    // Initialize hybrid base (power detection)
    await super.onNodeInit();
    
    // Setup button-specific functionality
    await this.setupButtonDetection();
    
    this.log('ButtonDevice ready');
  }

  /**
   * Setup button click detection
   * Handles single, double, long press, and multi-press
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
    
    // Listen for onOff commands (button press/release)
    const endpoints = this.buttonCount || 1;
    
    for (let ep = 1; ep <= endpoints; ep++) {
      // TODO: Wrap in try/catch
      const onOffCluster = this.zclNode.endpoints[ep]?.clusters?.onOff;
      
      if (onOffCluster) {
        onOffCluster.on('command', async (command) => {
          await this.handleButtonCommand(ep, command, {
            DOUBLE_CLICK_WINDOW,
            LONG_PRESS_DURATION,
            DEBOUNCE_TIME
          });
        });
        
        this.log(`✅ Button ${ep} detection configured`);
      }
      
      // Alternative: Level Control cluster
      // TODO: Wrap in try/catch
      const levelCluster = this.zclNode.endpoints[ep]?.clusters?.levelControl;
      if (levelCluster) {
        levelCluster.on('command', async (command) => {
          this.log(`Level control command (button ${ep}):`, command);
          
          if (command === 'step' || command === 'stepWithOnOff') {
            await this.triggerButtonPress(ep, 'single');
          }
        });
      }
    }
    
    this.log(`✅ Button detection configured for ${endpoints} button(s)`);
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
   * Trigger button press flow card
   */
  async triggerButtonPress(button, type, count) {
    const driverId = this.driver.id;
    
    try {
      if (type === 'single') {
        await this.homey.flow.getDeviceTriggerCard('button_pressed')
          .trigger(this, { button: button.toString() }, {})
          .catch(() => {});
          
        // Button-specific trigger
        await this.homey.flow.getDeviceTriggerCard(`${driverId}_button_${button}_pressed`)
          .trigger(this, {}, {})
          .catch(() => {});
          
      } else if (type === 'double') {
        await this.homey.flow.getDeviceTriggerCard('button_double_press')
          .trigger(this, { button: button.toString() }, {})
          .catch(() => {});
          
        await this.homey.flow.getDeviceTriggerCard(`${driverId}_button_${button}_double`)
          .trigger(this, {}, {})
          .catch(() => {});
          
      } else if (type === 'long') {
        await this.homey.flow.getDeviceTriggerCard('button_long_press')
          .trigger(this, { button: button.toString() }, {})
          .catch(() => {});
          
        await this.homey.flow.getDeviceTriggerCard(`${driverId}_button_${button}_long`)
          .trigger(this, {}, {})
          .catch(() => {});
          
      } else if (type === 'multi') {
        await this.homey.flow.getDeviceTriggerCard('button_multi_press')
          .trigger(this, { button: button.toString(), count }, {})
          .catch(() => {});
      }
      
    } catch (err) {
      this.error(`Button press trigger failed:`, err.message);
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
