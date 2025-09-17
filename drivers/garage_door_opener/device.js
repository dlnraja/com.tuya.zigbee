'use strict';

const { ZigBeeDevice } = require('homey-zigbeedriver');

class GarageDoorOpenerDevice extends ZigBeeDevice {

    async onNodeInit() {
        await super.onNodeInit();
        
        this.log('Garage Door Opener device initialized');
        
        
        // Register lock capability
        this.registerCapability('locked', 257);
        
        // Register battery alarm
        this.registerCapability('alarm_battery', 1);
        
        await this.configureAttributeReporting([
            {
                endpointId: 1,
                cluster: {
                    
                id: 257,
                attributes: ['lockState']
            
                }
            }
        ]).catch(this.error);
    }

    
}

module.exports = GarageDoorOpenerDevice;