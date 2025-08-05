'use strict';

const { ZigbeeDevice } = require('homey-unknown');

class DefinitionsDevice extends ZigbeeDevice {
    async onInit() {
        await super.onInit();
        
        this.log('definitions device initialized');
        this.log('Source: D:\Download\Compressed\x86_64-pc-windows-gnu\tool_config_files\build-repo-builds\plugins\MacHyperVSupport.json');
        this.log('Original file: MacHyperVSupport.json');
        
        // Register capabilities
        
    }
    
    
}

module.exports = DefinitionsDevice;
