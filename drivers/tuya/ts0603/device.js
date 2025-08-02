'use strict';

const Device = require('../../../lib/device.js');

class TS0603Device extends Device {
    async onInit() {
        this.log('Tuya Temperature/Humidity Sensor device initialized');
        
        // Initialize capabilities
        this.registerCapabilityListener('measure_temperature', this.onCapability.bind(this));
        this.registerCapabilityListener('measure_humidity', this.onCapability.bind(this));
    }

    
            async onCapability(capability, value) {
                switch (capability) {
                    case 'measure_temperature':
                        await this.setCapabilityValue('measure_temperature', value);
                        break;
                    case 'measure_humidity':
                        await this.setCapabilityValue('measure_humidity', value);
                        break;
                }
            }
        
    
    // Device lifecycle methods
    async onSettings({ oldSettings, newSettings, changedKeys }) {
        this.log('Settings changed');
    }

    async onRenamed(name) {
        this.log('Device renamed to', name);
    }

    async onDeleted() {
        this.log('Device deleted');
    }

    async onUnavailable() {
        this.log('Device unavailable');
    }

    async onAvailable() {
        this.log('Device available');
    }

    async onError(error) {
        this.log('Device error:', error);
    }
}

module.exports = TS0603Device;