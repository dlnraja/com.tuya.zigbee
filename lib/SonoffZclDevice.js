// File: lib/SonoffZclDevice.js
'use strict';

/**
 * SONOFF ZCL DEVICE BASE CLASS
 *
 * Base class for all SONOFF/eWeLink Zigbee devices using standard ZCL clusters.
 * NOT for Tuya TS0601/EF00 protocol devices.
 *
 * Supported clusters:
 * - 0x0001 (genPowerCfg) - Battery
 * - 0x0006 (genOnOff) - On/Off
 * - 0x0400 (msIlluminanceMeasurement) - Illuminance
 * - 0x0402 (msTemperatureMeasurement) - Temperature
 * - 0x0405 (msRelativeHumidity) - Humidity
 * - 0x0500 (ssIasZone) - IAS Zone (motion, contact, water, smoke)
 * - 0x0702 (seMetering) - Energy Metering
 * - 0x0B04 (haElectricalMeasurement) - Electrical Measurement
 *
 * @author Dylan Rajasekaram
 * @version 5.3.37
 */

const { ZigBeeDevice } = require('homey-zigbeedriver');
const { CLUSTER } = require('zigbee-clusters');

// ZCL Cluster IDs
const CLUSTERS = {
  BASIC: 0,
  POWER_CONFIGURATION: 1,
  ON_OFF: 6,
  LEVEL_CONTROL: 8,
  ILLUMINANCE_MEASUREMENT: 1024,  // 0x0400
  TEMPERATURE_MEASUREMENT: 1026,  // 0x0402
  PRESSURE_MEASUREMENT: 1027,     // 0x0403
  RELATIVE_HUMIDITY: 1029,        // 0x0405
  IAS_ZONE: 1280,                 // 0x0500
  METERING: 1794,                 // 0x0702
  ELECTRICAL_MEASUREMENT: 2820    // 0x0B04
};

// IAS Zone Types
const IAS_ZONE_TYPES = {
  STANDARD_CIE: 0x0000,
  MOTION_SENSOR: 0x000D,
  CONTACT_SWITCH: 0x0015,
  FIRE_SENSOR: 0x0028,
  WATER_SENSOR: 0x002A,
  CO_SENSOR: 0x002B,
  VIBRATION_SENSOR: 0x002D,
  REMOTE_CONTROL: 0x010F,
  KEY_FOB: 0x0115,
  KEYPAD: 0x021D,
  STANDARD_WARNING: 0x0225,
  GLASS_BREAK: 0x0226,
  SECURITY_REPEATER: 0x0229
};

// IAS Zone Status Bits
const IAS_ZONE_STATUS = {
  ALARM1: 0x0001,        // bit 0 - Zone alarm 1
  ALARM2: 0x0002,        // bit 1 - Zone alarm 2
  TAMPER: 0x0004,        // bit 2 - Tamper
  BATTERY_LOW: 0x0008,   // bit 3 - Battery low
  SUPERVISION: 0x0010,   // bit 4 - Supervision notify
  RESTORE: 0x0020,       // bit 5 - Restore notify
  TROUBLE: 0x0040,       // bit 6 - Trouble
  AC_MAINS: 0x0080,      // bit 7 - AC mains fault
  TEST: 0x0100,          // bit 8 - Test mode
  BATTERY_DEFECT: 0x0200 // bit 9 - Battery defect
};

/**
 * SonoffZclDevice - Base class for SONOFF/eWeLink Zigbee devices
 * @extends ZigBeeDevice
 */
class SonoffZclDevice extends ZigBeeDevice {

  /**
   * Initialize SONOFF device
   * Call this in onNodeInit() after super.onNodeInit()
   */
  async onSonoffInit() {
    this.log('[SONOFF] Initializing SONOFF ZCL device...');

    // Store device info
    this._sonoffManufacturer = this.getSetting('zb_manufacturer_name') || 'Unknown';
    this._sonoffModel = this.getSetting('zb_product_id') || 'Unknown';

    this.log(`[SONOFF] Manufacturer: ${this._sonoffManufacturer}, Model: ${this._sonoffModel}`);

    // Initialize capabilities based on what's available
    await this._initBatteryCapability();
    await this._initOnOffCapability();
    await this._initTemperatureCapability();
    await this._initHumidityCapability();
    await this._initIlluminanceCapability();
    await this._initIasZoneCapability();
    await this._initEnergyCapabilities();

    // Register standard report listeners
    await this.registerStandardReportListeners();

    this.log('[SONOFF] Initialization complete');
  }

