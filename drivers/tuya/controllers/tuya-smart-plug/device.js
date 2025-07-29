const { ZigbeeDevice } = require('homey-zigbeedriver');

class TuyaSmartPlugDevice extends ZigbeeDevice {
    async onInit() {
        await super.onInit();
        
        // Register capabilities
        this.registerCapabilityListener('onoff', this.onCapabilityOnoff.bind(this));
        
        // Start polling
        this.startPolling();
    }

    async onCapabilityOnoff(value, opts) {
        await this.setCapabilityValue('onoff', value);
        this.log('Tuya smart plug toggled to: ' + value);
    }

    async onPowerChange(power) {
        await this.setCapabilityValue('measure_power', power);
        this.log('Power changed to: ' + power + 'W');
    }

    async onUninit() {
        this.stopPolling();
        await super.onUninit();
    }
}

module.exports = TuyaSmartPlugDevice;
