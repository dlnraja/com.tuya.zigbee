'use strict';

const { ZigBeeDevice } = require('homey-meshdriver');

class TuyaPlugDevice extends ZigBeeDevice {
    async onMeshInit() {
        await super.onMeshInit();
        
        // Enable debugging
        this.enableDebug();
        
        // Register capabilities
        this.registerCapability('onoff', 'genOnOff');
        this.registerCapability('measure_power', 'genPowerCfg');
        this.registerCapability('measure_voltage', 'genPowerCfg');
        this.registerCapability('measure_current', 'genPowerCfg');
        
        this.log('Tuya Plug Device initialized');
    }

    async onSettings({ oldSettings, newSettings, changedKeys }) {
        this.log('Tuya Plug Device settings changed');
    }
}

module.exports = TuyaPlugDevice; 