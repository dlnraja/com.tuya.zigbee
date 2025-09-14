const { ZigBeeDevice } = require('homey-zigbeedriver');

class UsbMicroSwitchSingleDevice extends ZigBeeDevice {
    
    async onNodeInit({ zclNode }) {
        
        // Enable debug logging
        this.enableDebug();
        
        // Print node info
        this.printNode();
        
        // Register capabilities with proper cluster mappings
        await this.registerCapabilitiesAndReporting();
        
        // Set up flow triggers if applicable
        this.setupFlowTriggers();
        
        this.log('usb micro switch (single) has been initialized');
    }
    
    async registerCapabilitiesAndReporting() {
        try {
            // Onoff capability
            if (this.hasCapability('onoff')) {
                await this.registerCapability('onoff', 6, {
                    reportOpts: {
                        configureAttributeReporting: {
                            minInterval: 0,
                            maxInterval: 600,
                            minChange: null
                        }
                    }
                });
            }
            
            this.log('All capabilities registered successfully with cluster mappings');
        } catch (error) {
            this.error('Failed to register capabilities:', error);
        }
    }
    
    setupFlowTriggers() {
        // No specific flow triggers for this device type
    }
    
    onSettings({ oldSettings, newSettings, changedKeys }) {
        this.log('Settings changed:', changedKeys);
        
        changedKeys.forEach(key => {
            this.log(`Setting ${key} changed from ${oldSettings[key]} to ${newSettings[key]}`);
            this.handleSettingChange(key, newSettings[key]);
        });
        
        return Promise.resolve(true);
    }
    
    handleSettingChange(key, value) {
        // Handle setting changes based on device type
        this.log(`Setting change: ${key} = ${value}`);
    }
    
    onDeleted() {
        this.log('usb micro switch (single) has been deleted');
    }
}

module.exports = UsbMicroSwitchSingleDevice;