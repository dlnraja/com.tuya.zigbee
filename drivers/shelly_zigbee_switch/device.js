'use strict';
const { ZigBeeDevice } = require('homey-zigbeedriver');
class Device extends ZigBeeDevice { async onNodeInit({ zclNode }) { this.log('shelly_zigbee_switch device init'); } }
module.exports = Device;
