'use strict';

const { ZigbeeDevice } = require('homey-unknown');

class TextfileDevice extends ZigbeeDevice {
    async onInit() {
        await super.onInit();
        
        this.log('textfile device initialized');
        this.log('Source: D:\Download\Compressed\elelabs-zigbee-ezsp-utility-master\elelabs-zigbee-ezsp-utility-master\venv\Lib\site-packages\setuptools\_distutils\text_file.py');
        this.log('Original file: text_file.py');
        
        // Register capabilities
        
    }
    
    
}

module.exports = TextfileDevice;
