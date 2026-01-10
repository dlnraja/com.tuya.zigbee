'use strict';

const { CLUSTER } = require('zigbee-clusters');
const { AutoAdaptiveDevice } = require('../dynamic');

/**
 * WallTouchDevice - SDK3 Base Class for Multi-Gang Wall Touch Buttons
 * 
 * Features:
 * - Multi-endpoint button handling (1-8 gangs)
 * - Debounced combination detection
 * - Temperature monitoring
 * - Tamper detection
 * - Battery vs AC auto-detection (via BaseHybridDevice)
 * - SDK3 compliant (direct cluster listeners)
 * 
 * Usage:
 *   class WallTouch3GangDevice extends WallTouchDevice {
 *     async onNodeInit() {
 *       this.buttonCount = 3;
 *       await super.onNodeInit();
 *     }
 *   }
 */
class WallTouchDevice extends AutoAdaptiveDevice {

  async onNodeInit({ zclNode }) {
    this.log('[COLOR] WallTouchDevice initializing...');
    
    // Must be set by child class
    if (!this.buttonCount) {
      this.error('buttonCount not set! Set this.buttonCount before calling super.onNodeInit()');
      this.buttonCount = 1; // Fallback
    }
    
    // Init base hybrid (auto-détection power source)
    await super.onNodeInit({ zclNode });
    
    // Init buttons
    await this.initializeButtons();
    
    // Init temperature monitoring (if supported)
    await this.initializeTemperature();
    
    // Init tamper detection (if supported)
    await this.initializeTamper();
    
    this.log(`[OK] WallTouch${this.buttonCount}Gang ready`);
    this.log(`   Power: ${this.powerType}`);
    this.log(`   Battery: ${this.batteryType || 'N/A'}`);
  }

  /**
   * Initialize multi-gang button functionality (SDK3)
   */
  async initializeButtons() {
    this.log(`🔘 Initializing ${this.buttonCount}-gang buttons (SDK3)...`);
    
    // Button state tracking for debounced combinations
    this.buttonStates = {};
    this.debounceTimer = null;
    
    for (let i = 1; i <= this.buttonCount; i++) {
      const capabilityId = `onoff.button${i}`;
      
      // Add capability if missing
      if (!this.hasCapability(capabilityId)) {
        await Promise.resolve(addCapability(capabilityId)).catch(err => 
          this.error(`Failed to add ${capabilityId}:`, err)
        );
        this.log(`➕ Added capability: ${capabilityId}`);
      }
      
      // SDK3: Register capability listener (UI control)
      this.registerCapabilityListener(capabilityId, async (value) => {
        return this.onButtonChanged(i, value);
      });
      
      // SDK3: Direct cluster listener (device → Homey)
      const endpoint = this.zclNode.endpoints[i];
      if (endpoint?.clusters?.onOff) {
        endpoint.clusters.onOff.on('attr.onOff', async (value) => {
          this.log(`[RECV] Button ${i} cluster update: ${value}`);
          
          await Promise.resolve(setCapabilityValue(capabilityId, value)).catch(this.error);
          
          // Track for combinations
          this.buttonStates[capabilityId] = value;
          this.checkButtonCombinations();
        });
        
        // SDK3: Configure attribute reporting (call super directly)
        try {
          await super.configureAttributeReporting([
            {
              endpointId: i,
              cluster: CLUSTER.ON_OFF,
              attributeName: 'onOff',
              minInterval: 0,
              maxInterval: 300,
              minChange: 0
            }
          ]);
          if (!this._reportingConfigured) this._reportingConfigured = {};
          if (!this._reportingConfigured[i]) {
            this.log(`[OK] Reporting configured for endpoint ${i}`);
            this._reportingConfigured[i] = true;
          }
        } catch (err) {
          this.log(`[WARN] Reporting failed for endpoint ${i}:`, err.message);
        }
        
        this.log(`[OK] Button ${i} registered (SDK3)`);
      } else {
        this.log(`[WARN]  Button ${i}: onOff cluster not available`);
      }
    }
  }

  /**
   * Handle button state change (from UI or device)
   */
  async onButtonChanged(buttonNumber, value) {
    this.log(`🔘 Button ${buttonNumber} changed to: ${value ? 'ON' : 'OFF'}`);
    
    // Trigger flow card
    await this.triggerButtonPressed(buttonNumber, value);
    
    // Check switch type
    const switchType = this.getSetting('switch_type');
    
    if (switchType === 'momentary') {
      // Auto-reset after delay
      setTimeout(async () => {
        const capabilityId = `onoff.button${buttonNumber}`;
        await Promise.resolve(setCapabilityValue(capabilityId, false)).catch(this.error);
      }, 200);
    }
    
    // Track for combinations
    const capabilityId = `onoff.button${buttonNumber}`;
    this.buttonStates[capabilityId] = value;
    this.checkButtonCombinations();
    
    return Promise.resolve();
  }

