const { ZigbeeDevice } = require('homey-meshdriver');

class Zigbee2mqtt-devices-device-2Device extends ZigbeeDevice {
    async onInit() {
        await super.onInit();
        this.startPolling();
    }

    async onUninit() {
        this.stopPolling();
        await super.onUninit();
    }
}

module.exports = Zigbee2mqtt-devices-device-2Device;