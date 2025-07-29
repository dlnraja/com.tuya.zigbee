const { ZigbeeDevice } = require('homey-zigbeedriver');

class ZigbeeLightDevice extends ZigbeeDevice {
    async onInit() {
        await super.onInit();
        
        // Register capabilities
        this.registerCapabilityListener('onoff', this.onCapabilityOnoff.bind(this));
        this.registerCapabilityListener('dim', this.onCapabilityDim.bind(this));
        
        // Start polling
        this.startPolling();
    }

    async onCapabilityOnoff(value, opts) {
        await this.setCapabilityValue('onoff', value);
        this.log('Light toggled to: ' + value);
    }

    async onCapabilityDim(value, opts) {
        await this.setCapabilityValue('dim', value);
        this.log('Light dimmed to: ' + value);
    }

    async onUninit() {
        this.stopPolling();
        await super.onUninit();
    }
}

module.exports = ZigbeeLightDevice;
