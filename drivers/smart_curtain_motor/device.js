'use strict';

const { ZigBeeDevice } = require('homey-zigbeedriver');

class SmartCurtainMotorDevice extends ZigBeeDevice {

    async onNodeInit() {
        await super.onNodeInit();
        
        this.log('Smart Curtain Motor device initialized');
        
        
        // Register window coverings capabilities
        this.registerCapability('windowcoverings_state', 258);
        this.registerCapability('windowcoverings_set', 258);
        
        await this.configureAttributeReporting([
            {
                endpointId: 1,
                cluster: {
                    
                id: 258,
                attributes: ['currentPositionLiftPercentage']
            
                }
            }
        ]).catch(this.error);
    }

    
}

module.exports = SmartCurtainMotorDevice;