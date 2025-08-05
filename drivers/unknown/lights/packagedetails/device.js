'use strict';

const { ZigbeeDevice } = require('homey-unknown');

class PackagedetailsDevice extends ZigbeeDevice {
    async onInit() {
        await super.onInit();
        
        this.log('packagedetails device initialized');
        this.log('Source: D:\Download\Compressed\elelabs-zigbee-ezsp-utility-master\elelabs-zigbee-ezsp-utility-master\venv\Lib\site-packages\pip\_internal\operations\check.py');
        this.log('Original file: check.py');
        
        // Register capabilities
        
    }
    
    
}

module.exports = PackagedetailsDevice;
