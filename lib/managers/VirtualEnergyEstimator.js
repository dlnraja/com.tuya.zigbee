'use strict';

/**
 * ╔══════════════════════════════════════════════════════════════════════════════╗
 * ║   VIRTUAL ENERGY ESTIMATOR - v1.0.0 (Opus 4.6 Feature)                       ║
 * ╠══════════════════════════════════════════════════════════════════════════════╣
 * ║  Estimates voltage, power, and energy consumption for devices lacking       ║
 * ║  hardware metering (e.g. simple switches, plugs, lights, curtain motors).    ║
 * ║  - Estimates based on active duration of capabilities/features.              ║
 * ║  - Uses manufacturer defaults + similar device category profiles.            ║
 * ║  - Custom user overrides via settings (e.g. 'estimated_load_w').             ║
 * ║  - Persistent energy accumulation in Homey Store.                            ║
 * ╚══════════════════════════════════════════════════════════════════════════════╝
 */

class VirtualEnergyEstimator {

  // Category profiles with nominal power (W) and voltage (V) specifications
  static CATEGORY_PROFILES = {
    'switch': { defaultPower: 15, nominalVoltage: 230, desc: 'Generic switch load' },
    'bulb': { defaultPower: 9, nominalVoltage: 230, desc: 'LED bulb load' },
    'plug': { defaultPower: 100, nominalVoltage: 230, desc: 'Smart socket typical load' },
    'curtain': { defaultPower: 45, nominalVoltage: 230, desc: 'Tubular tubular motor load' },
    'fan': { defaultPower: 55, nominalVoltage: 230, desc: 'Ceiling fan typical load' },
    'heater': { defaultPower: 1500, nominalVoltage: 230, desc: 'Space heater typical load' },
    'default': { defaultPower: 15, nominalVoltage: 230, desc: 'Default simulated load' }
  };

  constructor(device) {
    this.device = device;
    this.homey = device.homey;
    this._activeFeatures = new Map(); // featureKey -> timestamp when active
    this._estimatedLoads = {};        // gang -> wattage
    this._virtualPower = 0;
    this._virtualEnergy = 0;
    this._nominalVoltage = 230;
    this._initialized = false;
  }

  /**
   * Initialize the Virtual Energy Estimator
   */
  async initialize() {
    if (this._initialized) {return;}
    this.device.log('[VIRTUAL-ENERGY] ⚡ Initializing Virtual Energy Estimator...');

    // 1. Detect Category Profile
    const profile = this._detectCategoryProfile();
    this._nominalVoltage = this.device.getSetting('nominal_voltage') || profile.nominalVoltage || 230;

    // 2. Set Up Estimated Loads per Gang/Feature
    const gangCount = this.device.gangCount || 1;
    const settingsLoad = this.device.getSetting('estimated_load_w');

    for (let g = 1; g <= gangCount; g++) {
      // Check for per-gang setting or fall back to generic settings or profile default
      const gangSetting = this.device.getSetting(`estimated_load_w_gang${g}`);
      this._estimatedLoads[g] = gangSetting || settingsLoad || profile.defaultPower;
    }

    this.device.log(`[VIRTUAL-ENERGY] Category Profile: "${profile.desc}" | Nominal Voltage: ${this._nominalVoltage}V`);
    this.device.log(`[VIRTUAL-ENERGY] Estimated Loads: ${JSON.stringify(this._estimatedLoads)}`);

    // 3. Restore Accumulated Energy from Store
    const saved = await this.device.getStoreValue('virtual_accumulated_energy').catch(() => 0);
    this._virtualEnergy = typeof saved === 'number' && !isNaN(saved) ? saved : 0;
    this.device.log(`[VIRTUAL-ENERGY] Restored accumulated energy: ${this._virtualEnergy.toFixed(4)} kWh`);

    // 4. Ensure capabilities exist dynamically if enabled in settings
    const enabled = this.device.getSetting('virtual_energy_estimation_enabled') !== false;
    if (enabled) {
      await this._ensureCapabilities();
      this._startTracking();
    }

    this._initialized = true;
  }

  /**
   * Detect profile based on driver id
   */
  _detectCategoryProfile() {
    const driverId = this.device.driver?.id || '';
    if (driverId.includes('bulb') || driverId.includes('strip') || driverId.includes('led')) {
      return VirtualEnergyEstimator.CATEGORY_PROFILES.bulb;
    }
    if (driverId.includes('plug') || driverId.includes('outlet')) {
      return VirtualEnergyEstimator.CATEGORY_PROFILES.plug;
    }
    if (driverId.includes('curtain') || driverId.includes('shutter') || driverId.includes('cover')) {
      return VirtualEnergyEstimator.CATEGORY_PROFILES.curtain;
    }
    if (driverId.includes('fan')) {
      return VirtualEnergyEstimator.CATEGORY_PROFILES.fan;
    }
    if (driverId.includes('heater')) {
      return VirtualEnergyEstimator.CATEGORY_PROFILES.heater;
    }
    if (driverId.includes('switch')) {
      return VirtualEnergyEstimator.CATEGORY_PROFILES.switch;
    }
    return VirtualEnergyEstimator.CATEGORY_PROFILES.default;
  }

