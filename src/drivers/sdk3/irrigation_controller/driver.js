const { Device } = require('homey');
'use strict'; const { ZigBeeDriver } = require('homey-meshdriver'); class irrigationcontrollerDriver extends ZigBeeDriver { async onMeshInit() { this.log('irrigationcontrollerDriver has been initialized'); } } module.exports = irrigationcontrollerDriver; 

