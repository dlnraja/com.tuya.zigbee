'use strict';

const { ZigBeeDevice } = require('homey-meshdriver');

class TuyaSwitchDevice extends ZigBeeDevice {
    async onMeshInit() {
        await super.onMeshInit();
        
        // Enable debugging
        this.enableDebug();
        
        // Register capabilities
        this.registerCapability('onoff', 'genOnOff');
        
        // Handle device specific logic
        this.log('Tuya Switch Device initialized');
    }

    async onSettings({ oldSettings, newSettings, changedKeys }) {
        this.log('Tuya Switch Device settings changed');
    }
}

module.exports = TuyaSwitchDevice;