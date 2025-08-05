'use strict';

const { ZigbeeDevice } = require('homey-unknown');

class ThermostatclusterDevice extends ZigbeeDevice {
    async onInit() {
        await super.onInit();
        
        this.log('thermostatcluster device initialized');
        this.log('Source: D:\Download\Compressed\com.tuya.zigbee-SDK3_2\com.tuya.zigbee-SDK3\node_modules\zigbee-clusters\lib\clusters\thermostat.js');
        this.log('Original file: thermostat.js');
        
        // Register capabilities
        
    }
    
    
}

module.exports = ThermostatclusterDevice;
