#!/usr/bin/env node

const { ZigBeeDevice } = require('homey-zigbeedriver');

class GenericSensorDevice extends ZigBeeDevice {
    async onNodeInit({ zclNode }) {
        this.log('🔧 GenericSensorDevice initialisé (fallback intelligent)');
        
        // Configuration générique intelligente
        this.registerCapability('measure_temperature', 'msTemperatureMeasurement', {
            endpoint: 1,
            cluster: 'msTemperatureMeasurement',
            attribute: 'measuredValue',
            reportParser: (value) => this.parseMeasureTemperature(value)
        });
        this.registerCapability('measure_humidity', 'msRelativeHumidity', {
            endpoint: 1,
            cluster: 'msRelativeHumidity',
            attribute: 'measuredValue',
            reportParser: (value) => this.parseMeasureHumidity(value)
        });
        this.registerCapability('measure_pressure', 'genBasic', {
            endpoint: 1,
            cluster: 'genBasic',
            attribute: 'onOff',
            reportParser: (value) => this.parseMeasurePressure(value)
        });
        this.registerCapability('measure_luminance', 'genBasic', {
            endpoint: 1,
            cluster: 'genBasic',
            attribute: 'onOff',
            reportParser: (value) => this.parseMeasureLuminance(value)
        });
        
        // Configuration des rapports génériques
        await this.configureAttributeReporting([
            {
                endpointId: 1,
                clusterId: 'msTemperatureMeasurement',
                attributeId: 'measuredValue',
                minInterval: 0,
                maxInterval: 300,
                reportableChange: 1
            },
            {
                endpointId: 1,
                clusterId: 'msRelativeHumidity',
                attributeId: 'measuredValue',
                minInterval: 0,
                maxInterval: 300,
                reportableChange: 1
            },
            {
                endpointId: 1,
                clusterId: 'msPressureMeasurement',
                attributeId: 'measuredValue',
                minInterval: 0,
                maxInterval: 300,
                reportableChange: 1
            },
            {
                endpointId: 1,
                clusterId: 'msIlluminanceMeasurement',
                attributeId: 'measuredValue',
                minInterval: 0,
                maxInterval: 300,
                reportableChange: 1
            }
        ]);
    }
    
    // Parsers génériques intelligents
    parseMeasureTemperature(value) {
        // Parser générique intelligent pour measure_temperature
        if (typeof value === 'number') return value;
        if (typeof value === 'boolean') return value ? 1 : 0;
        return 0;
    }
    parseMeasureHumidity(value) {
        // Parser générique intelligent pour measure_humidity
        if (typeof value === 'number') return value;
        if (typeof value === 'boolean') return value ? 1 : 0;
        return 0;
    }
    parseMeasurePressure(value) {
        // Parser générique intelligent pour measure_pressure
        if (typeof value === 'number') return value;
        if (typeof value === 'boolean') return value ? 1 : 0;
        return 0;
    }
    parseMeasureLuminance(value) {
        // Parser générique intelligent pour measure_luminance
        if (typeof value === 'number') return value;
        if (typeof value === 'boolean') return value ? 1 : 0;
        return 0;
    }
}

module.exports = GenericSensorDevice;