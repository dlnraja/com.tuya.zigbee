#!/usr/bin/env node

const { ZigBeeDevice } = require('homey-zigbeedriver');

class TuyaBlind-205CoverDevice extends ZigBeeDevice {
    async onNodeInit({ zclNode }) {
        this.log('🔧 TuyaBlind-205CoverDevice initialisé (mode intelligent)');
        
        // Configuration intelligente des endpoints
        this.registerCapability('windowcoverings_state', 'genWindowCovering', {
            endpoint: 1,
            cluster: 'genWindowCovering',
            attribute: 'currentPositionLiftPercentage',
            reportParser: (value) => this.parseWindowcoveringsState(value)
        });
        this.registerCapability('windowcoverings_set', 'genBasic', {
            endpoint: 1,
            cluster: 'genBasic',
            attribute: 'onOff',
            reportParser: (value) => this.parseWindowcoveringsSet(value)
        });
        
        // Configuration des commandes
        this.registerCapabilityListener('windowcoverings_state', async (value) => {
            this.log('🎯 Commande windowcoverings_state:', value);
            await this.zclNode.endpoints[1].clusters.genWindowCovering.goToLiftPercentage(value);
        });
        this.registerCapabilityListener('windowcoverings_set', async (value) => {
            this.log('🎯 Commande windowcoverings_set:', value);
            await this.zclNode.endpoints[1].clusters.genBasic.toggle(value);
        });
        
        // Configuration des rapports intelligents
        await this.configureAttributeReporting([
            {
                endpointId: 1,
                clusterId: 'genWindowCovering',
                attributeId: 'currentPositionLiftPercentage',
                minInterval: 0,
                maxInterval: 300,
                reportableChange: 1
            },
            {
                endpointId: 1,
                clusterId: 'genWindowCovering',
                attributeId: 'currentPositionTiltPercentage',
                minInterval: 0,
                maxInterval: 300,
                reportableChange: 1
            }
        ]);
    }
    
    // Parsers intelligents
    parseWindowcoveringsState(value) {
        // Parser intelligent pour windowcoverings_state
        if (typeof value === 'number') return value;
        if (typeof value === 'boolean') return value ? 1 : 0;
        return 0;
    }
    parseWindowcoveringsSet(value) {
        // Parser intelligent pour windowcoverings_set
        if (typeof value === 'number') return value;
        if (typeof value === 'boolean') return value ? 1 : 0;
        return 0;
    }
    
    async onDeleted() {
        this.log('🗑️  TuyaBlind-205CoverDevice supprimé');
    }
}

module.exports = TuyaBlind-205CoverDevice;