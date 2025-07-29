const { TuyaDevice } = require('homey-tuya');

class TuyaMotionSensorCommunity extends TuyaDevice {
    async onInit() {
        await super.onInit();
        
        this.log('Tuya Motion Sensor Community initialized');
        
        // Motion detection
        this.registerCapabilityListener('alarm_motion', async (value) => {
            await this.setCapabilityValue('alarm_motion', value);
        });
        
        // Temperature measurement
        this.registerCapabilityListener('measure_temperature', async (value) => {
            await this.setCapabilityValue('measure_temperature', value);
        });
        
        // Humidity measurement
        this.registerCapabilityListener('measure_humidity', async (value) => {
            await this.setCapabilityValue('measure_humidity', value);
        });
    }
    
    async onUninit() {
        this.log('Tuya Motion Sensor Community uninitialized');
    }
}

module.exports = TuyaMotionSensorCommunity;