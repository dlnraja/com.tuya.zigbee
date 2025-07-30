'use strict';

const { ZigbeeDevice } = require('homey-meshdriver');

class GenericDevice extends ZigbeeDevice {
    async onMeshInit() {
        await super.onMeshInit();
        
        // Log pour debug
        this.log('Generic device initialized:', this.getData());
        
        // Configuration des capacités
        
        // Configuration onoff
        if (this.hasCapability('onoff')) {
            this.registerCapability('onoff', 'genOnOff');
        }
        // Configuration dim
        if (this.hasCapability('dim')) {
            this.registerCapability('dim', 'genLevelCtrl');
        }
    }
}

module.exports = GenericDevice;