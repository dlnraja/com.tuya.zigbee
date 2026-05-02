'use strict';

/**
 * EnergyEstimator - Intelligent Energy Estimation for Tuya Devices
 * Provides virtual energy metering for devices without native power sensors.
 * 
 * Logic:
 * 1. Uses device settings (nominalPower) or defaults based on device category.
 * 2. Tracks time spent in 'on' vs 'off' states.
 * 3. Integrates with capability listeners to update real-time power (W) and accumulated energy (kWh).
 */

class EnergyEstimator {
  constructor(device) {
    this.device = device;
    this.lastStateChange = Date.now();
    this.accumulatedEnergy = 0; // kWh
    this.nominalPower = 0; // W
    this.currentPower = 0; // W
    this.voltage = 230; // V (Standard default)
    this.current = 0; // A
  }

  /**
   * Initialize the estimator
   * @param {Object} options - { nominalPower: number, standbyPower: number }
   */
  async init(options = {}) {
    const deviceClass = this.device.getClass();
    
    // Default nominal powers based on class if not provided
    const defaultPowers = {
      'light': 9, // 9W average LED
      'socket': 0, // Sockets vary too much, require setting
      'heater': 2000, // 2kW heater
      'fan': 45, // 45W fan
      'other': 1
    };

    this.nominalPower = options.nominalPower || this.device.getSetting('nominal_power') || defaultPowers[deviceClass] || 5;
    this.standbyPower = options.standbyPower || this.device.getSetting('standby_power') || 0.5;

    // Load previously saved energy if available
    this.accumulatedEnergy = this.device.getStoreValue('estimated_energy') || 0;
    
    this.device.log(`[EnergyEstimator] Initialized: Nominal=${this.nominalPower}W, Standby=${this.standbyPower}W`);
  }

  /**
   * Update the current power state based on onoff capability
   */
  async update() {
    const isOn = this.device.getCapabilityValue('onoff');
    const now = Date.now();
    const durationHours = (now - this.lastStateChange) / (1000 * 60 * 60);

    // Calculate energy consumed since last update
    const powerWhileRunning = isOn ? this.nominalPower : this.standbyPower;
    const energyDelta = powerWhileRunning * durationHours / 1000; // Wh to kWh

    this.accumulatedEnergy += energyDelta;
    this.currentPower = powerWhileRunning;
    this.current = this.currentPower / this.voltage;

    // Update capabilities
    if (this.device.hasCapability('measure_power')) {
      await this.device.setCapabilityValue('measure_power', this.currentPower).catch(() => {});
    }
    if (this.device.hasCapability('meter_power')) {
      await this.device.setCapabilityValue('meter_power', this.accumulatedEnergy).catch(() => {});
    }
    if (this.device.hasCapability('measure_voltage')) {
      await this.device.setCapabilityValue('measure_voltage', this.voltage).catch(() => {});
    }
    if (this.device.hasCapability('measure_current')) {
      await this.device.setCapabilityValue('measure_current', Math.round(this.current * 100) / 100).catch(() => {});
    }

    // Save to store periodically
    await this.device.setStoreValue('estimated_energy', this.accumulatedEnergy).catch(() => {});
    this.lastStateChange = now;
  }

  /**
   * Static method to inject into driver.js
   * Use this in onInit of devices.
   */
  static async attach(device, options = {}) {
    const estimator = new EnergyEstimator(device);
    await estimator.init(options);
    
    // Listen for changes
    device.registerCapabilityListener('onoff', async () => {
      await estimator.update();
      return null;
    });

    // Periodic update (every 15 mins) for accumulation
    device.homey.setInterval(async () => {
      await estimator.update();
    }, 1000 * 60 * 15);

    return estimator;
  }
}

module.exports = EnergyEstimator;