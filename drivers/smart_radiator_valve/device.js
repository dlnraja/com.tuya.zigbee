'use strict';

const { ZigBeeDevice } = require('homey-zigbeedriver');

class SmartRadiatorValveDevice extends ZigBeeDevice {

    async onNodeInit() {
        await super.onNodeInit();
        
        this.log('Smart Radiator Valve device initialized');
        
        
        // Register temperature capabilities
        this.registerCapability('target_temperature', 513);
        this.registerCapability('measure_temperature', 1026);
        
        await this.configureAttributeReporting([
            {
                endpointId: 1,
                cluster: {
                    
                id: 513,
                attributes: ['occupiedCoolingSetpoint', 'occupiedHeatingSetpoint']
            
                }
            }
        ]).catch(this.error);
    }

    
}

module.exports = SmartRadiatorValveDevice;