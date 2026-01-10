'use strict';

/**
 * Virtual Capabilities Manager
 * Gere les capabilities derivees et calculees
 */

class VirtualCapabilities {
  constructor(device) {
    this.device = device;
    this.resetScheduler = null;
  }

  /**
   * Enregistre toutes les virtual capabilities
   */
  async registerAll() {
    await this.registerEnergyCapabilities();
    await this.registerHealthCapabilities();
    this.setupMidnightReset();
  }

  /**
   * ENERGY CALCULATIONS
   */
  async registerEnergyCapabilities() {
    const device = this.device;

    // Daily energy
    if (device.hasCapability('meter_power')) {
      try {
        // Register virtual daily meter
        device.registerCapabilityListener('meter_power_daily', async (value) => {
          // This is read-only, calculated
          return value;
        });

        // Calculate daily energy
        this.calculateDailyEnergy();
      } catch (err) {
        device.log('Daily energy capability not available:', err.message);
      }
    }

    // Apparent power (VA = V × A)
    if (device.hasCapability('measure_voltage') && device.hasCapability('measure_current')) {
      try {
        const V = device.getCapabilityValue('measure_voltage') || 230;
        const A = device.getCapabilityValue('measure_current') || 0;
        const VA = V * A;

        if (device.hasCapability('measure_apparent_power')) {
          await device.setCapabilityValue('measure_apparent_power', parseFloat(VA));
        }
      } catch (err) {
        device.log('Apparent power calculation failed:', err.message);
      }
    }

    // Power factor (PF = W / VA)
    if (device.hasCapability('measure_power') && device.hasCapability('measure_apparent_power')) {
      try {
        const W = device.getCapabilityValue('measure_power') || 0;
        const VA = device.getCapabilityValue('measure_apparent_power') || 1;
        const PF = VA > 0 ? W / VA : 0;

        if (device.hasCapability('measure_power_factor')) {
          await device.setCapabilityValue('measure_power_factor', parseFloat(Math.min(1, Math.max(0, PF))));
        }
      } catch (err) {
        device.log('Power factor calculation failed:', err.message);
      }
    }

    // Cost calculation
    if (device.hasCapability('meter_power')) {
      try {
        const kWh = device.getCapabilityValue('meter_power') || 0;
        const pricePerKWh = device.getSetting('electricity_price') || 0.25;
        const cost = kWh * pricePerKWh;

        if (device.hasCapability('meter_cost')) {
          await device.setCapabilityValue('meter_cost', cost);
        }
      } catch (err) {
        device.log('Cost calculation failed:', err.message);
      }
    }
  }

  /**
   * Calcule l energie journaliere
   */
  calculateDailyEnergy() {
    const device = this.device;

    try {
      const currentEnergy = device.getCapabilityValue('meter_power') || 0;
      const dayStart = device.getStoreValue('energy_day_start') || currentEnergy;
      const dailyEnergy = Math.max(0, currentEnergy - dayStart);

      if (device.hasCapability('meter_power_daily')) {
        device.setCapabilityValue('meter_power_daily', dailyEnergy);
      }
    } catch (err) {
      device.log('Daily energy calculation failed:', err.message);
    }
  }

  /**
   * Reset des compteurs a minuit
   */
  setupMidnightReset() {
    const device = this.device;

    // Clear existing scheduler
    if (this.resetScheduler) {
      device.homey.clearTimeout(this.resetScheduler);
    }

    // Calculate time until midnight
    const now = new Date();
    const tomorrow = new Date(now);
    tomorrow.setDate(tomorrow.getDate() + 1);
    tomorrow.setHours(0, 0, 0, 0);
    const msUntilMidnight = tomorrow - now;

    // Schedule reset
    this.resetScheduler = device.homey.setTimeout(() => {
      this.resetDailyCounters();
      this.setupMidnightReset(); // Reschedule for next day
    }, msUntilMidnight);

    device.log(`Daily reset scheduled in ${Math.round(msUntilMidnight / 1000 / 60)} minutes`);
  }

  /**
   * Reset des compteurs journaliers
   */
  async resetDailyCounters() {
    const device = this.device;

    try {
      const currentEnergy = device.getCapabilityValue('meter_power') || 0;
      await device.setStoreValue('energy_day_start', currentEnergy);
      await device.setCapabilityValue('meter_power_daily', 0);

      device.log('Daily energy counters reset at midnight');
    } catch (err) {
      device.error('Failed to reset daily counters:', err);
    }
  }

  /**
   * DEVICE HEALTH
   */
  async registerHealthCapabilities() {
    const device = this.device;

    // Last seen
    try {
      if (device.hasCapability('last_seen')) {
        const lastSeen = device.getStoreValue('last_seen_timestamp') || Date.now();
        await device.setCapabilityValue('last_seen', new Date(lastSeen).toISOString());
      }
    } catch (err) {
      device.log('Last seen capability not available:', err.message);
    }

    // Signal strength (RSSI)
    try {
      if (device.hasCapability('measure_rssi') && device.zclNode) {
        const rssi = await device.zclNode.endpoints[1].clusters.basic.readAttribute('rssi');
        await device.setCapabilityValue('measure_rssi', parseFloat(rssi || -100));
      }
    } catch (err) {
      device.log('RSSI reading failed:', err.message);
    }

    // Offline alarm
    try {
      if (device.hasCapability('alarm_offline')) {
        const lastSeen = device.getStoreValue('last_seen_timestamp') || Date.now();
        const offline = (Date.now() - lastSeen) > 3600000; // 1 hour
        await device.setCapabilityValue('alarm_offline', offline);
      }
    } catch (err) {
      device.log('Offline alarm check failed:', err.message);
    }
  }

  /**
   * Update virtual capabilities (called periodically)
   */
  async update() {
    await this.registerEnergyCapabilities();
    await this.registerHealthCapabilities();
  }

  /**
   * Cleanup
   */
  destroy() {
    if (this.resetScheduler) {
      this.device.homey.clearTimeout(this.resetScheduler);
      this.resetScheduler = null;
    }
  }
}

module.exports = VirtualCapabilities;
