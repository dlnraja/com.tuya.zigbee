'use strict';

const { ZigbeeDevice } = require('homey-unknown');

class _parseresultswithoffsetDevice extends ZigbeeDevice {
    async onInit() {
        await super.onInit();
        
        this.log('_parseresultswithoffset device initialized');
        this.log('Source: D:\Download\Compressed\elelabs-zigbee-ezsp-utility-master\elelabs-zigbee-ezsp-utility-master\venv\Lib\site-packages\pip\_vendor\pyparsing\results.py');
        this.log('Original file: results.py');
        
        // Register capabilities
        
    }
    
    
}

module.exports = _parseresultswithoffsetDevice;
