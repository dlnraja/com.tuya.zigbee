const { ZigBeeDevice } = require('homey-zigbeedriver');

class DimmerSwitchDevice extends ZigBeeDevice {
    
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
        
        this.log('Dimmer Switch has been initialized');
    }
    
    async registerCapabilities() {
        const capabilities = [
        "onoff",
        "dim"
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
            // No specific reporting configuration needed
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
            
            case 'min_brightness':
                this.log(`min_brightness changed to ${value}`);
                // Handle min_brightness change
                break;
            case 'fade_duration':
                this.log(`fade_duration changed to ${value}`);
                // Handle fade_duration change
                break;
            default:
                this.log(`Unhandled setting change: ${key} = ${value}`);
        }
    }
    
    onDeleted() {
        this.log('Dimmer Switch has been deleted');
    }
}

module.exports = DimmerSwitchDevice;
