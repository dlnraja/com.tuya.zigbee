'use strict';
const { safeDivide, safeMultiply, safeParse } = require('../../lib/utils/tuyaUtils.js');


const UnifiedThermostatBase = require('../../lib/devices/UnifiedThermostatBase');

/**
 * Smart Heater Controller - Zigbee Equivalent of WiFi Heater Modules
 *
 * Controls electric heaters, radiators, and heating elements.
 * Provides thermostat functionality, power monitoring, and safety features.
 *
 * v5.5.353: New driver for Zigbee heating control
 *
 * Key features:
 * - Temperature control with thermostat modes
 * - Power monitoring and limiting
 * - Overheat protection
 * - Child lock functionality
 * - Energy usage tracking
 *
 * Tuya DPs:
 * - DP 1: Power (on / off)
 * - DP 2: Target temperature (Â°C)
 * - DP 3: Current temperature (Â°C)
 * - DP 4: Thermostat mode (manual/auto/schedule)
 * - DP 6: Power consumption (W)
 * - DP 7: Energy consumed (kWh)
 * - DP 101: Child lock
 * - DP 102: Overheat protection
 * - DP 103: Temperature calibration
 */
class SmartHeaterControllerDevice extends UnifiedThermostatBase {

  async onNodeInit({ zclNode }) {
    // --- Homey Time Sync for TRV/LCD/Thermostat devices ---
    // Syncs the device clock with the Homey box time every 6 hours.
    // Uses ZCL Time Cluster (0x000A) or Tuya EF00 DP 0x24 as fallback.
    try {
      const ZigbeeTimeSync = require('../../lib/ZigbeeTimeSync');
      this._timeSync = new ZigbeeTimeSync(this, { throttleMs:6 * 60 * 60 * 1000 });
      
      // Initial sync after 10 seconds (let device settle)
      this.homey.setTimeout(async () => {
        try {
          const result = await this._timeSync.sync({ force: true });
          if (result.success) {
            this.log('[TimeSync] Initial time sync successful');
          } else if (result.reason === 'no_rtc') {
            // Try Tuya EF00 DP 0x24 fallback for non-ZCL devices
            await this._tuyaTimeSyncFallback();
          }
        } catch (e) {
          this.log('[TimeSync] Initial sync failed (non-critical):', e.message);
        }
      }, 10000);
      
      // Periodic sync every 6 hours
      this._timeSyncInterval = this.homey.setInterval(async () => {
        try {
          const result = await this._timeSync.sync();
          if (!result.success && result.reason === 'no_rtc') {
            await this._tuyaTimeSyncFallback();
          }
        } catch (e) {
          this.log('[TimeSync] Periodic sync failed:', e.message);
        }
      },6 * 60 * 60 * 1000);
    } catch (e) {
      this.log('[TimeSync] Time sync init failed (non-critical):', e.message);
    }

    // --- Attribute Reporting Configuration (auto-generated) ---
    try {
      await this.configureAttributeReporting([
        {
          cluster: 'msTemperatureMeasurement',
          attributeName: 'measuredValue',
          minInterval: 30,
          maxInterval: 600,
          minChange: 50,
        },
        {
          cluster: 'haElectricalMeasurement',
          attributeName: 'activePower',
          minInterval: 10,
          maxInterval: 300,
          minChange: 5,
        }
      ]);
      this.log('Attribute reporting configured successfully');
    } catch (err) {
      this.log('Attribute reporting config failed (device may not support it):', err.message);
    }

    this.log('[HEATER]  Initializing smart heater controller...');

    // Initialize settings with defaults
    this._temperatureCalibration = this.getSetting('temperature_calibration') || 0;
    this._heatingHysteresis = this.getSetting('heating_hysteresis') || 1.0;
    this._overheatProtection = this.getSetting('overheat_protection') || 40;
    this._powerLimit = this.getSetting('power_limit') || 2000;
    this._childLock = this.getSetting('child_lock') || false;

    this.log(`[HEATER]  Configuration: Calibration=${this._temperatureCalibration}Â°C, Hysteresis=${this._heatingHysteresis}Â°C, Overheat=${this._overheatProtection}Â°C`);

    // Call parent initialization
    await super.onNodeInit({ zclNode });

    // Register setting listeners
    this.registerSettings();

    // Setup thermostat mode mapping
    this.setupThermostatModes();

    this.log('[HEATER]  Smart heater controller initialized successfully');
  }

