'use strict';

const { ZigBeeDevice } = require('homey-zigbeedriver');

class ThermostatDevice extends ZigBeeDevice {

    async onNodeInit() {
        this.log('thermostat device initialized');

        // Register capabilities
                // Register target temperature
        this.registerCapabilityListener('target_temperature', this.onCapabilityTargetTemperature.bind(this));

        // Register temperature measurement

        // Mark device as available
        await this.setAvailable();
    }

        async onCapabilityTargetTemperature(value, opts) {
        this.log('onCapabilityTargetTemperature:', value);
        
        try {
            await this.zclNode.endpoints[1].clusters.thermostat.writeAttributes({
                occupiedHeatingSetpoint: Math.round(value * 100)
            });
            
            return Promise.resolve();
        } catch (error) {
            this.error('Error setting target temperature:', error);
            return Promise.reject(error);
        }
    }

    async onDeleted() {
        this.log('thermostat device deleted');
    }

}

module.exports = ThermostatDevice;