  // ===========================================================================
  // BATTERY CAPABILITY (Cluster 0x0001)
  // ===========================================================================

  /**
   * Initialize battery capability
   * @private
   */
  async _initBatteryCapability() {
    if (!this.hasCapability('measure_battery')) return;

    this.log('[SONOFF] Configuring battery capability...');

    try {
      // Register capability for genPowerCfg cluster
      this.registerCapability('measure_battery', CLUSTER.POWER_CONFIGURATION, {
        get: 'batteryPercentageRemaining',
        getOpts: {
          getOnStart: true,
          pollInterval: 3600000 // 1 hour
        },
        report: 'batteryPercentageRemaining',
        reportParser: value => {
          // ZCL battery percentage is 0-200 (0.5% steps)
          const percentage = Math.round(value / 2);
          this.log(`[SONOFF] Battery: ${percentage}%`);
          return Math.min(100, Math.max(0, percentage));
        }
      });

      // Set initial value if not set
      const currentBattery = this.getCapabilityValue('measure_battery');
      if (currentBattery === null) {
        await this.setCapabilityValue('measure_battery', 100).catch(this.error);
      }

    } catch (err) {
      this.error('[SONOFF] Battery capability error:', err.message);
    }
  }

  /**
   * Handle battery report
   * @param {number} value - Battery percentage (0-200)
   */
  onBatteryReport(value) {
    const percentage = Math.round(value / 2);
    this.log(`[SONOFF] Battery report: ${percentage}%`);

    this.setCapabilityValue('measure_battery', parseFloat(Math.min(100, Math.max(0, percentage))))
      .catch(this.error);

    // Update alarm_battery if available
    if (this.hasCapability('alarm_battery')) {
      this.setCapabilityValue('alarm_battery', percentage < 15).catch(this.error);
    }

    // Emit event for flows
    this.emit('sonoff_battery', percentage);
  }

  // ===========================================================================
  // ON/OFF CAPABILITY (Cluster 0x0006)
  // ===========================================================================

  /**
   * Initialize on/off capability
   * @private
   */
  async _initOnOffCapability() {
    if (!this.hasCapability('onoff')) return;

    this.log('[SONOFF] Configuring on/off capability...');

    try {
      this.registerCapability('onoff', CLUSTER.ON_OFF, {
        get: 'onOff',
        getOpts: {
          getOnStart: true,
          pollInterval: 60000 // 1 minute
        },
        set: async value => (value ? 'setOn' : 'setOff'),
        setParser: () => ({}),
        report: 'onOff',
        reportParser: value => {
          this.log(`[SONOFF] OnOff: ${value}`);
          return value === 1 || value === true;
        }
      });

    } catch (err) {
      this.error('[SONOFF] OnOff capability error:', err.message);
    }
  }

  /**
   * Handle on/off report
   * @param {boolean|number} value - On/Off state
   */
  onOnOffReport(value) {
    const state = value === 1 || value === true;
    this.log(`[SONOFF] OnOff report: ${state}`);
    this.setCapabilityValue('onoff', state).catch(this.error);
  }

  // ===========================================================================
  // TEMPERATURE CAPABILITY (Cluster 0x0402)
  // ===========================================================================

  /**
   * Initialize temperature capability
   * @private
   */
  async _initTemperatureCapability() {
    if (!this.hasCapability('measure_temperature')) return;

    this.log('[SONOFF] Configuring temperature capability...');

    try {
      this.registerCapability('measure_temperature', CLUSTER.TEMPERATURE_MEASUREMENT, {
        get: 'measuredValue',
        getOpts: {
          getOnStart: true,
          pollInterval: 300000 // 5 minutes
        },
        report: 'measuredValue',
        reportParser: value => {
          // ZCL temperature is in 0.01°C units
          const temp = value / 100;
          this.log(`[SONOFF] Temperature: ${temp}°C`);
          return Math.round(temp * 10) / 10;
        }
      });

    } catch (err) {
      this.error('[SONOFF] Temperature capability error:', err.message);
    }
  }

