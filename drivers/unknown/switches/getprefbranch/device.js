'use strict';

const { ZigbeeDevice } = require('homey-unknown');

class GetprefbranchDevice extends ZigbeeDevice {
    async onInit() {
        await super.onInit();
        
        this.log('getprefbranch device initialized');
        this.log('Source: D:\Download\Compressed\katana\PortableApps\OpenOfficePortable\App\openoffice\program\defaults\autoconfig\prefcalls.js');
        this.log('Original file: prefcalls.js');
        
        // Register capabilities
        
    }
    
    
}

module.exports = GetprefbranchDevice;