  /**
   * Setup thermostat mode mappings
   */
  setupThermostatModes() {
    this._thermostatModes = {
      'off': 0,
      'manual': 1,
      'auto': 2,
      'schedule': 3,
      'eco': 4
    };

    this._thermostatModeNames = {
      0: 'off',
      1: 'manual',
      2: 'auto',
      3: 'schedule',
      4: 'eco'
    };
  }

  /**
   * Register setting change listeners
   */
  registerSettings() {
    this.registerSetting('temperature_calibration', (newValue) => {
      this._temperatureCalibration = newValue;
      this.log(`[HEATER]  Temperature calibration updated: ${newValue}Â°C`);
      // Send calibration to device
      this._sendCalibration(newValue);
      });

    this.registerSetting('heating_hysteresis', (newValue) => {
      this._heatingHysteresis = newValue;
      this.log(`[HEATER]  Heating hysteresis updated: ${newValue}Â°C`);
      });

    this.registerSetting('overheat_protection', (newValue) => {
      this._overheatProtection = newValue;
      this.log(`[HEATER]  Overheat protection updated: ${newValue}Â°C`);
      this._sendOverheatProtection(newValue);
      });

    this.registerSetting('power_limit', (newValue) => {
      this._powerLimit = newValue;
      this.log(`[HEATER]  Power limit updated: ${newValue}W`);
      });

    this.registerSetting('child_lock', (newValue) => {
      this._childLock = newValue;
      this.log(`[HEATER]  Child lock ${newValue ? 'ENABLED' : 'DISABLED'}`);
      this._sendChildLock(newValue);
      });
  }

  /**
   * Handle Tuya datapoints specific to heater control
   */
  async _handleDP(dp, value) {
    this.log(`[HEATER]  Received DP ${dp}: ${value}`);

    switch (dp) {
    case 1: //Power on/off
      await this._handlePowerState(value);
      break;

    case 2: // Target temperature
      await this._handleTargetTemperature(value);
      break;

    case 3: // Current temperature
      await this._handleCurrentTemperature(value);
      break;

    case 4: // Thermostat mode
      await this._handleThermostatMode(value);
      break;

    case 6: // Power consumption (W)
      await this._handlePowerConsumption(value);
      break;

    case 7: // Energy consumed (kWh)
      await this._handleEnergyConsumption(value);
      break;

    case 101: // Child lock status
      await this._handleChildLockStatus(value);
      break;

    case 102: // Overheat protection triggered
      await this._handleOverheatProtection(value);
      break;

    case 103: // Temperature calibration response
      this.log(`[HEATER]  Temperature calibration confirmed: ${value}Â°C`);
      break;

    default:
      // Pass to parent for standard DP handling
      await super._handleDP(dp, value);
      break;
    }
  }

  /**
   * Handle power state changes
   */
  async _handlePowerState(powerOn) {
    const isOn = Boolean(powerOn);
    await this.setCapabilityValue('onoff', isOn);
    this.log(`[HEATER]  Power: ${isOn ? 'ON' : 'OFF'}`);

    // Update thermostat mode if turned off
    if (!isOn) {
      await this.setCapabilityValue('thermostat_mode', 'off');
    }
  }

  /**
   * Handle target temperature changes
   */
  async _handleTargetTemperature(temperature) {
    if (typeof temperature === 'number' && temperature >= 5 && temperature <= 35) {
      // Apply calibration
      const calibratedTemp = temperature + this._temperatureCalibration;
      await this.setCapabilityValue('target_temperature', parseFloat(calibratedTemp));
      this.log(`[HEATER]  Target temperature: ${temperature}Â°C (calibrated: ${calibratedTemp}Â°C)`);
    } else {
      this.log(`[HEATER]  Invalid target temperature: ${temperature}`);
    }
  }

