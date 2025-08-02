'use strict';

const Device = require('../../../lib/device.js');

class ts0601motionDevice extends Device {
    async onInit() {
        this.log('ts0601motion device initialized');
        
        // Initialize capabilities
        this.registerCapabilityListener('onoff', this.onCapability.bind(this));
        this.registerCapabilityListener('dim', this.onCapability.bind(this));
    }

    async onCapability(capability, value) {
        this.log('Capability ' + capability + ' changed to ' + value);
        
        switch (capability) {
            case 'onoff':
                await this.handleOnoff(value);
                break;
            case 'dim':
                await this.handleDim(value);
                break;
            default:
                this.log('Unknown capability: ' + capability);
        }
    }

    async handleOnoff(value) {
        this.log('Setting onoff to: ' + value);
        await this.setCapabilityValue('onoff', value);
    }
    async handleDim(value) {
        this.log('Setting dim to: ' + value);
        await this.setCapabilityValue('dim', value);
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

module.exports = ts0601motionDevice;