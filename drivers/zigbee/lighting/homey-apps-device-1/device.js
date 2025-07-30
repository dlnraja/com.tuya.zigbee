const { ZigbeeDevice } = require('homey-meshdriver');

class Homey-apps-device-1Device extends ZigbeeDevice {
    async onInit() {
        await super.onInit();
        this.startPolling();
    }

    async onUninit() {
        this.stopPolling();
        await super.onUninit();
    }
}

module.exports = Homey-apps-device-1Device;