  /**
   * Handle current temperature readings
   */
  async _handleCurrentTemperature(temperature) {
    if (typeof temperature === 'number' && temperature >= -40 && temperature <= 80) {
      // Apply calibration
      const calibratedTemp = temperature + this._temperatureCalibration;
      await this.setCapabilityValue('measure_temperature', parseFloat(calibratedTemp));
      this.log(`[HEATER]  Current temperature: ${temperature}Â°C (calibrated: ${calibratedTemp}Â°C)`);

      // Check overheat protection
      if (temperature >= this._overheatProtection) {
        this.log(`[HEATER]  OVERHEAT DETECTED: ${temperature}Â°C >= ${this._overheatProtection}Â°C`);
        await this.setCapabilityValue('alarm_generic', true);
        // Trigger emergency shutdown
        await this._emergencyShutdown();
      } else {
        await this.setCapabilityValue('alarm_generic', false);
      }
    } else {
      this.log(`[HEATER]  Invalid temperature reading: ${temperature}`);
    }
  }

  /**
   * Handle thermostat mode changes
   */
  async _handleThermostatMode(modeValue) {
    const modeName = this._thermostatModeNames[modeValue] || 'manual';
    await this.setCapabilityValue('thermostat_mode', modeName);
    this.log(`[HEATER]  Thermostat mode: ${modeName} (${modeValue})`);
  }

  /**
   * Handle power consumption monitoring
   */
  async _handlePowerConsumption(power) {
    if (typeof power === 'number' && power >= 0 && power <= 5000) {
      await this.setCapabilityValue('measure_power', parseFloat(power));
      this.log(`[HEATER]  Power consumption: ${power}W`);

      // Check power limit
      if (power > this._powerLimit) {
        this.log(`[HEATER]  POWER LIMIT EXCEEDED: ${power}W > ${this._powerLimit}W`);
        await this.setCapabilityValue('alarm_generic', true);
      }
    } else {
      this.log(`[HEATER]  Invalid power reading: ${power}`);
    }
  }

  /**
   * Handle energy consumption tracking
   */
  async _handleEnergyConsumption(energy) {
    if (typeof energy === 'number' && energy >= 0) {
      // Convert to kWh if needed
      const energyKwh = energy > 1000 ? energy * 1000 : energy;
      await this.setCapabilityValue('meter_power', parseFloat(energyKwh));
      this.log(`[HEATER]  Energy consumed: ${energyKwh} kWh`);
    }
  }

  /**
   * Handle child lock status
   */
  async _handleChildLockStatus(locked) {
    const isLocked = Boolean(locked);
    this._childLock = isLocked;
    this.log(`[HEATER]  Child lock: ${isLocked ? 'LOCKED' : 'UNLOCKED'}`);
  }

  /**
   * Handle overheat protection events
   */
  async _handleOverheatProtection(triggered) {
    const isTriggered = Boolean(triggered);
    await this.setCapabilityValue('alarm_generic', isTriggered);
    this.log(`[HEATER]  Overheat protection: ${isTriggered ? 'TRIGGERED' : 'NORMAL'}`);

    if (isTriggered) {
      // Force shutdown
      await this._emergencyShutdown();

      // Trigger flow
      this.driver.overheatAlarmTrigger?.trigger(this, {
        temperature: this.getCapabilityValue('measure_temperature') || 0,
        power: this.getCapabilityValue('measure_power') || 0
      }, {}).catch(() => { });
    }
  }

