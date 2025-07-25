'use strict';

const { ZigBeeDriver } = require('homey-meshdriver');

class curtainswitchDriver extends ZigBeeDriver {
    async onMeshInit() {
        this.log('curtainswitchDriver has been initialized');
    }
}

module.exports = curtainswitchDriver;
