#!/usr/bin/env node

const { ZigBeeDevice } = require('homey-zigbeedriver');

class Ts0601SwitchDevice extends ZigBeeDevice {
    async onNodeInit({ zclNode }) {
        this.log('🔧 Ts0601SwitchDevice initialisé');
        
        // Configuration des endpoints
        this.registerCapability('onoff', 'genOnOff', {
            endpoint: 1,
            cluster: 'genOnOff',
            attribute: 'onOff',
            reportParser: (value) => value === 1
        });
        
        // Configuration des commandes
        this.registerCapabilityListener('onoff', async (value) => {
            this.log('🎯 Commande onoff:', value);
            await this.zclNode.endpoints[1].clusters.genOnOff.toggle();
        });
        
        // Configuration des rapports
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
    
    async onDeleted() {
        this.log('🗑️  Ts0601SwitchDevice supprimé');
    }
}

module.exports = Ts0601SwitchDevice;