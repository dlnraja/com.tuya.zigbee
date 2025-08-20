'use strict';

const { ZigBeeDevice } = require('homey-zigbeedriver');

class PlugTuyaUniversalDevice extends ZigBeeDevice {
    async onNodeInit({ zclNode }) {
        this.log('🔌 PlugTuyaUniversalDevice initialisé');
        this.registerCapability('onoff', 'genOnOff', {
            endpoint: 1,
            cluster: 'genOnOff',
            attribute: 'onOff',
            reportParser: (value) => this.parseOnoff(value)
        });
        await this.setupReporting();
    }

    async setupReporting() {
        try {
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
        } catch (error) {
            this.log('Erreur lors de la configuration des rapports:', error);
        }
    }

    parseOnoff(value) {
        if (typeof value === 'number') return value === 1;
        if (typeof value === 'boolean') return value;
        return false;
    }
}

module.exports = PlugTuyaUniversalDevice;
