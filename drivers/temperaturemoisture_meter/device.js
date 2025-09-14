const { ZigBeeDevice } = require('homey-zigbeedriver');

class TemperaturemoistureMeterDevice extends ZigBeeDevice {
    
    async onNodeInit({ zclNode }) {
        
        // Enable debug logging
        this.enableDebug();
        
        // Print node info
        this.printNode();
        
        // Register capabilities with proper cluster mappings
        await this.registerCapabilitiesAndReporting();
        
        // Set up flow triggers if applicable
        this.setupFlowTriggers();
        
        this.log('Temperature/Moisture meter has been initialized');
    }
    
    async registerCapabilitiesAndReporting() {
        try {
            // Measure Temperature capability
            if (this.hasCapability('measure_temperature')) {
                await this.registerCapability('measure_temperature', 1026, {
                    reportOpts: {
                            configureAttributeReporting: {
                                minInterval: 60,
                                maxInterval: 3600,
                                minChange: 100
                            }
                        }
                });
            }

            // Measure Battery capability
            if (this.hasCapability('measure_battery')) {
                await this.registerCapability('measure_battery', 1, {
                    reportOpts: {
                            configureAttributeReporting: {
                                minInterval: 0,
                                maxInterval: 43200,
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
        this.log('Temperature/Moisture meter has been deleted');
    }
}

module.exports = TemperaturemoistureMeterDevice;