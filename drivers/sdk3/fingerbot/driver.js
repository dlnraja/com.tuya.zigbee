const { Device } = require('homey');
'use strict'; const { ZigBeeDriver } = require('homey-meshdriver'); class fingerbotDriver extends ZigBeeDriver { async onMeshInit() { this.log('fingerbotDriver has been initialized'); } } module.exports = fingerbotDriver; 

