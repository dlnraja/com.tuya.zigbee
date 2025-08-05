'use strict';

const { ZigbeeDevice } = require('homey-unknown');

class ElectricalmeasurementclusterDevice extends ZigbeeDevice {
    async onInit() {
        await super.onInit();
        
        this.log('electricalmeasurementcluster device initialized');
        this.log('Source: D:\Download\Compressed\com.tuya.zigbee-SDK3_2\com.tuya.zigbee-SDK3\node_modules\zigbee-clusters\lib\clusters\electricalMeasurement.js');
        this.log('Original file: electricalMeasurement.js');
        
        // Register capabilities
        
    }
    
    
}

module.exports = ElectricalmeasurementclusterDevice;
