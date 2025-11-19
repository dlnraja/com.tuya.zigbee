'use strict';

const ButtonDevice = require('../../lib/devices/ButtonDevice');
const IASZoneEnroller = require('../../lib/IASZoneEnroller');
const { CLUSTER } = require('zigbee-clusters');
const TuyaClusterHandler = require('../../utils/tuya-cluster-handler');
const { fromZclBatteryPercentageRemaining } = require('../../lib/tuya-engine/converters/battery');
const FallbackSystem = require('../../lib/FallbackSystem');

class SceneControllerDevice extends ButtonDevice {

  async onNodeInit({ zclNode }) {
    // Initialize hybrid base (power detection)
    await super.onNodeInit({ zclNode });


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
    // TODO: Wrap in try/catch
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
    // TODO: Wrap in try/catch
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
    // IAS Zone enrollment (motion/contact sensors)
    if (this.hasCapability('alarm_motion') || this.hasCapability('alarm_contact') ||
      this.hasCapability('alarm_water') || this.hasCapability('alarm_smoke')) {
      this.iasZoneEnroller = new IASZoneEnroller(this, zclNode);
      await this.iasZoneEnroller.enroll().catch(err => {
        this.error('IAS Zone enrollment failed:', err);
      });
    }

    // Configure battery reporting (min 1h, max 24h, delta 5%)
    try {
      await this.configureAttributeReporting([{
        endpointId: 1,
        cluster: 1,
        attributeName: 'batteryPercentageRemaining',
        minInterval: 3600,
        maxInterval: 86400,
        minChange: 10 // 5% (0-200 scale)
      }]);

      // Force initial read après pairing (résout données non visibles)
      setTimeout(() => {
        this.pollAttributes().catch(err => this.error('Initial poll failed:', err));
      }, 5000);
    } catch (err) {
      this.log('Battery report config failed (ignorable):', err.message);
    }

    // Poll attributes régulièrement pour assurer visibilité données
    this.registerPollInterval(async () => {
      try {
        // Force read de tous les attributes critiques
        await this.pollAttributes().catch(err => this.error(err));
      } catch (err) {
        this.error('Poll failed:', err);
      }
    }, 300000); // 5 minutes

    this.log('scene_controller initialized');

    // Call parent
    try {
      await super.onNodeInit({ zclNode }).catch(err => this.error(err));
      // Initialize Fallback System
      this.fallback = new FallbackSystem(this, {
        maxRetries: 3,
        baseDelay: 1000,
        verbosity: this.getSetting('debug_level') || 'INFO',
        trackPerformance: true
      });
      this.log('[OK] FallbackSystem initialized');
    } catch (err) { this.error('Await error:', err); }

    // Auto-detect device type and initialize Tuya cluster handler
    const deviceType = TuyaClusterHandler.detectDeviceType('scene_controller');
    const tuyaInitialized = await TuyaClusterHandler.init(this, zclNode, deviceType).catch(err => this.error(err));

    if (tuyaInitialized) {
      this.log('[OK] Tuya cluster handler initialized for type:', deviceType);
    } else {
      this.log('[WARN]  No Tuya cluster found, using standard Zigbee');

      // Fallback to standard cluster handling if needed
      try {
        await this.registerStandardCapabilities().catch(err => this.error(err));
      } catch (err) { this.error('Await error:', err); }
    }

    // Mark device as available
    await this.setAvailable().catch(err => this.error(err));
  }

  /**
   * Register standard Zigbee capabilities (fallback)
   */
  async registerStandardCapabilities() {
    // Battery
    if (this.hasCapability('measure_battery')) {
      try {
        this.registerCapability('measure_battery', CLUSTER.POWER_CONFIGURATION, {
          get: 'batteryPercentageRemaining',
          report: 'batteryPercentageRemaining',
          reportParser: value => {
            this.log('Battery raw value:', value);
            // Smart calculation: check if value is already 0-100 or 0-200
            if (value <= 100) {
              return Math.max(0, Math.min(100, value));
            } else {
              return fromZclBatteryPercentageRemaining(value);
            }
          },
          getParser: value => fromZclBatteryPercentageRemaining(value)
        });
      } catch (err) {
        this.log('Could not register battery capability:', err.message);
      }
    }
  }

  async onDeleted() {
    this.log('scene_controller deleted');
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
      await flowCard.trigger(this, tokens).catch(err => this.error(err));
      this.log(`[OK] Flow triggered: ${cardId}`, tokens);
    } catch (err) {
      this.error(`[ERROR] Flow trigger error: ${cardId}`, err);
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
}
  }
  async pollAttributes() {
  const promises = [];

  // Battery
  if (this.hasCapability('measure_battery')) {
    promises.push(
      // TODO: Wrap in try/catch
      this.zclNode.endpoints[1]?.clusters.powerConfiguration?.readAttributes(['batteryPercentageRemaining'])
        .catch(err => this.log('Battery read failed (ignorable):', err.message))
    );
  }

  // Temperature
  if (this.hasCapability('measure_temperature')) {
    promises.push(
      // TODO: Wrap in try/catch
      this.zclNode.endpoints[1]?.clusters.temperatureMeasurement?.readAttributes(['measuredValue'])
        .catch(err => this.log('Temperature read failed (ignorable):', err.message))
    );
  }

  // Humidity
  if (this.hasCapability('measure_humidity')) {
    promises.push(
      // TODO: Wrap in try/catch
      this.zclNode.endpoints[1]?.clusters.relativeHumidity?.readAttributes(['measuredValue'])
        .catch(err => this.log('Humidity read failed (ignorable):', err.message))
    );
  }

  // Illuminance
  if (this.hasCapability('measure_luminance')) {
    promises.push(
      // TODO: Wrap in try/catch
      this.zclNode.endpoints[1]?.clusters.illuminanceMeasurement?.readAttributes(['measuredValue'])
        .catch(err => this.log('Illuminance read failed (ignorable):', err.message))
    );
  }

  // Alarm status (IAS Zone)
  if (this.hasCapability('alarm_motion') || this.hasCapability('alarm_contact')) {
    promises.push(
      // TODO: Wrap in try/catch
      this.zclNode.endpoints[1]?.clusters.iasZone?.readAttributes(['zoneStatus'])
        .catch(err => this.log('IAS Zone read failed (ignorable):', err.message))
    );
  }

  try {
    await Promise.allSettled(promises).catch(err => this.error(err));
  } catch (err) { this.error('Await error:', err); }
  this.log('[OK] Poll attributes completed');
}



  /**
   * Read attribute with intelligent fallback
   * Tries multiple strategies until success
   */
  }
  async readAttributeSafe(cluster, attribute) {
  try {
    return await this.fallback.readAttributeWithFallback(cluster, attribute).catch(err => this.error(err));
  } catch (err) {
    this.error(`Failed to read ${cluster}.${attribute} after all fallback strategies:`, err);
    throw err;
  }
}

  /**
   * Configure report with intelligent fallback
   */
  }
  async configureReportSafe(config) {
  try {
    return await this.fallback.configureReportWithFallback(config).catch(err => this.error(err));
  } catch (err) {
    this.error(`Failed to configure report after all fallback strategies:`, err);
    // Don't throw - use polling as ultimate fallback
    return { success: false, method: 'polling' };
  }
}

  /**
   * IAS Zone enrollment with fallback
   */
  }
  async enrollIASZoneSafe() {
  try {
    return await this.fallback.iasEnrollWithFallback().catch(err => this.error(err));
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
}

module.exports = SceneControllerDevice;