  /**
   * Handle temperature report
   * @param {number} value - Temperature in 0.01°C units
   */
  onTemperatureReport(value) {
    const temp = Math.round((value / 100) * 10) / 10;
    this.log(`[SONOFF] Temperature report: ${temp}°C`);
    this.setCapabilityValue('measure_temperature', parseFloat(temp)).catch(this.error);
  }

  // ===========================================================================
  // HUMIDITY CAPABILITY (Cluster 0x0405)
  // ===========================================================================

  /**
   * Initialize humidity capability
   * @private
   */
  async _initHumidityCapability() {
    if (!this.hasCapability('measure_humidity')) return;

    this.log('[SONOFF] Configuring humidity capability...');

    try {
      this.registerCapability('measure_humidity', CLUSTER.RELATIVE_HUMIDITY_MEASUREMENT || 1029, {
        get: 'measuredValue',
        getOpts: {
          getOnStart: true,
          pollInterval: 300000 // 5 minutes
        },
        report: 'measuredValue',
        reportParser: value => {
          // ZCL humidity is in 0.01% units
          const humidity = value / 100;
          this.log(`[SONOFF] Humidity: ${humidity}%`);
          return Math.round(humidity);
        }
      });

    } catch (err) {
      this.error('[SONOFF] Humidity capability error:', err.message);
    }
  }

  /**
   * Handle humidity report
   * @param {number} value - Humidity in 0.01% units
   */
  onHumidityReport(value) {
    const humidity = Math.round(value / 100);
    this.log(`[SONOFF] Humidity report: ${humidity}%`);
    this.setCapabilityValue('measure_humidity', parseFloat(humidity)).catch(this.error);
  }

  // ===========================================================================
  // ILLUMINANCE CAPABILITY (Cluster 0x0400)
  // ===========================================================================

  /**
   * Initialize illuminance capability
   * @private
   */
  async _initIlluminanceCapability() {
    if (!this.hasCapability('measure_luminance')) return;

    this.log('[SONOFF] Configuring illuminance capability...');

    try {
      this.registerCapability('measure_luminance', CLUSTER.ILLUMINANCE_MEASUREMENT, {
        get: 'measuredValue',
        getOpts: {
          getOnStart: true,
          pollInterval: 300000 // 5 minutes
        },
        report: 'measuredValue',
        reportParser: value => {
          // ZCL illuminance: lux = 10^((value-1)/10000)
          if (value === 0 || value === 0xFFFF) return 0;
          const lux = Math.round(Math.pow(10, (value - 1) / 10000));
          this.log(`[SONOFF] Illuminance: ${lux} lux`);
          return lux;
        }
      });

    } catch (err) {
      this.error('[SONOFF] Illuminance capability error:', err.message);
    }
  }

  /**
   * Handle illuminance report
   * @param {number} value - Raw illuminance value
   */
  onIlluminanceReport(value) {
    if (value === 0 || value === 0xFFFF) {
      this.setCapabilityValue('measure_luminance', 0).catch(this.error);
      return;
    }
    const lux = Math.round(Math.pow(10, (value - 1) / 10000));
    this.log(`[SONOFF] Illuminance report: ${lux} lux`);
    this.setCapabilityValue('measure_luminance', parseFloat(lux)).catch(this.error);
  }

  // ===========================================================================
  // IAS ZONE CAPABILITY (Cluster 0x0500)
  // ===========================================================================

