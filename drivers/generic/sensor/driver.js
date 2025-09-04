#!/usr/bin/env node
'use strict';

#!/usr/bin/env node

const { ZigBeeDriver } = require('homey-zigbeedriver');

class GenericSensorDriver extends ZigBeeDriver {
    async onInit() {
        this.log('🚀 GenericSensorDriver initialisé (fallback intelligent)');
        
        // Configuration générique des capabilities
        this.registerCapability('measure_temperature', 'msTemperatureMeasurement');
        this.registerCapability('measure_humidity', 'msRelativeHumidity');
        this.registerCapability('measure_pressure', 'genBasic');
        this.registerCapability('measure_luminance', 'genBasic');
    }
}

module.exports = GenericSensorDriver;