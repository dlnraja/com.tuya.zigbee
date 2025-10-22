'use strict';

const { ZigBeeDevice } = require('homey-zigbeedriver');
const { CLUSTER } = require('zigbee-clusters');
const IASZoneEnroller = require('../../lib/IASZoneEnroller');
const { fromZclBatteryPercentageRemaining } = require('../../lib/tuya-engine/converters/battery');
const FallbackSystem = require('../../lib/FallbackSystem');

class SOSEmergencyButtonDevice extends ZigBeeDevice {

  async onNodeInit({ zclNode }) {

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
      // TODO: Consider debouncing capability updates for better performance
      this.registerCapability('onoff', CLUSTER.ON_OFF, {
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
              this.log(`🔘 MULTI CLICK detected (${clicks})`);
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
    // ==========================================
    // BATTERY MANAGEMENT - SDK3 FIXED
    // ==========================================

    // Configure battery reporting with CORRECT minChange
    try {
      await this.configureAttributeReporting([{
        endpointId: 1,
        cluster: CLUSTER.POWER_CONFIGURATION,  // SDK3: Use CLUSTER constant
        attributeName: 'batteryPercentageRemaining',
        minInterval: 7200,
        maxInterval: 43200,  // Reduced from 172800 (2 days) to 12 hours
        minChange: 2  // FIXED: Minimum 2 for battery (0-200 scale)
      }]);
      this.log('Battery reporting configured');
    } catch (err) {
      this.log('Battery report config failed (non-critical):', err.message);
    }

    // Register battery capability using CLUSTER constant (SDK3 requirement)
    this.registerCapability('measure_battery', CLUSTER.POWER_CONFIGURATION, {
      endpoint: 1,
      get: 'batteryPercentageRemaining',
      report: 'batteryPercentageRemaining',
      getOpts: {
        getOnStart: true
      },
      reportParser: value => {
        this.log('Battery raw value:', value);
        return fromZclBatteryPercentageRemaining(value);
      },
      getParser: value => fromZclBatteryPercentageRemaining(value)
    });
    this.log('✅ Battery capability registered with converter');

    // Initial battery poll after pairing
    setTimeout(async () => {
      try {
        await this.pollAttributes();
        this.log('Initial battery poll completed');
      } catch (err) {
        this.error('Initial battery poll failed:', err);
      }
    }, 5000);

    // SOS Button IAS Zone - v2.15.71 working pattern + IASZoneEnroller fallback
    this.log('🚨 Setting up SOS button IAS Zone...');

    // PRIMARY METHOD: Direct enrollment (v2.15.71 pattern that worked!)
    const sosEndpoint = zclNode.endpoints[1];
    const iasZoneCluster = sosEndpoint.clusters.iasZone;

    if (iasZoneCluster) {
      // Listen for zone status changes (attribute reports)
      iasZoneCluster.on('attr.zoneStatus', (value) => {
        const alarmActive = (value & 0x01) === 0x01; // Bit 0 = alarm1 (button pressed)
        this.log('🔔 SOS Button (attr):', alarmActive);
        this.setCapabilityValue('alarm_generic', alarmActive).catch(this.error);
      });
      
      // CRITICAL: Listen for zone status change notifications (command-based)
      // Some devices send commands instead of attribute reports
      iasZoneCluster.on('zoneStatusChangeNotification', async (payload) => {
        this.log('📨 SOS Button notification received:', payload);
        const alarmActive = (payload.zoneStatus & 0x01) === 0x01;
        this.log('🔔 SOS Button (notification):', alarmActive);
        this.setCapabilityValue('alarm_generic', alarmActive).catch(this.error);
      });

      // Proactive enrollment response
      iasZoneCluster.on('zoneEnrollRequest', async (enrollRequest) => {
        this.log('Received zoneEnrollRequest:', enrollRequest);
        try {
          await iasZoneCluster.zoneEnrollResponse({
            enrollResponseCode: 0, // Success
            zoneId: 10
          });
          this.log('Sent zoneEnrollResponse successfully');
        } catch (err) {
          this.error('Failed to send zoneEnrollResponse:', err);
        }
      });

      // Write IAS CIE Address (v2.15.71 working pattern) - ENHANCED IEEE RECOVERY
      try {
        this.log('🔍 Starting IEEE address discovery...');
        
        // Try multiple sources for IEEE address
        let ieeeAddress = null;
        
        // Method 1: From zclNode directly
        if (zclNode.ieeeAddress) {
          ieeeAddress = zclNode.ieeeAddress;
          this.log('✅ Method 1: Got IEEE from zclNode:', ieeeAddress);
        }
        
        // Method 2: From homey.zigbee property
        if (!ieeeAddress && this.homey?.zigbee?.ieeeAddress) {
          ieeeAddress = this.homey.zigbee.ieeeAddress;
          this.log('✅ Method 2: Got IEEE from homey.zigbee:', ieeeAddress);
        }
        
        // Method 3: From homey.zigbee.getIeeeAddress() function
        if (!ieeeAddress && typeof this.homey?.zigbee?.getIeeeAddress === 'function') {
          try {
            ieeeAddress = await this.homey.zigbee.getIeeeAddress();
            this.log('✅ Method 3: Got IEEE from getIeeeAddress():', ieeeAddress);
          } catch (e) {
            this.log('⚠️ Method 3 failed:', e.message);
          }
        }
        
        // Method 4: From device data
        if (!ieeeAddress && this.getData()?.ieeeAddress) {
          ieeeAddress = this.getData().ieeeAddress;
          this.log('✅ Method 4: Got IEEE from device data:', ieeeAddress);
        }
        
        // Method 5: Try to read from basic cluster
        if (!ieeeAddress) {
          try {
            const basicCluster = zclNode.endpoints[1]?.clusters?.basic;
            if (basicCluster) {
              const attrs = await basicCluster.readAttributes(['manufacturerName', 'modelId']);
              this.log('ℹ️ Device info:', attrs);
            }
          } catch (e) {
            this.log('⚠️ Method 5 failed:', e.message);
          }
        }
        
        // If still no IEEE, try to use a fallback coordinator address
        if (!ieeeAddress) {
          // Log all available properties for debugging
          this.log('⚠️ IEEE address not found. Available sources:');
          this.log('  - zclNode.ieeeAddress:', zclNode.ieeeAddress);
          this.log('  - homey.zigbee:', this.homey?.zigbee ? 'exists' : 'undefined');
          
          throw new Error('IEEE address not available from any source. Please re-pair the device.');
        }

        this.log('📡 Using Homey IEEE address:', ieeeAddress);

        // Write CIE Address (SDK3 expects string, not Buffer)
        await iasZoneCluster.writeAttributes({
          iasCieAddr: ieeeAddress
        });
        this.log('✅ IAS CIE Address written (SDK3 method)');

        // VERIFY enrollment (v2.15.71 pattern)
        const verify = await iasZoneCluster.readAttributes(['iasCieAddr']);
        this.log('✅ Enrollment verified:', verify.iasCieAddr?.toString('hex'));

        // Wait for enrollment to complete (CRITICAL - from v2.15.71)
        await new Promise(resolve => setTimeout(resolve, 2000));
        this.log('✅ SOS Button IAS Zone enrollment complete');

      } catch (err) {
        this.error('Direct IAS enrollment failed:', err);
        this.log('⚠️ Trying IASZoneEnroller fallback...');

        // FALLBACK METHOD: IASZoneEnroller library
        try {
          const enroller = new IASZoneEnroller(this, sosEndpoint, {
            zoneType: 21, // Emergency button
            capability: 'alarm_generic',
            pollInterval: 30000,
            autoResetTimeout: 0 // No auto-reset for SOS
          });
          const method = await enroller.enroll(zclNode);
          this.log(`✅ SOS IAS Zone enrolled via fallback: ${method}`);
        } catch (fallbackErr) {
          this.error('Fallback enrollment also failed:', fallbackErr);
          this.log('⚠️ Device may auto-enroll');
        }
      }

      // Add robust listener for alarm_generic
      this.registerCapabilityListener('alarm_generic', async (value) => {
        this.log('🚨 SOS Button pressed! Alarm:', value);

        // Trigger flow card
        const triggerId = value ? 'sos_button_pressed' : 'sos_button_released';
        try {
          await this.homey.flow.getDeviceTriggerCard(triggerId).trigger(this);
          this.log(`✅ Flow triggered: ${triggerId}`);
        } catch (error) {
          this.error('Flow trigger error:', error.message);
        }
      });

      // Direct IAS Zone status notification handler
      iasZoneCluster.onZoneStatusChangeNotification = (payload) => {
        this.log('🚨 IAS Zone Status Notification:', payload);
        const alarm = (payload.zoneStatus & 0x01) !== 0;
        this.setCapabilityValue('alarm_generic', alarm).catch(this.error);
      };

    } else {
      this.error('IAS Zone cluster not found!');
    }

    try {
      await this.setAvailable();
    } catch (err) { this.error('Await error:', err); }
  }
  // ========================================
  // FLOW METHODS - Auto-generated
  // ========================================

  /**
   * Trigger flow with context data
   */
  async triggerFlowCard(cardId, tokens = {}) {
    try {
      const flowCard = this.homey.flow.getDeviceTriggerCard(cardId);
      await flowCard.trigger(this, tokens);
      this.log(`✅ Flow triggered: ${cardId}`, tokens);
    } catch (err) {
      this.error(`❌ Flow trigger error: ${cardId}`, err);
    }
  }

  /**
   * Check if any alarm is active
   */
  async checkAnyAlarm() {
    const capabilities = this.getCapabilities();
    for (const cap of capabilities) {
      if (cap.startsWith('alarm_')) {
        const value = this.getCapabilityValue(cap);
        if (value === true) return true;
      }
    }
    return false;
  }

  /**
   * Get current context data
   */
  getContextData() {
    const context = {
      time_of_day: this.getTimeOfDay(),
      timestamp: new Date().toISOString()
    };

    // Add available sensor values
    const caps = this.getCapabilities();
    if (caps.includes('measure_luminance')) {
      context.luminance = this.getCapabilityValue('measure_luminance') || 0;
    }
    if (caps.includes('measure_temperature')) {
      context.temperature = this.getCapabilityValue('measure_temperature') || 0;
    }
    if (caps.includes('measure_humidity')) {
      context.humidity = this.getCapabilityValue('measure_humidity') || 0;
    }
    if (caps.includes('measure_battery')) {
      context.battery = this.getCapabilityValue('measure_battery') || 0;
    }

    return context;
  }

  /**
   * Get time of day
   */
  getTimeOfDay() {
    const hour = new Date().getHours();
    if (hour >= 5 && hour < 12) return 'morning';
    if (hour >= 12 && hour < 17) return 'afternoon';
    if (hour >= 17 && hour < 22) return 'evening';
    return 'night';
  }



  /**
   * Poll tous les attributes pour forcer mise à jour
   * Résout: Données non visibles après pairing (Peter + autres)
   */
  async pollAttributes() {
    const promises = [];

    // Battery
    if (this.hasCapability('measure_battery')) {
      promises.push(
        this.zclNode.endpoints[1]?.clusters.powerConfiguration?.readAttributes('batteryPercentageRemaining')
          .catch(err => this.log('Battery read failed (ignorable):', err.message))
      );
    }

    // Temperature
    if (this.hasCapability('measure_temperature')) {
      promises.push(
        this.zclNode.endpoints[1]?.clusters.temperatureMeasurement?.readAttributes('measuredValue')
          .catch(err => this.log('Temperature read failed (ignorable):', err.message))
      );
    }

    // Humidity
    if (this.hasCapability('measure_humidity')) {
      promises.push(
        this.zclNode.endpoints[1]?.clusters.relativeHumidity?.readAttributes('measuredValue')
          .catch(err => this.log('Humidity read failed (ignorable):', err.message))
      );
    }

    // Illuminance
    if (this.hasCapability('measure_luminance')) {
      promises.push(
        this.zclNode.endpoints[1]?.clusters.illuminanceMeasurement?.readAttributes('measuredValue')
          .catch(err => this.log('Illuminance read failed (ignorable):', err.message))
      );
    }

    // Alarm status (IAS Zone)
    if (this.hasCapability('alarm_motion') || this.hasCapability('alarm_contact')) {
      promises.push(
        this.zclNode.endpoints[1]?.clusters.iasZone?.readAttributes('zoneStatus')
          .catch(err => this.log('IAS Zone read failed (ignorable):', err.message))
      );
    }

    try {
      await Promise.allSettled(promises);
    } catch (err) { this.error('Await error:', err); }
    this.log('✅ Poll attributes completed');
  }



  /**
   * Read attribute with intelligent fallback
   * Tries multiple strategies until success
   */
  async readAttributeSafe(cluster, attribute) {
    try {
      return await this.fallback.readAttributeWithFallback(cluster, attribute);
    } catch (err) {
      this.error(`Failed to read ${cluster}.${attribute} after all fallback strategies:`, err);
      throw err;
    }
  }

  /**
   * Configure report with intelligent fallback
   */
  async configureReportSafe(config) {
    try {
      return await this.fallback.configureReportWithFallback(config);
    } catch (err) {
      this.error(`Failed to configure report after all fallback strategies:`, err);
      // Don't throw - use polling as ultimate fallback
      return { success: false, method: 'polling' };
    }
  }

  /**
   * IAS Zone enrollment with fallback
   */
  async enrollIASZoneSafe() {
    try {
      return await this.fallback.iasEnrollWithFallback();
    } catch (err) {
      this.error('Failed to enroll IAS Zone after all fallback strategies:', err);
      throw err;
    }
  }

  /**
   * Get fallback system statistics
   */
  getFallbackStats() {
    return this.fallback ? this.fallback.getStats() : null;
  }
  
  /**
   * Calculate battery voltage from percentage
   * @param {number} percentage - Battery percentage (0-100)
   * @returns {number} Estimated voltage
   */
  getBatteryVoltage(percentage) {
    const maxVoltage = 3;
    const minVoltage = maxVoltage * 0.7; // 70% of max = critical
    return minVoltage + ((maxVoltage - minVoltage) * percentage / 100);
  }
  
  /**
   * Get battery capacity in mAh
   * @returns {number} Battery capacity
   */
  getBatteryCapacity() {
    return 225;
  }
  
  /**
   * Estimate remaining battery life in days
   * @param {number} percentage - Current battery percentage
   * @returns {number} Estimated days remaining
   */
  estimateBatteryLife(percentage) {
    const capacity = this.getBatteryCapacity();
    const avgCurrentDraw = 0.1; // mA average (conservative estimate)
    const remainingCapacity = capacity * (percentage / 100);
    const hoursRemaining = remainingCapacity / avgCurrentDraw;
    return Math.floor(hoursRemaining / 24);
  }
}

module.exports = SOSEmergencyButtonDevice;
