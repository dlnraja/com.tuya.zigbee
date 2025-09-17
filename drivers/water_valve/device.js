'use strict';

const { ZigBeeDevice } = require('homey-zigbeedriver');

class WaterValveDevice extends ZigBeeDevice {

    async onNodeInit() {
        await super.onNodeInit();
        
        this.log('Water Valve device initialized');
        
        
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

module.exports = WaterValveDevice;