'use strict';

const { ZigBeeDriver } = require('homey-meshdriver');

class alarmsensorDriver extends ZigBeeDriver {
    async onMeshInit() {
        this.log('alarmsensorDriver has been initialized');
    }
}

module.exports = alarmsensorDriver;
