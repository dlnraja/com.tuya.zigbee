'use strict';const { ZigbeeDevice } = require('homey-meshdriver');class Device extends ZigbeeDevice { async onInit() { await super.onInit(); this.log(' device initialized'); this.log('Source: D:\Download\Compressed\com.tuya.zigbee-SDK3_2\com.tuya.zigbee-SDK3\drivers\water_detector\driver.compose.json'); this.log('Original file: driver.compose.json'); // Register capabilities } 
    async onMeshInit() {
        this.log('tuya/sensors/sensors_tuya_sensors - Device initialized');
        
        // Register capabilities
        await this.registerCapability('onoff', 'genOnOff');
        
        this.log('✅ tuya/sensors/sensors_tuya_sensors - Device ready');
    }
}

module.exports = Device;