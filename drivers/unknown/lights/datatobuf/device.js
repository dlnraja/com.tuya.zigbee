'use strict';

const { ZigbeeDevice } = require('homey-unknown');

class DatatobufDevice extends ZigbeeDevice {
    async onInit() {
        await super.onInit();
        
        this.log('datatobuf device initialized');
        this.log('Source: D:\Download\Compressed\com.tuya.zigbee-SDK3_2\com.tuya.zigbee-SDK3\node_modules\@athombv\data-types\lib\DataTypes.js');
        this.log('Original file: DataTypes.js');
        
        // Register capabilities
        
    }
    
    
}

module.exports = DatatobufDevice;
