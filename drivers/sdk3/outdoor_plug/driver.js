const { Device } = require('homey');
'use strict'; const { ZigBeeDriver } = require('homey-meshdriver'); class outdoorplugDriver extends ZigBeeDriver { async onMeshInit() { this.log('outdoorplugDriver has been initialized'); } } module.exports = outdoorplugDriver; 


