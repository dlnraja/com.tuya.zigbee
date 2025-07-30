const { ZigbeeDevice } = require('homey-meshdriver');

class Forum-homey-community-device-2Device extends ZigbeeDevice {
    async onInit() {
        await super.onInit();
        this.startPolling();
    }

    async onUninit() {
        this.stopPolling();
        await super.onUninit();
    }
}

module.exports = Forum-homey-community-device-2Device;