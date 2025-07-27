const { Device } = require('homey');
'use strict'; const { ZigBeeDriver } = require('homey-meshdriver'); class floodsensorDriver extends ZigBeeDriver { async onMeshInit() { this.log('floodsensorDriver has been initialized'); } } module.exports = floodsensorDriver; 

