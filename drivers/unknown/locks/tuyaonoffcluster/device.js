'use strict';

const { ZigbeeDevice } = require('homey-unknown');

class TuyaonoffclusterDevice extends ZigbeeDevice {
    async onInit() {
        await super.onInit();
        
        this.log('tuyaonoffcluster device initialized');
        this.log('Source: D:\Download\Compressed\com.tuya.zigbee-SDK3_2\com.tuya.zigbee-SDK3\lib\TuyaOnOffCluster.js');
        this.log('Original file: TuyaOnOffCluster.js');
        
        // Register capabilities
        
    }
    
    
}

module.exports = TuyaonoffclusterDevice;
