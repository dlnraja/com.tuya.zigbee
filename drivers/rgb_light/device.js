const { ZigBeeDevice } = require('homey-zigbeedriver');

class RgbLightDevice extends ZigBeeDevice {
    
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
        
        this.log('RGB Light has been initialized');
    }
    
    async registerCapabilities() {
        const capabilities = [
        "onoff",
        "dim",
        "light_hue",
        "light_saturation",
        "light_temperature"
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
            
            // Configure light reporting
            await this.zclNode.endpoints[1].clusters.onOff.configureReporting('onOff', {
                minInterval: 0,
                maxInterval: 600
            });
            
            if (this.zclNode.endpoints[1].clusters.levelControl) {
                await this.zclNode.endpoints[1].clusters.levelControl.configureReporting('currentLevel', {
                    minInterval: 1,
                    maxInterval: 3600,
                    minChange: 1
                });
            }
        } catch (error) {
            this.error('Failed to configure reporting:', error);
        }
    }
    
    setupFlowTriggers() {
        // Register flow card triggers
        
        // Light state change triggers
        this.registerCapabilityListener('onoff', (value) => {
            this.homey.flow.getDeviceTriggerCard('light_turned_on_off')
                .trigger(this, {}, { power: value })
                .catch(this.error);
        });
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
            
            case 'transition_time':
                this.log(`transition_time changed to ${value}`);
                // Handle transition_time change
                break;
            case 'color_loop':
                this.log(`color_loop changed to ${value}`);
                // Handle color_loop change
                break;
            default:
                this.log(`Unhandled setting change: ${key} = ${value}`);
        }
    }
    
    onDeleted() {
        this.log('RGB Light has been deleted');
    }
}

module.exports = RgbLightDevice;
