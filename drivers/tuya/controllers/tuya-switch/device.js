const { ZigbeeDevice } = require('homey-zigbeedriver');

class TuyaSwitchDevice extends ZigbeeDevice {
    async onInit() {
        await super.onInit();
        
        // Register capabilities
        this.registerCapabilityListener('onoff', this.onCapabilityOnoff.bind(this));
        
        // Start polling
        this.startPolling();
    }

    async onCapabilityOnoff(value, opts) {
        await this.setCapabilityValue('onoff', value);
        this.log('Tuya switch toggled to: ' + value);
    }

    async onUninit() {
        this.stopPolling();
        await super.onUninit();
    }
}

module.exports = TuyaSwitchDevice;
