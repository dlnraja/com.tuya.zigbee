const { ZigbeeDevice } = require('homey-zigbeedriver');

class ZigbeeSwitchDevice extends ZigbeeDevice {
    async onInit() {
        await super.onInit();
        
        // Register capabilities
        this.registerCapabilityListener('onoff', this.onCapabilityOnoff.bind(this));
        
        // Start polling
        this.startPolling();
    }

    async onCapabilityOnoff(value, opts) {
        await this.setCapabilityValue('onoff', value);
        this.log('Switch toggled to: ' + value);
    }

    async onUninit() {
        this.stopPolling();
        await super.onUninit();
    }
}

module.exports = ZigbeeSwitchDevice;
