'use strict';

const { ZigbeeDriver } = require('homey-meshdriver');

class xiaomiAqaraMotion_10Driver extends ZigbeeDriver {
    async onMeshInit() {
        this.log('xiaomi-aqara-motion-10 driver initialized');
    }
    
    async onPairListDevices() {
        return [];
    }
}

module.exports = xiaomiAqaraMotion_10Driver;
