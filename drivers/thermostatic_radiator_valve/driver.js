'use strict';

const { ZigBeeDriver } = require('homey-zigbeedriver');
const Homey = require("homey");

class ThermostaticRadiatorValveDriver extends ZigBeeDriver {

    async onInit() {
        this.log('Thermostatic Radiator Valve Driver initialized');
        this._registerFlowCards();
    }

    /**
     * Register flow card run listeners for all thermostat enhanced actions/conditions
     */
    _registerFlowCards() {
        // ACTION: Set boost mode
        try {
            const boostCard = this.homey.flow.getActionCard('thermostatic_radiator_valve_set_boost');
            if (boostCard) {
                boostCard.registerRunListener(async (args) => {
                    if (!args.device) return false;
                    const enabled = args.mode === 'on';
                    this.log(`Flow: Setting boost mode to ${args.mode}`);
                    if (typeof args.device.setBoostMode === 'function') {
                        return await args.device.setBoostMode(enabled);
                    }
                    return false;
                });
            }
        } catch (err) {
            this.error('Flow card set_boost error:', err.message);
        }

        // ACTION: Set frost protection
        try {
            const frostCard = this.homey.flow.getActionCard('thermostatic_radiator_valve_set_frost_protection');
            if (frostCard) {
                frostCard.registerRunListener(async (args) => {
                    if (!args.device) return false;
                    const enabled = args.mode === 'on';
                    this.log(`Flow: Setting frost protection to ${args.mode}`);
                    if (typeof args.device.setFrostProtection === 'function') {
                        return await args.device.setFrostProtection(enabled);
                    }
                    return false;
                });
            }
        } catch (err) {
            this.error('Flow card set_frost_protection error:', err.message);
        }

        // ACTION: Set child lock
        try {
            const childLockCard = this.homey.flow.getActionCard('thermostatic_radiator_valve_set_child_lock');
            if (childLockCard) {
                childLockCard.registerRunListener(async (args) => {
                    if (!args.device) return false;
                    const enabled = args.mode === 'on';
                    this.log(`Flow: Setting child lock to ${args.mode}`);
                    if (typeof args.device.setChildLock === 'function') {
                        return await args.device.setChildLock(enabled);
                    }
                    return false;
                });
            }
        } catch (err) {
            this.error('Flow card set_child_lock error:', err.message);
        }

        // ACTION: Set window detection
        try {
            const windowCard = this.homey.flow.getActionCard('thermostatic_radiator_valve_set_window_detection');
            if (windowCard) {
                windowCard.registerRunListener(async (args) => {
                    if (!args.device) return false;
                    const enabled = args.mode === 'on';
                    this.log(`Flow: Setting window detection to ${args.mode}`);
                    if (typeof args.device.setWindowDetection === 'function') {
                        return await args.device.setWindowDetection(enabled);
                    }
                    return false;
                });
            }
        } catch (err) {
            this.error('Flow card set_window_detection error:', err.message);
        }

        // CONDITION: Boost mode active
        try {
            const boostCond = this.homey.flow.getConditionCard('thermostatic_radiator_valve_boost_active');
            if (boostCond) {
                boostCond.registerRunListener(async (args) => {
                    if (!args.device) return false;
                    if (typeof args.device.isBoostActive === 'function') {
                        return await args.device.isBoostActive();
                    }
                    return false;
                });
            }
        } catch (err) {
            this.error('Flow card boost_active condition error:', err.message);
        }

        // CONDITION: Child lock active
        try {
            const childLockCond = this.homey.flow.getConditionCard('thermostatic_radiator_valve_child_lock_active');
            if (childLockCond) {
                childLockCond.registerRunListener(async (args) => {
                    if (!args.device) return false;
                    if (typeof args.device.isChildLockActive === 'function') {
                        return await args.device.isChildLockActive();
                    }
                    return false;
                });
            }
        } catch (err) {
            this.error('Flow card child_lock_active condition error:', err.message);
        }

        this.log('Flow cards registered');
    }
}

module.exports = ThermostaticRadiatorValveDriver;