  /**
   * Initialize IAS Zone capability
   * @private
   */
  async _initIasZoneCapability() {
    const hasIas = this.hasCapability('alarm_motion') ||
      this.hasCapability('alarm_contact') ||
      this.hasCapability('alarm_water') ||
      this.hasCapability('alarm_smoke') ||
      this.hasCapability('alarm_tamper');

    if (!hasIas) return;

    this.log('[SONOFF] Configuring IAS Zone capability...');

    try {
      // Get IAS Zone cluster
      const iasZoneCluster = this.zclNode.endpoints[1]?.clusters?.iasZone;

      if (iasZoneCluster) {
        // Enroll in IAS Zone
        await this._enrollIasZone(iasZoneCluster);

        // Listen for zone status changes
        iasZoneCluster.on('attr.zoneStatus', this.onIasZoneReport.bind(this));
        iasZoneCluster.on('zoneStatusChangeNotification', payload => {
          this.onIasZoneReport(payload.zoneStatus);
        });
      }

      // Set initial values
      if (this.hasCapability('alarm_motion')) {
        const current = this.getCapabilityValue('alarm_motion');
        if (current === null) {
          await this.setCapabilityValue('alarm_motion', false).catch(this.error);
        }
      }
      if (this.hasCapability('alarm_contact')) {
        const current = this.getCapabilityValue('alarm_contact');
        if (current === null) {
          await this.setCapabilityValue('alarm_contact', false).catch(this.error);
        }
      }

    } catch (err) {
      this.error('[SONOFF] IAS Zone capability error:', err.message);
    }
  }

  /**
   * Enroll device in IAS Zone
   * @param {Object} iasZoneCluster - IAS Zone cluster instance
   * @private
   */
  async _enrollIasZone(iasZoneCluster) {
    try {
      // Read zone state
      const zoneState = await iasZoneCluster.readAttributes(['zoneState', 'zoneType', 'zoneStatus']);
      this.log('[SONOFF] IAS Zone state:', JSON.stringify(zoneState));

      // Auto-enroll if not enrolled
      if (zoneState.zoneState === 0) {
        this.log('[SONOFF] Attempting IAS Zone enrollment...');
        try {
          await iasZoneCluster.zoneEnrollResponse({
            enrollResponseCode: 0, // Success
            zoneId: 1
          });
          this.log('[SONOFF] IAS Zone enrolled');
        } catch (e) {
          this.log('[SONOFF] Zone enrollment response failed (may be already enrolled)');
        }
      }
    } catch (err) {
      this.error('[SONOFF] IAS Zone enrollment error:', err.message);
    }
  }

  /**
   * Handle IAS Zone status report
   * @param {number} status - Zone status bitmap
   */
  onIasZoneReport(status) {
    this.log(`[SONOFF] IAS Zone status: 0x${status.toString(16)}`);

    const parsed = this.parseIasZoneStatus(status);

    // Update alarm capabilities
    if (this.hasCapability('alarm_motion')) {
      this.setCapabilityValue('alarm_motion', parsed.alarm1).catch(this.error);
    }
    if (this.hasCapability('alarm_contact')) {
      this.setCapabilityValue('alarm_contact', parsed.alarm1).catch(this.error);
    }
    if (this.hasCapability('alarm_water')) {
      this.setCapabilityValue('alarm_water', parsed.alarm1).catch(this.error);
    }
    if (this.hasCapability('alarm_smoke')) {
      this.setCapabilityValue('alarm_smoke', parsed.alarm1).catch(this.error);
    }
    if (this.hasCapability('alarm_tamper')) {
      this.setCapabilityValue('alarm_tamper', parsed.tamper).catch(this.error);
    }
    if (this.hasCapability('alarm_battery')) {
      this.setCapabilityValue('alarm_battery', parsed.batteryLow).catch(this.error);
    }

    // Emit events for flows
    this.emit('sonoff_ias_zone', parsed);
  }

