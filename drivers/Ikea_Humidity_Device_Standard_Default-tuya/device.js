'use strict';

const { ZigBeeDevice } = require('homey-zigbeedriver');

module.exports = class Ikea_Humidity_Device_Standard_DefaulttuyaDevice extends ZigBeeDevice {
    async onNodeInit({ zclNode }) {
        this.log('🔌 Ikea_Humidity_Device_Standard_Default-tuya initialisé');
        
        // Enregistrer les capacités de base
        this.registerCapability('alarm_battery', 'genPowerCfg', {
            endpoint: 1,
            cluster: 'genPowerCfg',
            attribute: 'batteryPercentageRemaining',
            reportParser: (value) => this.parseBattery(value)
        });
        
        await this.setupReporting();
    }
    
    async setupReporting() {
        try {
            await this.configureAttributeReporting([
                {
                    endpointId: 1,
                    clusterId: 'genPowerCfg',
                    attributeId: 'batteryPercentageRemaining',
                    minInterval: 0,
                    maxInterval: 300,
                    reportableChange: 1
                }
            ]);
        } catch (error) {
            this.log('Erreur lors de la configuration des rapports:', error);
        }
    }
    
    parseBattery(value) {
        return Math.round(value / 2); // 0-100%
    }
};
