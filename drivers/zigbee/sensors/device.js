'use strict';

const { ZigBeeDevice } = require('homey-meshdriver');

class ZigbeeSensorDevice extends ZigBeeDevice {
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
        
        if (this.hasCapability('measure_illuminance')) {
            this.registerCapability('measure_illuminance', 'msIlluminanceMeasurement');
        }
        
        this.log('Zigbee Sensor Device initialized');
    }

    async onSettings({ oldSettings, newSettings, changedKeys }) {
        this.log('Zigbee Sensor Device settings changed');
    }
}

module.exports = ZigbeeSensorDevice; 