const { ZigbeeDevice } = require('homey-zigbeedriver');

class TuyaContactSensorDevice extends ZigbeeDevice {
    async onInit() {
        await super.onInit();
        
        // Start polling
        this.startPolling();
    }

    async onContactChange(contact) {
        await this.setCapabilityValue('alarm_contact', contact);
        this.log('Contact changed to: ' + contact);
    }

    async onUninit() {
        this.stopPolling();
        await super.onUninit();
    }
}

module.exports = TuyaContactSensorDevice;