  /**
   * Ensure measure_power and meter_power capabilities are registered dynamically
   */
  async _ensureCapabilities() {
    try {
      if (!this.device.hasCapability('measure_power')) {
        this.device.log('[VIRTUAL-ENERGY] Dynamically registering measure_power');
        await this.device.addCapability('measure_power').catch(() => {});
      }
      if (!this.device.hasCapability('meter_power')) {
        this.device.log('[VIRTUAL-ENERGY] Dynamically registering meter_power');
        await this.device.addCapability('meter_power').catch(() => {});
      }
      if (!this.device.hasCapability('measure_voltage')) {
        this.device.log('[VIRTUAL-ENERGY] Dynamically registering measure_voltage');
        await this.device.addCapability('measure_voltage').catch(() => {});
      }
      // Update voltage once to nominal
      await this.device.setCapabilityValue('measure_voltage', this._nominalVoltage).catch(() => {});
    } catch (e) {
      this.device.error(`[VIRTUAL-ENERGY] Failed to register capabilities: ${e.message}`);
    }
  }

  /**
   * Subscribe to capability changes to track runtime durations
   */
  _startTracking() {
    const gangCount = this.device.gangCount || 1;

    for (let g = 1; g <= gangCount; g++) {
      const capKey = g === 1 ? 'onoff' : `onoff.gang${g}`;
      const finalCap = this.device.hasCapability(capKey) ? capKey : `onoff.${g}`;

      if (this.device.hasCapability(finalCap)) {
        // Record initial state if already ON
        if (this.device.getCapabilityValue(finalCap) === true) {
          this._activeFeatures.set(g, Date.now());
        }

        // Listen for changes
        this.device.on(`capability.${finalCap}`, (value) => {
          this._handleStateChange(g, value);
        });
      }
    }

    // Periodically recalculate energy to prevent losing time for continuously ON devices
    if (this._updateTimer) {clearInterval(this._updateTimer);}
    this._updateTimer = this.homey.setInterval(() => {
      if (this._destroyed) return;
      this._accumulatePeriodicEnergy();
    }, 60 * 1000); // Recalculate every minute

    this._updateVirtualPowerAndCurrent();
  }

  /**
   * Handle onoff state change
   */
  _handleStateChange(gang, isOn) {
    const now = Date.now();
    this.device.log(`[VIRTUAL-ENERGY] Gang ${gang} state changed: ${isOn ? 'ON' : 'OFF'}`);

    if (isOn) {
      if (!this._activeFeatures.has(gang)) {
        this._activeFeatures.set(gang, now);
      }
    } else {
      if (this._activeFeatures.has(gang)) {
        const startTime = this._activeFeatures.get(gang);
        const durationHours = (now - startTime) / 1000 / 3600;
        const loadWatts = this._estimatedLoads[gang] || 15;
        const energyDeltaKWh = (loadWatts * durationHours) / 1000;

        this._virtualEnergy += energyDeltaKWh;
        this._activeFeatures.delete(gang);

        this.device.setStoreValue('virtual_accumulated_energy', this._virtualEnergy).catch(() => {});
        this.device.setCapabilityValue('meter_power', Math.round(this._virtualEnergy * 1000) / 1000).catch(() => {});
      }
    }

    this._updateVirtualPowerAndCurrent();
  }

  /**
   * Periodic energy calculation (runs every minute to accumulate active durations)
   */
  _accumulatePeriodicEnergy() {
    const now = Date.now();
    let accumulatedDelta = 0;

    this._activeFeatures.forEach((startTime, gang) => {
      const durationHours = (now - startTime) / 1000 / 3600;
      const loadWatts = this._estimatedLoads[gang] || 15;
      const energyDeltaKWh = (loadWatts * durationHours) / 1000;

      accumulatedDelta += energyDeltaKWh;
      // Reset start time to now for the next interval
      this._activeFeatures.set(gang, now);
    });

    if (accumulatedDelta > 0) {
      this._virtualEnergy += accumulatedDelta;
      this.device.setStoreValue('virtual_accumulated_energy', this._virtualEnergy).catch(() => {});
      this.device.setCapabilityValue('meter_power', Math.round(this._virtualEnergy * 1000) / 1000).catch(() => {});
    }
  }

  /**
   * Recalculate estimated active power and current
   */
  _updateVirtualPowerAndCurrent() {
    let activePower = 0;

    this._activeFeatures.forEach((startTime, gang) => {
      activePower += this._estimatedLoads[gang] || 15;
    });

    this._virtualPower = activePower;

    // Calculate current (I = P / U)
    const currentAmps = activePower / this._nominalVoltage;

    // Update capabilities
    this.device.setCapabilityValue('measure_power', Math.round(activePower * 10) / 10).catch(() => {});

    if (this.device.hasCapability('measure_current')) {
      this.device.setCapabilityValue('measure_current', Math.round(currentAmps * 100) / 100).catch(() => {});
    } else if (activePower > 0) {
      // Try to dynamically add current capability if load is high and capability not present
      this.device.addCapability('measure_current')
        .then(() => {
          this.device.setCapabilityValue('measure_current', Math.round(currentAmps * 100) / 100).catch(() => {});
        })
        .catch(() => {});
    }

    this.device.log(`[VIRTUAL-ENERGY] Recalculated: Power=${activePower}W | Current=${currentAmps.toFixed(2)}A`);
  }

  /**
   * Get virtual statistics
   */
  getEstimates() {
    return {
      virtualPower: this._virtualPower,
      virtualEnergy: this._virtualEnergy,
      nominalVoltage: this._nominalVoltage,
      activeGangsCount: this._activeFeatures.size,
      loads: this._estimatedLoads
    };
  }

  /**
   * Cleanup timer
   */
  destroy() {
    if (this._updateTimer) {
      clearInterval(this._updateTimer);
      this._updateTimer = null;
    }
    this._accumulatePeriodicEnergy();
  }
}

module.exports = VirtualEnergyEstimator;
