'use strict';

const { ZigBeeDriver } = require('homey-meshdriver');

class powerstripDriver extends ZigBeeDriver {
    async onMeshInit() {
        this.log('powerstripDriver has been initialized');
    }
}

module.exports = powerstripDriver;
