const { ZigBeeDevice } = require('homey-zigbeedriver');

class SmartPlugDevice extends ZigBeeDevice {
    
    async onNodeInit({ zclNode }) {
        
        // Enable debug logging
        this.enableDebug();
        
        // Print node info
        this.printNode();
        
        // Register capabilities
        await this.registerCapabilities();
        
        // Configure reporting
        await this.configureReporting();
        
        // Set up flow triggers
        this.setupFlowTriggers();
        
        this.log('Smart Plug has been initialized');
    }
    
    async registerCapabilities() {
        const capabilities = [
        "onoff"
];
        
        for (const capability of capabilities) {
            if (this.hasCapability(capability)) {
                this.log(`Capability ${capability} already registered`);
                continue;
            }
            
            try {
                await this.addCapability(capability);
                this.log(`Added capability: ${capability}`);
            } catch (error) {
                this.error(`Failed to add capability ${capability}:`, error);
            }
        }
    }
    
    async configureReporting() {
        try {
            // Configure cluster reporting based on device type
            
            // Configure plug reporting
            await this.zclNode.endpoints[1].clusters.onOff.configureReporting('onOff', {
                minInterval: 0,
                maxInterval: 600
            });
            
            if (this.zclNode.endpoints[1].clusters.electricalMeasurement) {
                await this.zclNode.endpoints[1].clusters.electricalMeasurement.configureReporting('activePower', {
                    minInterval: 5,
                    maxInterval: 600,
                    minChange: 1
                });
            }
        } catch (error) {
            this.error('Failed to configure reporting:', error);
        }
    }
    
    setupFlowTriggers() {
        // Register flow card triggers
        // No specific flow triggers needed
    }
    
    onSettings({ oldSettings, newSettings, changedKeys }) {
        this.log('Settings changed:', changedKeys);
        
        // Handle settings changes
        changedKeys.forEach(key => {
            this.log(`Setting ${key} changed from ${oldSettings[key]} to ${newSettings[key]}`);
            this.handleSettingChange(key, newSettings[key]);
        });
        
        return Promise.resolve(true);
    }
    
    handleSettingChange(key, value) {
        // Handle individual setting changes
        switch(key) {
            
            case 'power_on_behavior':
                this.log(`power_on_behavior changed to ${value}`);
                // Handle power_on_behavior change
                break;
            default:
                this.log(`Unhandled setting change: ${key} = ${value}`);
        }
    }
    
    onDeleted() {
        this.log('Smart Plug has been deleted');
    }
}

module.exports = SmartPlugDevice;