  /**
   * Check for button combinations (debounced)
   */
  checkButtonCombinations() {
    // Clear existing timer
    if (this.debounceTimer) {
      clearTimeout(this.debounceTimer);
    }
    
    // Debounce: wait 500ms for all buttons
    this.debounceTimer = setTimeout(async () => {
      const pressed = Object.keys(this.buttonStates)
        .filter(key => this.buttonStates[key])
        .map(key => parseInt(key.replace('onoff.button', '')));
      
      if (pressed.length > 1) {
        this.log(`🔘 Multiple buttons pressed: ${pressed.join(', ')}`);
        await this.triggerButtonCombination(pressed);
      }
      
      // Reset states after combination
      Object.keys(this.buttonStates).forEach(key => {
        this.buttonStates[key] = false;
      });
    }, 500);
  }

  /**
   * Trigger button pressed flow card
   */
  async triggerButtonPressed(buttonNumber, state) {
    const tokens = {
      button: buttonNumber,
      state: state ? 'on' : 'off'
    };
    
    const triggerCard = this.homey.flow.getDeviceTriggerCard('button_pressed');
    if (triggerCard) {
      await triggerCard.Promise.resolve(trigger(this, tokens, {})).catch(err => 
        this.error('Button pressed trigger failed:', err)
      );
    }
  }

  /**
   * Trigger button combination flow card
   */
  async triggerButtonCombination(buttons) {
    const tokens = {
      buttons: buttons.join(', '),
      count: buttons.length
    };
    
    const triggerCard = this.homey.flow.getDeviceTriggerCard('button_combination');
    if (triggerCard) {
      await triggerCard.Promise.resolve(trigger(this, tokens, {})).catch(err => 
        this.error('Button combination trigger failed:', err)
      );
    }
  }

  /**
   * Initialize temperature monitoring (SDK3)
   */
  async initializeTemperature() {
    if (!this.hasCapability('measure_temperature')) {
      return;
    }
    
    this.log('[TEMP] Initializing temperature monitoring (SDK3)...');
    
    const endpoint = this.zclNode.endpoints[1];
    if (!endpoint?.clusters?.msTemperatureMeasurement) {
      this.log('[WARN]  msTemperatureMeasurement cluster not available');
      return;
    }
    
    // SDK3: Direct cluster listener
    endpoint.clusters.msTemperatureMeasurement.on('attr.measuredValue', async (value) => {
      if (value === null || value === undefined) return;
      
      const temp = Math.round(value / 100 * 10) / 10;
      this.log(`[TEMP] Temperature: ${temp}°C`);
      
      if (this.hasCapability('measure_temperature')) {
        await Promise.resolve(setCapabilityValue('measure_temperature', parseFloat(temp))).catch(this.error);
      }
    });
    
    // SDK3: Configure attribute reporting (call super directly)
    try {
      await super.configureAttributeReporting([
        {
          endpointId: 1,
          cluster: CLUSTER.TEMPERATURE_MEASUREMENT,
          attributeName: 'measuredValue',
          minInterval: 60,
          maxInterval: 3600,
          minChange: 50
        }
      ]);
      if (!this._tempReportingConfigured) {
        this.log('[OK] Temperature reporting configured');
        this._tempReportingConfigured = true;
      }
    } catch (err) {
      this.log('[WARN] Configure temp reporting (non-critical):', err.message);
    }
    
    this.log('[OK] Temperature monitoring ready (SDK3)');
  }

  /**
   * Initialize tamper detection (SDK3)
   */
  async initializeTamper() {
    if (!this.hasCapability('alarm_tamper')) {
      return;
    }
    
    this.log('[ALARM] Initializing tamper detection (SDK3)...');
    
    const endpoint = this.zclNode.endpoints[1];
    if (!endpoint?.clusters?.ssIasZone) {
      this.log('[WARN]  ssIasZone cluster not available');
      return;
    }
    
    // SDK3: Direct cluster listener for zone status
    endpoint.clusters.ssIasZone.on('zoneStatusChangeNotification', async (payload) => {
      const tamper = (payload.zonestatus & 0x04) !== 0;
      this.log(`[ALARM] Tamper detected: ${tamper}`);
      
      await Promise.resolve(setCapabilityValue('alarm_tamper', tamper)).catch(this.error);
    });
    
    this.log('[OK] Tamper detection ready (SDK3)');
  }

  /**
   * Handle device deletion
   */
  async onDeleted() {
    this.log('WallTouchDevice has been deleted');
    
    // Clear timers
    if (this.debounceTimer) {
      clearTimeout(this.debounceTimer);
    }
    
    await super.onDeleted();
  }
}

module.exports = WallTouchDevice;
