'use strict';

const { ZigBeeDevice } = require('homey-meshdriver');

class TuyaThermostatDevice extends ZigBeeDevice {
    async onMeshInit() {
        await super.onMeshInit();
        
        // Enable debugging
        this.enableDebug();
        
        // Register capabilities
        this.registerCapability('target_temperature', 'hvacThermostat');
        this.registerCapability('measure_temperature', 'hvacThermostat');
        this.registerCapability('measure_humidity', 'msRelativeHumidity');
        
        this.log('Tuya Thermostat Device initialized');
    }

    async onSettings({ oldSettings, newSettings, changedKeys }) {
        this.log('Tuya Thermostat Device settings changed');
    }
}

module.exports = TuyaThermostatDevice;