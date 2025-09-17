'use strict';

const { ZigBeeDevice } = require('homey-zigbeedriver');

class AirQualityMonitorDevice extends ZigBeeDevice {

    async onNodeInit() {
        await super.onNodeInit();
        
        this.log('Air Quality Monitor device initialized');
        
        
        // Register temperature capability
        this.registerCapability('measure_temperature', 1026);
        
        // Register humidity capability  
        this.registerCapability('measure_humidity', 1029);
        
        // Register battery alarm
        this.registerCapability('alarm_battery', 1);
        
        await this.configureAttributeReporting([
            {
                endpointId: 1,
                cluster: {
                    
                id: 1026,
                attributes: ['measuredValue']
            
                }
            }
        ]).catch(this.error);
    }

    
}

module.exports = AirQualityMonitorDevice;