'use strict';

const { ZigbeeDevice } = require('homey-meshdriver');

class TS011FDevice extends ZigbeeDevice {
    async onMeshInit() {
        this.log('TS011F device initialized');
        
        // addMeteringCapability - seMetering cluster missing
        await this.addMeteringCapability();
        
        // Register capabilities
        await this.registerCapabilities();
    }
    
    async addMeteringCapability() {
        try {
            
            await this.registerCapability('measure_power', 'seMetering', {
                get: 'currentSummDelivered',
                report: 'currentSummDelivered',
                reportParser: (value) => value / 1000
            });
            
            await this.registerCapability('meter_power', 'seMetering', {
                get: 'currentSummReceived',
                report: 'currentSummReceived',
                reportParser: (value) => value / 1000
            });
            this.log('addMeteringCapability implemented for TS011F');
        } catch (error) {
            this.error('Error in addMeteringCapability:', error);
        }
    }
    
    async registerCapabilities() {
        try {
            const capabilities = ["onoff","measure_power","meter_power"];
            
            for (const capability of capabilities) {
                await this.registerCapability(capability);
            }
            
            this.log('All capabilities registered for TS011F');
        } catch (error) {
            this.error('Error registering capabilities:', error);
        }
    }
}

module.exports = TS011FDevice;