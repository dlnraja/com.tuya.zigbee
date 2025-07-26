const { Device } = require('homey');
'use strict'; const { ZigBeeDriver } = require('homey-meshdriver'); class humiditysensorDriver extends ZigBeeDriver { async onMeshInit() { this.log('humiditysensorDriver has been initialized'); } } module.exports = humiditysensorDriver; 

