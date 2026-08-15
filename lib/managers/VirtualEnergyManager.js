#!/usr/bin/env node
'use strict';
const { safeMultiply, safeParse } = require('../utils/tuyaUtils.js');

/**
 * VirtualEnergyManager - Simulates energy monitoring for devices without hardware chips.
 * Logic: Power = Nominal * Dim (if set) * State(OnOff)
 * All capability writes go through safeSetCapabilityValue (L14) when available.
 */
class VirtualEnergyManager {
  constructor(device) {
    this.device = device;
    this.accumulationInterval = null;
  }

  get homey() {
    return this.device?.homey;
  }

  async init() {
    if (!this.device.getSetting('virtual_energy_enabled')) {return;}
    this.startAccumulation();
  }

  startAccumulation() {
    if (this.accumulationInterval) {clearInterval(this.accumulationInterval);}
    const timer = this.homey?.setInterval?.bind(this.homey) || setInterval;
    this.accumulationInterval = timer(() => this.accumulate(), 60000);
  }

  stopAccumulation() {
    if (this.accumulationInterval) {
      const clear = this.homey?.clearInterval?.bind(this.homey) || clearInterval;
      clear(this.accumulationInterval);
    }
    this.accumulationInterval = null;
  }

  async _safeSet(capabilityId, value) {
    if (!this.device || value === undefined) {return;}
    // Never overwrite real metering
    const smart = this.device.smartEnergy;
    if (smart?.isRealCapability?.(capabilityId)) {return;}
    if (smart && typeof smart.isAuditComplete === 'function' && !smart.isAuditComplete()) {return;}

    const caps = typeof this.device.getCapabilities === 'function' ? this.device.getCapabilities() : [];
    const needle = String(capabilityId).toLowerCase();
    const cap = (caps || []).find((c) => String(c).toLowerCase() === needle) || capabilityId;
    if (typeof this.device.safeSetCapabilityValue === 'function') {
      await this.device.safeSetCapabilityValue(cap, value).catch(() => {});
    } else if (typeof this.device.hasCapability === 'function' && this.device.hasCapability(cap)) {
      await this.device.setCapabilityValue(cap, value).catch(() => {});
    }
    try {
      const DeviceTelemetryEstimator = require('../utils/DeviceTelemetryEstimator');
      await DeviceTelemetryEstimator.record(this.device, cap, value, { source: 'estimated', via: 'virtual-energy-manager' });
    } catch (_e) { /* optional */ }
  }

  async accumulate() {
    const enabled = this.device.getSetting('virtual_energy_enabled');
    if (!enabled) {return;}

    const nominalPower = this.device.getSetting('virtual_energy_nominal_power') || 0;
    if (nominalPower <= 0) {return;}

    let currentPower = 0;
    const isOn = this.device.getCapabilityValue('onoff') !== false;
    if (isOn) {
      const dim = this.device.hasCapability('dim') ? this.device.getCapabilityValue('dim') || 1 : 1;
      currentPower = safeMultiply(nominalPower, dim);
    }

    if (this.device.hasCapability('measure_power')) {
      await this._safeSet('measure_power', currentPower);
    } else if (this.device.getSetting('virtual_energy_expose_capabilities')) {
      await this.device.addCapability('measure_power').catch(() => {});
      await this._safeSet('measure_power', currentPower);
    }

    const addedKwh = (safeParse(currentPower, 0) / 60) / 1000;
    let currentMeter = this.device.getCapabilityValue('meter_power') || 0;
    currentMeter += addedKwh;

    if (this.device.hasCapability('meter_power')) {
      await this._safeSet('meter_power', currentMeter);
    } else if (this.device.getSetting('virtual_energy_expose_capabilities')) {
      await this.device.addCapability('meter_power').catch(() => {});
      await this._safeSet('meter_power', currentMeter);
    }
  }
}

module.exports = VirtualEnergyManager;
