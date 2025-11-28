'use strict';
const { ZigBeeDevice } = require('homey-zigbeedriver');
class Device extends ZigBeeDevice { async onNodeInit({ zclNode }) { this.log('philips_hue_dimmer device init'); } }
module.exports = Device;
