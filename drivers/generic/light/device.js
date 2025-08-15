#!/usr/bin/env node

const { ZigBeeDevice } = require('homey-zigbeedriver');
const attachZBVerbose = require('../..//lib/zb-verbose');

class GenericLightDevice extends ZigBeeDevice {
    async onNodeInit({ zclNode }) {
        this.log('🔧 GenericLightDevice initialisé (fallback intelligent)');
        
        // Configuration générique intelligente
        this.registerCapability('onoff', 'genOnOff', {
            endpoint: 1,
            cluster: 'genOnOff',
            attribute: 'onOff',
            reportParser: (value) => this.parseOnoff(value)
        });
        this.registerCapability('dim', 'genLevelCtrl', {
            endpoint: 1,
            cluster: 'genLevelCtrl',
            attribute: 'currentLevel',
            reportParser: (value) => this.parseDim(value)
        });
        this.registerCapability('light_temperature', 'lightingColorCtrl', {
            endpoint: 1,
            cluster: 'lightingColorCtrl',
            attribute: 'colorTemperature',
            reportParser: (value) => this.parseLightTemperature(value)
        });
        this.registerCapability('light_mode', 'genBasic', {
            endpoint: 1,
            cluster: 'genBasic',
            attribute: 'onOff',
            reportParser: (value) => this.parseLightMode(value)
        });
        
        // Configuration des rapports génériques
        await this.configureAttributeReporting([
            {
                endpointId: 1,
                clusterId: 'genOnOff',
                attributeId: 'onOff',
                minInterval: 0,
                maxInterval: 300,
                reportableChange: 1
            },
            {
                endpointId: 1,
                clusterId: 'genLevelCtrl',
                attributeId: 'currentLevel',
                minInterval: 0,
                maxInterval: 300,
                reportableChange: 1
            },
            {
                endpointId: 1,
                clusterId: 'lightingColorCtrl',
                attributeId: 'currentHue',
                minInterval: 0,
                maxInterval: 300,
                reportableChange: 1
            },
            {
                endpointId: 1,
                clusterId: 'lightingColorCtrl',
                attributeId: 'currentSaturation',
                minInterval: 0,
                maxInterval: 300,
                reportableChange: 1
            },
            {
                endpointId: 1,
                clusterId: 'lightingColorCtrl',
                attributeId: 'colorTemperature',
                minInterval: 0,
                maxInterval: 300,
                reportableChange: 1
            }
        ]);
    }
    
    // Parsers génériques intelligents
    parseOnoff(value) {
        // Parser générique intelligent pour onoff
        if (typeof value === 'number') return value;
        if (typeof value === 'boolean') return value ? 1 : 0;
        return 0;
    }
    parseDim(value) {
        // Parser générique intelligent pour dim
        if (typeof value === 'number') return value;
        if (typeof value === 'boolean') return value ? 1 : 0;
        return 0;
    }
    parseLightTemperature(value) {
        // Parser générique intelligent pour light_temperature
        if (typeof value === 'number') return value;
        if (typeof value === 'boolean') return value ? 1 : 0;
        return 0;
    }
    parseLightMode(value) {
        // Parser générique intelligent pour light_mode
        if (typeof value === 'number') return value;
        if (typeof value === 'boolean') return value ? 1 : 0;
        return 0;
    }
}

module.exports = GenericLightDevice;