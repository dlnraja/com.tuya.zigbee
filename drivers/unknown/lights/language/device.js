'use strict';

const { ZigbeeDevice } = require('homey-unknown');

class LanguageDevice extends ZigbeeDevice {
    async onInit() {
        await super.onInit();
        
        this.log('language device initialized');
        this.log('Source: D:\Download\Compressed\elelabs-zigbee-ezsp-utility-master\elelabs-zigbee-ezsp-utility-master\venv\Lib\site-packages\pip\_vendor\chardet\metadata\languages.py');
        this.log('Original file: languages.py');
        
        // Register capabilities
        
    }
    
    
}

module.exports = LanguageDevice;
