'use strict';

const { ZigbeeDevice } = require('homey-unknown');

class PipimportredirectingfinderDevice extends ZigbeeDevice {
    async onInit() {
        await super.onInit();
        
        this.log('pipimportredirectingfinder device initialized');
        this.log('Source: D:\Download\Compressed\elelabs-zigbee-ezsp-utility-master\elelabs-zigbee-ezsp-utility-master\venv\Lib\site-packages\pip\__pip-runner__.py');
        this.log('Original file: __pip-runner__.py');
        
        // Register capabilities
        
    }
    
    
}

module.exports = PipimportredirectingfinderDevice;
