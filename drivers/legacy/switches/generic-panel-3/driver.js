'use strict';

const { ZigbeeDriver } = require('homey-meshdriver');

class genericPanel_3Driver extends ZigbeeDriver {
    async onMeshInit() {
        this.log('generic-panel-3 driver initialized');
    }
    
    async onPairListDevices() {
        return [];
    }
}

module.exports = genericPanel_3Driver;
