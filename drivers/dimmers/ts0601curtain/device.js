'use strict';

const Device = require('../../../lib/device.js');

class ts0601curtainDevice extends Device {
    async onInit() {
        this.log('ts0601curtain device initialized (enriched version)');
        
        // Initialize capabilities with legacy optimizations
        this.registerCapabilityListener('onoff', this.onCapability.bind(this));\n        this.registerCapabilityListener('dim', this.onCapability.bind(this));
    }

    async onCapability(capability, value) {
        this.log('Capability ' + capability + ' changed to ' + value + ' (enriched)');
        
        switch (capability) {
            case 'onoff':
                await this.handleOnoff(value);
                break;\n            case 'dim':
                await this.handleDim(value);
                break;
            default:
                this.log('Unknown capability: ' + capability);
        }
    }

    async handleOnoff(value) {
        this.log('Setting onoff to: ' + value + ' (enriched)');
        await this.setCapabilityValue('onoff', value);
    }\n    async handleDim(value) {
        this.log('Setting dim to: ' + value + ' (enriched)');
        await this.setCapabilityValue('dim', value);
    }
    
    // Device lifecycle methods (enriched with legacy features)
    async onSettings({ oldSettings, newSettings, changedKeys }) {
        this.log('Settings changed (enriched)');
    }

    async onRenamed(name) {
        this.log('Device renamed to', name, '(enriched)');
    }

    async onDeleted() {
        this.log('Device deleted (enriched)');
    }

    async onUnavailable() {
        this.log('Device unavailable (enriched)');
    }

    async onAvailable() {
        this.log('Device available (enriched)');
    }

    async onError(error) {
        this.log('Device error:', error, '(enriched)');
    }
}

module.exports = ts0601curtainDevice;