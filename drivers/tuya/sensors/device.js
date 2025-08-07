'use strict';

const { ZigBeeDevice } = require('homey-meshdriver');

class TuyaSensorDevice extends ZigBeeDevice {
    async onMeshInit() {
        await super.onMeshInit();
        
        // Enable debugging
        this.enableDebug();
        
        // Register capabilities based on device type
        if (this.hasCapability('measure_temperature')) {
            this.registerCapability('measure_temperature', 'msTemperatureMeasurement');
        }
        
        if (this.hasCapability('measure_humidity')) {
            this.registerCapability('measure_humidity', 'msRelativeHumidity');
        }
        
        if (this.hasCapability('measure_pressure')) {
            this.registerCapability('measure_pressure', 'msPressureMeasurement');
        }
        
        this.log('Tuya Sensor Device initialized');
    }

    async onSettings({ oldSettings, newSettings, changedKeys }) {
        this.log('Tuya Sensor Device settings changed');
    }
}

module.exports = TuyaSensorDevice;