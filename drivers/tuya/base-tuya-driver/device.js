const { ZigbeeDevice } = require('homey-meshdriver');

class BaseTuyaDevice extends ZigbeeDevice {
    async onMeshInit() {
        await super.onMeshInit();
        this.log('Base Tuya device initialized');
    }
}

module.exports = BaseTuyaDevice;