  /**
   * Parse IAS Zone status bitmap
   * @param {number} status - Zone status bitmap
   * @returns {Object} Parsed status object
   */
  parseIasZoneStatus(status) {
    return {
      alarm1: (status & IAS_ZONE_STATUS.ALARM1) > 0,
      alarm2: (status & IAS_ZONE_STATUS.ALARM2) > 0,
      tamper: (status & IAS_ZONE_STATUS.TAMPER) > 0,
      batteryLow: (status & IAS_ZONE_STATUS.BATTERY_LOW) > 0,
      supervisionNotify: (status & IAS_ZONE_STATUS.SUPERVISION) > 0,
      restoreNotify: (status & IAS_ZONE_STATUS.RESTORE) > 0,
      trouble: (status & IAS_ZONE_STATUS.TROUBLE) > 0,
      acMainsFault: (status & IAS_ZONE_STATUS.AC_MAINS) > 0,
      testMode: (status & IAS_ZONE_STATUS.TEST) > 0,
      batteryDefect: (status & IAS_ZONE_STATUS.BATTERY_DEFECT) > 0
    };
  }

  // ===========================================================================
  // ENERGY CAPABILITIES (Clusters 0x0702 & 0x0B04)
  // ===========================================================================

  /**
   * Initialize energy measurement capabilities
   * @private
   */
  async _initEnergyCapabilities() {
    // Power measurement
    if (this.hasCapability('measure_power')) {
      this.log('[SONOFF] Configuring power measurement...');
      try {
        this.registerCapability('measure_power', CLUSTER.ELECTRICAL_MEASUREMENT, {
          get: 'activePower',
          getOpts: {
            getOnStart: true,
            pollInterval: 60000
          },
          report: 'activePower',
          reportParser: value => {
            // Typically in 0.1W units
            const power = value / 10;
            this.log(`[SONOFF] Power: ${power}W`);
            return Math.round(power * 10) / 10;
          }
        });
      } catch (err) {
        this.error('[SONOFF] Power capability error:', err.message);
      }
    }

    // Energy metering
    if (this.hasCapability('meter_power')) {
      this.log('[SONOFF] Configuring energy metering...');
      try {
        this.registerCapability('meter_power', CLUSTER.METERING, {
          get: 'currentSummationDelivered',
          getOpts: {
            getOnStart: true,
            pollInterval: 300000
          },
          report: 'currentSummationDelivered',
          reportParser: value => {
            // Convert to kWh (multiplier may vary)
            const energy = value / 1000;
            this.log(`[SONOFF] Energy: ${energy}kWh`);
            return Math.round(energy * 100) / 100;
          }
        });
      } catch (err) {
        this.error('[SONOFF] Energy capability error:', err.message);
      }
    }

    // Voltage measurement
    if (this.hasCapability('measure_voltage')) {
      this.log('[SONOFF] Configuring voltage measurement...');
      try {
        this.registerCapability('measure_voltage', CLUSTER.ELECTRICAL_MEASUREMENT, {
          get: 'rmsVoltage',
          getOpts: {
            getOnStart: true,
            pollInterval: 60000
          },
          report: 'rmsVoltage',
          reportParser: value => {
            // Typically in 0.1V units
            const voltage = value / 10;
            this.log(`[SONOFF] Voltage: ${voltage}V`);
            return Math.round(voltage);
          }
        });
      } catch (err) {
        this.error('[SONOFF] Voltage capability error:', err.message);
      }
    }

    // Current measurement
    if (this.hasCapability('measure_current')) {
      this.log('[SONOFF] Configuring current measurement...');
      try {
        this.registerCapability('measure_current', CLUSTER.ELECTRICAL_MEASUREMENT, {
          get: 'rmsCurrent',
          getOpts: {
            getOnStart: true,
            pollInterval: 60000
          },
          report: 'rmsCurrent',
          reportParser: value => {
            // Typically in mA units
            const current = value / 1000;
            this.log(`[SONOFF] Current: ${current}A`);
            return Math.round(current * 1000) / 1000;
          }
        });
      } catch (err) {
        this.error('[SONOFF] Current capability error:', err.message);
      }
    }
  }

  // ===========================================================================
  // STANDARD REPORT LISTENERS
  // ===========================================================================

