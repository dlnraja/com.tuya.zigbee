'use strict';

const { ZigbeeDevice } = require('homey-unknown');

class ThatDevice extends ZigbeeDevice {
    async onInit() {
        await super.onInit();
        
        this.log('that device initialized');
        this.log('Source: D:\Download\Compressed\elelabs-zigbee-ezsp-utility-master\elelabs-zigbee-ezsp-utility-master\venv\Lib\site-packages\setuptools\_vendor\more_itertools\__pycache__\recipes.cpython-311.pyc');
        this.log('Original file: recipes.cpython-311.pyc');
        
        // Register capabilities
        
    }
    
    
}

module.exports = ThatDevice;
