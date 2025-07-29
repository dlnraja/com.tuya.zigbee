const { ZigbeeDevice } = require('homey-zigbeedriver');

class TuyaLightDevice extends ZigbeeDevice {
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
        this.log('Tuya light toggled to: ' + value);
    }

    async onCapabilityDim(value, opts) {
        await this.setCapabilityValue('dim', value);
        this.log('Tuya light dimmed to: ' + value);
    }

    async onUninit() {
        this.stopPolling();
        await super.onUninit();
    }
}

module.exports = TuyaLightDevice;
