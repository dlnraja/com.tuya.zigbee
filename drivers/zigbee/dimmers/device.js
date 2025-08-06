'use strict';

const { ZigBeeDevice } = require('homey-meshdriver');

class ZigbeeDimmerDevice extends ZigBeeDevice {
    async onMeshInit() {
        await super.onMeshInit();
        
        // Enable debugging
        this.enableDebug();
        
        // Register capabilities
        this.registerCapability('onoff', 'genOnOff');
        this.registerCapability('dim', 'genLevelCtrl');
        
        this.log('Zigbee Dimmer Device initialized');
    }

    async onSettings({ oldSettings, newSettings, changedKeys }) {
        this.log('Zigbee Dimmer Device settings changed');
    }
}

module.exports = ZigbeeDimmerDevice; 