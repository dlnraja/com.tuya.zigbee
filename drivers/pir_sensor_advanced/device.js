'use strict';
const { ZigBeeDevice } = require('homey-zigbeedriver');
class Device extends ZigBeeDevice {
    async onNodeInit({ zclNode }) {
        await super.onNodeInit({ zclNode });
        this.registerCapability('onoff', 'genOnOff');
    }
}
module.exports = Device;