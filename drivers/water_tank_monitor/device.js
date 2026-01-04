'use strict';

const { ZigBeeDevice } = require('homey-zigbeedriver');
const HybridSensorBase = require('../../lib/devices/HybridSensorBase');

/**
 * Water Tank Level Monitor - ME201WZ Zigbee
 *
 * Ultrasonic water/liquid level sensor for tanks and containers.
 * Measures distance to liquid surface and calculates fill percentage.
 *
 * v5.5.353: New driver for Zigbee equivalent of WiFi water tank monitors
 *
 * Key features:
 * - Ultrasonic level measurement (0.1m - 4.0m range)
 * - Tank fill percentage calculation
 * - Low water level alerts
 * - Battery powered operation
 * - Temperature compensation
 *
 * Tuya DPs:
 * - DP 1: Distance measurement (cm)
 * - DP 2: Battery percentage
 * - DP 3: Temperature (°C)
 * - DP 4: Alarm status
 * - DP 101: Fill percentage (%)
 * - DP 102: Liquid level (mm)
 */
class WaterTankMonitorDevice extends HybridSensorBase {

  async onNodeInit({ zclNode }) {
    this.log('[TANK] 💧 Initializing water tank level monitor...');

    // Initialize settings with defaults
    this._tankHeight = this.getSetting('tank_height') || 2.0;
    this._sensorOffset = this.getSetting('sensor_offset') || 0.0;
    this._lowWaterThreshold = this.getSetting('low_water_threshold') || 20;
    this._updateInterval = this.getSetting('update_interval') || 10;

    this.log(`[TANK] 📊 Configuration: Height=${this._tankHeight}m, Offset=${this._sensorOffset}m, Threshold=${this._lowWaterThreshold}%`);

    // Call parent initialization
    await super.onNodeInit({ zclNode });

    // Register setting listeners
    this.registerSettings();

    this.log('[TANK] ✅ Water tank monitor initialized successfully');
  }

  /**
   * Register setting change listeners
   */
  registerSettings() {
    this.registerSetting('tank_height', (newValue) => {
      this._tankHeight = newValue;
      this.log(`[TANK] ⚙️ Tank height updated: ${newValue}m`);
      // Recalculate percentage with new height
      this._recalculatePercentage();
    });

    this.registerSetting('sensor_offset', (newValue) => {
      this._sensorOffset = newValue;
      this.log(`[TANK] ⚙️ Sensor offset updated: ${newValue}m`);
      this._recalculatePercentage();
    });

    this.registerSetting('low_water_threshold', (newValue) => {
      this._lowWaterThreshold = newValue;
      this.log(`[TANK] ⚙️ Low water threshold updated: ${newValue}%`);
      this._checkLowWaterAlarm();
    });

    this.registerSetting('update_interval', (newValue) => {
      this._updateInterval = newValue;
      this.log(`[TANK] ⚙️ Update interval updated: ${newValue}min`);
    });
  }

  /**
   * Handle Tuya datapoints specific to water tank monitoring
   */
  async _handleDP(dp, value) {
    this.log(`[TANK] 📡 Received DP ${dp}: ${value}`);

    switch (dp) {
      case 1: // Distance measurement (cm)
        await this._handleDistanceMeasurement(value);
        break;

      case 2: // Battery percentage
        this._handleBatteryDP(dp, value);
        break;

      case 3: // Temperature
        await this._handleTemperature(value);
        break;

      case 4: // Alarm status
        await this._handleAlarmStatus(value);
        break;

      case 101: // Fill percentage (direct from device)
        await this._handleFillPercentage(value);
        break;

      case 102: // Liquid level (mm)
        await this._handleLiquidLevel(value);
        break;

      default:
        // Pass to parent for standard DP handling
        await super._handleDP(dp, value);
        break;
    }
  }

  /**
   * Handle distance measurement from ultrasonic sensor
   * @param {number} distanceCm - Distance in centimeters
   */
  async _handleDistanceMeasurement(distanceCm) {
    if (typeof distanceCm !== 'number' || distanceCm < 0) {
      this.log(`[TANK] ⚠️ Invalid distance measurement: ${distanceCm}`);
      return;
    }

    const distanceM = distanceCm / 100; // Convert cm to meters

    // Apply sensor offset and calculate actual water level
    const waterLevel = Math.max(0, this._tankHeight - this._sensorOffset - distanceM);

    // Calculate fill percentage
    const fillPercentage = Math.min(100, Math.max(0, (waterLevel / (this._tankHeight - this._sensorOffset)) * 100));

    this.log(`[TANK] 📏 Distance: ${distanceCm}cm, Water Level: ${waterLevel.toFixed(2)}m, Fill: ${fillPercentage.toFixed(0)}%`);

    // Update capabilities
    await this.setCapabilityValue('measure_water_level', Math.round(waterLevel * 100) / 100);
    await this.setCapabilityValue('measure_water_percentage', Math.round(fillPercentage));

    // Store values for recalculation
    this._lastDistance = distanceCm;
    this._lastWaterLevel = waterLevel;
    this._lastFillPercentage = fillPercentage;

    // Check low water alarm
    this._checkLowWaterAlarm();
  }

