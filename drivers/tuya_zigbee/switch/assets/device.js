#!/usr/bin/env node
'use strict';

#!/usr/bin/env node

const { ZigBeeDevice } = require('homey-zigbeedriver');
const attachZBVerbose = require('../../..//lib/zb-verbose');

class AssetsDevice extends ZigBeeDevice {
    async onNodeInit({ zclNode }) {
        this.log('🔧 AssetsDevice initialisé (mode intelligent)');
        
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
        this.log('🗑️  AssetsDevice supprimé');
    }
}

module.exports = AssetsDevice;