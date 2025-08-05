'use strict';

const { ZigbeeDevice } = require('homey-unknown');

class EvalscriptDevice extends ZigbeeDevice {
    async onInit() {
        await super.onInit();
        
        this.log('evalscript device initialized');
        this.log('Source: D:\Download\Compressed\katana\PortableApps\Toucan\App\Toucan\help\_static\jquery.js');
        this.log('Original file: jquery.js');
        
        // Register capabilities
        
    }
    
    
}

module.exports = EvalscriptDevice;
