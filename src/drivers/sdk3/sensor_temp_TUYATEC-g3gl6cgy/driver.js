const { Device } = require('homey');
const { ZigBeeDriver } = require('homey-meshdriver'); module.exports = class extends ZigBeeDriver { onInit() { this.log('driver init'); } }; 

