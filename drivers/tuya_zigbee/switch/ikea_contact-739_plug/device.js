#!/usr/bin/env node
'use strict';

const Homey = require('homey');
const { ZigBeeDevice } = require('homey-zigbeedriver');
const { ZBVer } = require('../../../lib/zb-verbose');

class PlugDevice extends ZigBeeDevice {
    async onNodeInit() {
        this.log('Device initialized');
        await super.onNodeInit();
        this.registerCapability('onoff', 'genOnOff');
        
        // Configuration intelligente des endpoints
        this.registerCapability('onoff', 'genOnOff', {
            endpoint: 1,
            cluster: 'genOnOff',
            attribute: 'onOff',
            reportParser: (value) => this.parseOnoff(value)
        });
        
        // Configuration des commandes
        this.registerCapabilityListener('onoff', async (value) => {
            this.log('🎯 Commande onoff:', value);
            await this.zclNode.endpoints[1].clusters.genOnOff.toggle(value);
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
    
    async onDeleted() {
        this.log('Device removed');
    }
}

module.exports = PlugDevice;