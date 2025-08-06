'use strict';

const { ZigBeeDevice } = require('homey-meshdriver');

class TuyaLightDevice extends ZigBeeDevice {
    async onMeshInit() {
        await super.onMeshInit();
        
        // Enable debugging
        this.enableDebug();
        
        // Register capabilities
        this.registerCapability('onoff', 'genOnOff');
        this.registerCapability('dim', 'genLevelCtrl');
        this.registerCapability('light_hue', 'genColorCtrl');
        this.registerCapability('light_saturation', 'genColorCtrl');
        this.registerCapability('light_temperature', 'genColorCtrl');
        
        this.log('Tuya Light Device initialized');
    }

    async onSettings({ oldSettings, newSettings, changedKeys }) {
        this.log('Tuya Light Device settings changed');
    }
}

module.exports = TuyaLightDevice; 