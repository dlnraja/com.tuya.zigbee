'use strict';

const { ZigBeeDevice } = require('homey-zigbeedriver');

class EnergyMonitoringPlugDevice extends ZigBeeDevice {

    async onNodeInit() {
        this.log('energy_monitoring_plug device initialized');

        // Register capabilities
                // Register on/off capability
        this.registerCapabilityListener('onoff', this.onCapabilityOnoff.bind(this));

        // Register power measurement

        // Mark device as available
        await this.setAvailable();
    }

        async onCapabilityOnoff(value, opts) {
        this.log('onCapabilityOnoff:', value);
        
        try {
            if (value) {
                await this.zclNode.endpoints[1].clusters.onOff.setOn();
            } else {
                await this.zclNode.endpoints[1].clusters.onOff.setOff();
            }
            
            return Promise.resolve();
        } catch (error) {
            this.error('Error setting onoff:', error);
            return Promise.reject(error);
        }
    }

    async onDeleted() {
        this.log('energy_monitoring_plug device deleted');
    }

}

module.exports = EnergyMonitoringPlugDevice;
