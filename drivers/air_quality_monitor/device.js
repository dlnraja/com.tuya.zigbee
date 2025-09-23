const { ZigBeeDevice } = require('homey-zigbeedriver');
class AirQualityDevice extends ZigBeeDevice {
    async onNodeInit() {
        this.registerCapability('measure_pm25', 'CLUSTER_TUYA_SPECIFIC');
    }
}
module.exports = AirQualityDevice;