  /**
   * Emergency shutdown procedure
   */
  async _emergencyShutdown() {
    this.log('[HEATER]  EMERGENCY SHUTDOWN ACTIVATED');

    try {
      // Turn off heater immediately
      await this.setCapabilityValue('onoff', false);
      await this.setCapabilityValue('thermostat_mode', 'off');

      // Send shutdown command to device
      await this.zclNode?.endpoints?.[1]?.clusters?.tuya?.datapoint({
        dp: 1,
        datatype: 1, // bool
        data: Buffer.from([0]) // false
      });

      this.log('[HEATER]  Emergency shutdown completed');
    } catch (err) {
      this.error('[HEATER]  Emergency shutdown failed:', err);
    }
  }

  /**
   * Send temperature calibration to device
   */
  async _sendCalibration(calibration) {
    try {
      await this.zclNode?.endpoints?.[1]?.clusters?.tuya?.datapoint({
        dp: 103,
        datatype: 2, // value (int)
        data: Buffer.from([Math.round(calibration)])
      });
    } catch (err) {
      this.log('[HEATER] Failed to send calibration:', err.message);
    }
  }

  /**
   * Send overheat protection setting
   */
  async _sendOverheatProtection(temperature) {
    try {
      await this.zclNode?.endpoints?.[1]?.clusters?.tuya?.datapoint({
        dp: 102,
        datatype: 2, // value (int)
        data: Buffer.from([temperature])
      });
    } catch (err) {
      this.log('[HEATER] Failed to send overheat protection:', err.message);
    }
  }

  /**
   * Send child lock setting
   */
  async _sendChildLock(enabled) {
    try {
      await this.zclNode?.endpoints?.[1]?.clusters?.tuya?.datapoint({
        dp: 101,
        datatype: 1, // bool
        data: Buffer.from([enabled ? 1 : 0])
      });
    } catch (err) {
      this.log('[HEATER] Failed to send child lock:', err.message);
    }
  }

  /**
   * Get heater status for (flows / apps)
   */
  getHeaterStatus() {
    return {
      isOn: this.getCapabilityValue('onoff') || false,
      currentTemp: this.getCapabilityValue('measure_temperature') || 0,
      targetTemp: this.getCapabilityValue('target_temperature') || 20,
      mode: this.getCapabilityValue('thermostat_mode') || 'manual',
      power: this.getCapabilityValue('measure_power') || 0,
      energy: this.getCapabilityValue('meter_power') || 0,
      isOverheated: this.getCapabilityValue('alarm_generic') || false,
      childLock: this._childLock
    };
  }

  onDeleted() {
    this.log('[HEATER]  Smart heater controller device deleted');
  }

  /**
   * Tuya EF00 time sync fallback (DP (0x24 / decimal) 36)
   * Sends current time with timezone offset for Tuya-native (thermostat / TRV) devices.
   */
  async _tuyaTimeSyncFallback() {
    try {
      const node = this.zclNode || this._zclNode;
      const tuyaCluster = node?.endpoints?.[1]?.clusters?.tuya;
      if (!tuyaCluster) return;

      const now = new Date();
      let utcOffset = 0;
      try {
        const tz = this.homey.clock.getTimezone();
        const tzDate = new Date(now.toLocaleString('en-US', { timeZone: tz }));
        utcOffset = Math.round((tzDate - now) / 3600000);
      } catch (e) { /* use UTC */ }

      // Tuya time format: [year-2000, month, day, hour, minute, second, weekday(0=Mon)]
      const payload = Buffer.from([
        now.getFullYear() - 2000,
        now.getMonth() + 1,
        now.getDate(),
        now.getHours() + utcOffset,
        now.getMinutes(),
        now.getSeconds(),
        now.getDay() === 0 ? 7 : now.getDay() // Sunday=7 in Tuya format
      ]);

      await tuyaCluster.datapoint({ dp: 36, datatype: 4, data: payload }); // Raw type
      this.log('[TimeSync] Tuya DP36 time sync sent:', payload.toString('hex'));
    } catch (e) {
      this.log('[TimeSync] Tuya fallback failed:', e.message);
    }
  }

}

module.exports = SmartHeaterControllerDevice;

