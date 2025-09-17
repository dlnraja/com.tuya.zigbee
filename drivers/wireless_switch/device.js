'use strict';

const { ZigBeeDevice } = require('homey-zigbeedriver');

class WirelessSwitchDevice extends ZigBeeDevice {

    async onNodeInit() {
        await super.onNodeInit();
        
        this.log('Wireless Switch device initialized');
        
        
        // Register onoff capability
        this.registerCapability('onoff', 6, {
            endpoint: 1
        });
        
        await this.configureAttributeReporting([
            {
                endpointId: 1,
                cluster: {
                    
                id: 6,
                attributes: ['onOff']
            
                }
            }
        ]).catch(this.error);
    }

    
}

module.exports = WirelessSwitchDevice;