'use strict';

const { ZigbeeDevice } = require('homey-unknown');

class LatexformatterDevice extends ZigbeeDevice {
    async onInit() {
        await super.onInit();
        
        this.log('latexformatter device initialized');
        this.log('Source: D:\Download\Compressed\elelabs-zigbee-ezsp-utility-master\elelabs-zigbee-ezsp-utility-master\venv\Lib\site-packages\pip\_vendor\pygments\formatters\latex.py');
        this.log('Original file: latex.py');
        
        // Register capabilities
        
    }
    
    
}

module.exports = LatexformatterDevice;
