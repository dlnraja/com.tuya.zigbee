#!/usr/bin/env node

const { ZigBeeDevice } = require('homey-zigbeedriver');
const attachZBVerbose = require('../../..//lib/zb-verbose');

class AqaraBulb423Device extends ZigBeeDevice {
    async onNodeInit({ zclNode }) {
        this.log('🔧 AqaraBulb423Device initialisé (mode intelligent)');
        
        // Configuration intelligente des endpoints
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
        
        // Configuration des commandes
        this.registerCapabilityListener('onoff', async (value) => {
            this.log('🎯 Commande onoff:', value);
            await this.zclNode.endpoints[1].clusters.genOnOff.toggle(value);
        });
        this.registerCapabilityListener('dim', async (value) => {
            this.log('🎯 Commande dim:', value);
            await this.zclNode.endpoints[1].clusters.genLevelCtrl.moveToLevel(value);
        });
        this.registerCapabilityListener('light_temperature', async (value) => {
            this.log('🎯 Commande light_temperature:', value);
            await this.zclNode.endpoints[1].clusters.lightingColorCtrl.moveToColorTemperature(value);
        });
        this.registerCapabilityListener('light_mode', async (value) => {
            this.log('🎯 Commande light_mode:', value);
            await this.zclNode.endpoints[1].clusters.genBasic.toggle(value);
        });
        
        // Configuration des rapports intelligents
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
    
    // Parsers intelligents
    parseOnoff(value) {
        // Parser intelligent pour onoff
        if (typeof value === 'number') return value;
        if (typeof value === 'boolean') return value ? 1 : 0;
        return 0;
    }
    parseDim(value) {
        // Parser intelligent pour dim
        if (typeof value === 'number') return value;
        if (typeof value === 'boolean') return value ? 1 : 0;
        return 0;
    }
    parseLightTemperature(value) {
        // Parser intelligent pour light_temperature
        if (typeof value === 'number') return value;
        if (typeof value === 'boolean') return value ? 1 : 0;
        return 0;
    }
    parseLightMode(value) {
        // Parser intelligent pour light_mode
        if (typeof value === 'number') return value;
        if (typeof value === 'boolean') return value ? 1 : 0;
        return 0;
    }
    
    async onDeleted() {
        this.log('🗑️  AqaraBulb423Device supprimé');
    }
}

module.exports = AqaraBulb423Device;