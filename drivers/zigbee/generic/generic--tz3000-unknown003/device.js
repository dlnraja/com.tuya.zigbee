'use strict';

const { ZigbeeDevice } = require('homey-meshdriver');

class GenericDevice extends ZigbeeDevice {
    async onMeshInit() {
        await super.onMeshInit();
        
        // Log pour debug
        this.log('Generic device initialized:', this.getData());
        
        // Configuration des capacités
        
        // Configuration température
        if (this.hasCapability('measure_temperature')) {
            this.registerCapability('measure_temperature', 'msTemperatureMeasurement');
        }
        // Configuration humidité
        if (this.hasCapability('measure_humidity')) {
            this.registerCapability('measure_humidity', 'msRelativeHumidity');
        }
    }
}

module.exports = GenericDevice;