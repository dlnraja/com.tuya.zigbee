const { ZigBeeDevice } = require('homey-zigbeedriver');

class MoesDimmerDevice extends ZigBeeDevice {
    
    async onNodeInit({ zclNode }) {
        
        // Enable debug logging
        this.enableDebug();
        
        // Print node info
        this.printNode();
        
        // Register capabilities with proper cluster mappings
        await this.registerCapabilitiesAndReporting();
        
        this.log('MOES Smart Dimmer Switch has been initialized');
    }
    
    async registerCapabilitiesAndReporting() {
        try {
            // On/Off capability
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
            
            // Dimming capability
            if (this.hasCapability('dim')) {
                await this.registerCapability('dim', 8, {
                    reportOpts: {
                        configureAttributeReporting: {
                            minInterval: 0,
                            maxInterval: 600,
                            minChange: 1
                        }
                    }
                });
            }
            
            this.log('All capabilities registered successfully with cluster mappings');
        } catch (error) {
            this.error('Failed to register capabilities:', error);
        }
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
        switch(key) {
            case 'dimmer_mode':
                this.log(`Dimmer mode changed to ${value}`);
                break;
            case 'minimum_brightness':
                this.log(`Minimum brightness changed to ${value}%`);
                break;
            default:
                this.log(`Unhandled setting change: ${key} = ${value}`);
        }
    }
    
    onDeleted() {
        this.log('MOES Smart Dimmer Switch has been deleted');
    }
}

module.exports = MoesDimmerDevice;