  /**
   * Handle temperature measurement
   * @param {number} temperature - Temperature in °C
   */
  async _handleTemperature(temperature) {
    if (typeof temperature === 'number' && temperature >= -40 && temperature <= 80) {
      await this.setCapabilityValue('measure_temperature', temperature);
      this.log(`[TANK] 🌡️ Temperature: ${temperature}°C`);
    } else {
      this.log(`[TANK] ⚠️ Invalid temperature: ${temperature}`);
    }
  }

  /**
   * Handle alarm status from device
   * @param {boolean} alarmActive - Alarm status
   */
  async _handleAlarmStatus(alarmActive) {
    const isAlarm = Boolean(alarmActive);
    await this.setCapabilityValue('alarm_water_low', isAlarm);
    this.log(`[TANK] 🚨 Device alarm: ${isAlarm ? 'ACTIVE' : 'CLEARED'}`);

    if (isAlarm) {
      // Trigger flow
      this.driver.lowWaterAlarmTrigger?.trigger(this, {
        water_level: this._lastWaterLevel || 0,
        fill_percentage: this._lastFillPercentage || 0
      }, {}).catch(() => { });
    }
  }

  /**
   * Handle direct fill percentage from device
   * @param {number} percentage - Fill percentage 0-100
   */
  async _handleFillPercentage(percentage) {
    if (typeof percentage === 'number' && percentage >= 0 && percentage <= 100) {
      await this.setCapabilityValue('measure_water_percentage', percentage);
      this._lastFillPercentage = percentage;
      this.log(`[TANK] 📊 Fill percentage (direct): ${percentage}%`);
      this._checkLowWaterAlarm();
    }
  }

  /**
   * Handle liquid level in mm
   * @param {number} levelMm - Liquid level in millimeters
   */
  async _handleLiquidLevel(levelMm) {
    if (typeof levelMm === 'number' && levelMm >= 0) {
      const levelM = levelMm / 1000; // Convert mm to meters
      await this.setCapabilityValue('measure_water_level', Math.round(levelM * 100) / 100);
      this._lastWaterLevel = levelM;
      this.log(`[TANK] 📏 Liquid level (direct): ${levelMm}mm = ${levelM.toFixed(2)}m`);
    }
  }

  /**
   * Check if low water alarm should be triggered
   */
  _checkLowWaterAlarm() {
    const currentPercentage = this._lastFillPercentage;
    if (typeof currentPercentage === 'number') {
      const shouldAlarm = currentPercentage <= this._lowWaterThreshold;
      const currentAlarm = this.getCapabilityValue('alarm_water_low');

      if (shouldAlarm !== currentAlarm) {
        this.setCapabilityValue('alarm_water_low', shouldAlarm).catch(() => { });
        this.log(`[TANK] 🚨 Low water alarm ${shouldAlarm ? 'TRIGGERED' : 'CLEARED'} at ${currentPercentage}%`);

        if (shouldAlarm) {
          // Trigger flow
          this.driver.lowWaterAlarmTrigger?.trigger(this, {
            water_level: this._lastWaterLevel || 0,
            fill_percentage: currentPercentage
          }, {}).catch(() => { });
        }
      }
    }
  }

  /**
   * Recalculate water level percentage when settings change
   */
  _recalculatePercentage() {
    if (typeof this._lastDistance === 'number') {
      this._handleDistanceMeasurement(this._lastDistance);
    }
  }

  /**
   * Get current tank status for flows/apps
   */
  getTankStatus() {
    return {
      waterLevel: this._lastWaterLevel || 0,
      fillPercentage: this._lastFillPercentage || 0,
      tankHeight: this._tankHeight,
      sensorOffset: this._sensorOffset,
      lowWaterThreshold: this._lowWaterThreshold,
      isLowWater: this.getCapabilityValue('alarm_water_low') || false
    };
  }

  onDeleted() {
    this.log('[TANK] 💧 Water tank monitor device deleted');
  }
}

module.exports = WaterTankMonitorDevice;
