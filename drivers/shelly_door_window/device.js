'use strict';
const { ZigBeeDevice } = require('homey-zigbeedriver');
class Device extends ZigBeeDevice { async onNodeInit({ zclNode }) { this.log('shelly_door_window device init'); } }
module.exports = Device;
