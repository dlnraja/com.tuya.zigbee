'use strict';

const { ZigbeeDevice } = require('homey-meshdriver');

class TS0601_thermostatDevice extends ZigbeeDevice {
    async onMeshInit() {
        this.log('TS0601_thermostat device initialized');
        
        // Register capabilities
        await this.registerCapabilities();
    }
    
    async registerCapabilities() {
        try {
            const capabilities = ["target_temperature","measure_temperature"];
            
            for (const capability of capabilities) {
                await this.registerCapability(capability);
            }
            
            this.log('All capabilities registered for TS0601_thermostat');
        } catch (error) {
            this.error('Error registering capabilities:', error);
        }
    }
}

module.exports = TS0601_thermostatDevice;