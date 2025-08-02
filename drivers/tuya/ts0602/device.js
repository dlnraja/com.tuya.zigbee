'use strict';

const Device = require('../../../lib/device.js');

class TS0602Device extends Device {
    async onInit() {
        this.log('Tuya RGB Light device initialized');
        
        // Initialize capabilities
        this.registerCapabilityListener('onoff', this.onCapability.bind(this));
        this.registerCapabilityListener('dim', this.onCapability.bind(this));
        this.registerCapabilityListener('light_hue', this.onCapability.bind(this));
        this.registerCapabilityListener('light_saturation', this.onCapability.bind(this));
    }

    
            async onCapability(capability, value) {
                switch (capability) {
                    case 'onoff':
                        await this.setCapabilityValue('onoff', value);
                        break;
                    case 'dim':
                        await this.setCapabilityValue('dim', value);
                        break;
                    case 'light_hue':
                        await this.setCapabilityValue('light_hue', value);
                        break;
                    case 'light_saturation':
                        await this.setCapabilityValue('light_saturation', value);
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

module.exports = TS0602Device;