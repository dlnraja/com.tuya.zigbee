'use strict';

const { ZigBeeDevice } = require('homey-meshdriver');

class ZigbeeOnOffDevice extends ZigBeeDevice {
    async onMeshInit() {
        await super.onMeshInit();
        
        // Enable debugging
        this.enableDebug();
        
        // Register capabilities
        this.registerCapability('onoff', 'genOnOff');
        
        this.log('Zigbee OnOff Device initialized');
    }

    async onSettings({ oldSettings, newSettings, changedKeys }) {
        this.log('Zigbee OnOff Device settings changed');
    }
}

module.exports = ZigbeeOnOffDevice; 