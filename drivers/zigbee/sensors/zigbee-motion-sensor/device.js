const { ZigbeeDevice } = require('homey-zigbeedriver');

class ZigbeeMotionSensorDevice extends ZigbeeDevice {
    async onInit() {
        await super.onInit();
        
        // Start polling
        this.startPolling();
    }

    async onMotionDetected() {
        await this.setCapabilityValue('alarm_motion', true);
        this.log('Motion detected');
    }

    async onUninit() {
        this.stopPolling();
        await super.onUninit();
    }
}

module.exports = ZigbeeMotionSensorDevice;