  /**
   * Register standard attribute report listeners
   */
  async registerStandardReportListeners() {
    this.log('[SONOFF] Registering standard report listeners...');

    try {
      const endpoint = this.zclNode.endpoints[1];
      if (!endpoint) {
        this.log('[SONOFF] No endpoint 1 found');
        return;
      }

      // Battery cluster
      if (endpoint.clusters?.powerConfiguration) {
        endpoint.clusters.powerConfiguration.on('attr.batteryPercentageRemaining',
          this.onBatteryReport.bind(this));
        this.log('[SONOFF] Registered battery report listener');
      }

      // OnOff cluster
      if (endpoint.clusters?.onOff) {
        endpoint.clusters.onOff.on('attr.onOff', this.onOnOffReport.bind(this));
        this.log('[SONOFF] Registered onOff report listener');
      }

      // Temperature cluster
      if (endpoint.clusters?.temperatureMeasurement) {
        endpoint.clusters.temperatureMeasurement.on('attr.measuredValue',
          this.onTemperatureReport.bind(this));
        this.log('[SONOFF] Registered temperature report listener');
      }

      // Humidity cluster
      if (endpoint.clusters?.relativeHumidityMeasurement) {
        endpoint.clusters.relativeHumidityMeasurement.on('attr.measuredValue',
          this.onHumidityReport.bind(this));
        this.log('[SONOFF] Registered humidity report listener');
      }

      // Illuminance cluster
      if (endpoint.clusters?.illuminanceMeasurement) {
        endpoint.clusters.illuminanceMeasurement.on('attr.measuredValue',
          this.onIlluminanceReport.bind(this));
        this.log('[SONOFF] Registered illuminance report listener');
      }

    } catch (err) {
      this.error('[SONOFF] Error registering report listeners:', err.message);
    }
  }

  // ===========================================================================
  // BUTTON SUPPORT (for SNZB-01)
  // ===========================================================================

  /**
   * Initialize button support
   * Call this for button devices (SNZB-01, etc.)
   */
  async initButtonSupport() {
    this.log('[SONOFF] Initializing button support...');

    try {
      const endpoint = this.zclNode.endpoints[1];

      // Listen for OnOff commands (used as button press)
      if (endpoint?.clusters?.onOff) {
        endpoint.clusters.onOff.on('toggle', () => this.onButtonPress('toggle'));
        endpoint.clusters.onOff.on('on', () => this.onButtonPress('on'));
        endpoint.clusters.onOff.on('off', () => this.onButtonPress('off'));
      }

      // Listen for multiState cluster (multi-press)
      if (endpoint?.clusters?.genMultistateInput) {
        endpoint.clusters.genMultistateInput.on('attr.presentValue', value => {
          this.onButtonPress(value);
        });
      }

      // Listen for scenes cluster
      if (endpoint?.clusters?.genScenes) {
        endpoint.clusters.genScenes.on('recall', payload => {
          this.onButtonPress(`scene_${payload.sceneid}`);
        });
      }

    } catch (err) {
      this.error('[SONOFF] Button support error:', err.message);
    }
  }

  /**
   * Handle button press
   * @param {string|number} action - Button action
   */
  onButtonPress(action) {
    this.log(`[SONOFF] Button press: ${action}`);

    // Determine press type
    let pressType = 'single';
    if (action === 2 || action === 'double') {
      pressType = 'double';
    } else if (action === 3 || action === 'hold' || action === 'long') {
      pressType = 'long';
    }

    // Trigger flow card
    this.emit('sonoff_button_pressed', pressType);

    // Trigger Homey flow
    const triggerCard = this.homey.flow.getDeviceTriggerCard('sonoff_button_pressed');
    if (triggerCard) {
      triggerCard.trigger(this, { press_type: pressType }, {})
        .catch(err => this.error('[SONOFF] Flow trigger error:', err));
    }
  }

  // ===========================================================================
  // UTILITY METHODS
  // ===========================================================================

  /**
   * Get device manufacturer
   * @returns {string}
   */
  getManufacturer() {
    return this._sonoffManufacturer;
  }

  /**
   * Get device model
   * @returns {string}
   */
  getModel() {
    return this._sonoffModel;
  }

  /**
   * Check if device is SONOFF brand
   * @returns {boolean}
   */
  isSonoff() {
    const mfr = (this._sonoffManufacturer || '').toLowerCase();
    return mfr.includes('sonoff') || mfr.includes('ewelink');
  }
}

module.exports = SonoffZclDevice;
