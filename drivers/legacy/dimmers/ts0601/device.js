'use strict';

const { ZigbeeDevice } = require('homey-meshdriver');

class TS0601Device extends ZigbeeDevice {
    async onMeshInit() {
        this.log('TS0601 device initialized');
        
        // addDimmingCapability - Dimming with level control
        await this.addDimmingCapability();
        
        // Register capabilities
        await this.registerCapabilities();
    }
    
    async addDimmingCapability() {
        try {
            
            await this.registerCapability('dim', 'genLevelCtrl', {
                get: 'currentLevel',
                set: 'moveToLevel',
                setParser: (value) => Math.round(value * 254)
            });
            this.log('addDimmingCapability implemented for TS0601');
        } catch (error) {
            this.error('Error in addDimmingCapability:', error);
        }
    }
    
    async registerCapabilities() {
        try {
            const capabilities = ["onoff","dim"];
            
            for (const capability of capabilities) {
                await this.registerCapability(capability);
            }
            
            this.log('All capabilities registered for TS0601');
        } catch (error) {
            this.error('Error registering capabilities:', error);
        }
    }
}

module.exports = TS0601Device;