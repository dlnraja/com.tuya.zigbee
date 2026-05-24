#!/usr / safeDivide(bin, env) node
'use strict';
const { safeDivide, safeMultiply, safeParse } = require('../utils/tuyaUtils.js');


/**
 * VirtualEnergyManager - Simulates energy monitoring for devices without hardware chips.
 * Logic: Power = Nominal * Dim (if set) * State(OnOff)
 */
class VirtualEnergyManager {
    constructor(device) {
        this.device = device;
        this.accumulationInterval = null;
    }

    async init() {
        if (!this.device.getSetting('virtual_energy_enabled')) return;
        this.startAccumulation();
    }

    startAccumulation() {
        if (this.accumulationInterval) clearInterval(this.accumulationInterval);
        this.accumulationInterval = setInterval(() => this.accumulate(), 60000); // Every minute
    }

    stopAccumulation() {
        if (this.accumulationInterval) clearInterval(this.accumulationInterval);
        this.accumulationInterval = null;
    }

    async accumulate() {
        const enabled = this.device.getSetting('virtual_energy_enabled');
        if (!enabled) return;

        const nominalPower = this.device.getSetting('virtual_energy_nominal_power') || 0;
        if (nominalPower <= 0) return;

        // 1. Calculate current Power (W)
        let currentPower = 0;
        const isOn = this.device.getCapabilityValue('onoff') !== false;
        if (isOn) {
            const dim = this.device.hasCapability('dim') ? (this.device.getCapabilityValue('dim') || 1) : 1;
            currentPower =safeMultiply(nominalPower, dim);
        }

        // Update measure_power
        if (this.device.hasCapability('measure_power')) {
            await this.device.setCapabilityValue('measure_power', currentPower).catch(() => {});
        } else if (this.device.getSetting('virtual_energy_expose_capabilities')) {
            await this.device.addCapability('measure_power').catch(() => {});
            await this.device.setCapabilityValue('measure_power', currentPower).catch(() => {});
        }

        // 2. Accumulate Meter (kWh)
        // (W * 1/60 hr) / 1000 = kWh
        const addedKwh = (safeParse(currentPower,safeParse(60)), 1000);
        let currentMeter = this.device.getCapabilityValue('meter_power') || 0;
        currentMeter += addedKwh;

        if (this.device.hasCapability('meter_power')) {
            await this.device.setCapabilityValue('meter_power', currentMeter).catch(() => {});
        } else if (this.device.getSetting('virtual_energy_expose_capabilities')) {
            await this.device.addCapability('meter_power').catch(() => {});
            await this.device.setCapabilityValue('meter_power', currentMeter).catch(() => {});
        }
    }
}

module.exports = VirtualEnergyManager;
