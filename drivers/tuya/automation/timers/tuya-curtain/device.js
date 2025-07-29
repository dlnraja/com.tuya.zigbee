const { ZigbeeDevice } = require('homey-zigbeedriver');

class TuyaCurtainDevice extends ZigbeeDevice {
    async onInit() {
        try {
        await super.onInit();
        
        // Register capabilities
        this.registerCapabilityListener('windowcoverings_state', this.onCapabilityWindowCoveringsState.bind(this));
        this.registerCapabilityListener('windowcoverings_set', this.onCapabilityWindowCoveringsSet.bind(this));
        
        // Start polling
        this.startPolling();
    }

    async onCapabilityWindowCoveringsState(value, opts) {
        await this.setCapabilityValue('windowcoverings_state', value);
        this.log('Tuya curtain state changed to: ' + value);
    }

    async onCapabilityWindowCoveringsSet(value, opts) {
        await this.setCapabilityValue('windowcoverings_set', value);
        this.log('Tuya curtain set to: ' + value);
    }

    async onUninit() {
        this.stopPolling();
        await super.onUninit();
    }
}

module.exports = TuyaCurtainDevice;
