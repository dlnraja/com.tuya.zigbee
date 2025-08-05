'use strict';

const { ZigbeeDevice } = require('homey-unknown');

class Install_egg_infoDevice extends ZigbeeDevice {
    async onInit() {
        await super.onInit();
        
        this.log('install_egg_info device initialized');
        this.log('Source: D:\Download\Compressed\elelabs-zigbee-ezsp-utility-master\elelabs-zigbee-ezsp-utility-master\venv\Lib\site-packages\setuptools\command\install_egg_info.py');
        this.log('Original file: install_egg_info.py');
        
        // Register capabilities
        
    }
    
    
}

module.exports = Install_egg_infoDevice;
