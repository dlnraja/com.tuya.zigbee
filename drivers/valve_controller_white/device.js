const { ZigBeeDevice } = require('homey-zigbeedriver');

class ValveControllerWhiteDevice extends ZigBeeDevice {
    
    async onNodeInit({ zclNode }) {
        
        // Enable debug logging
        this.enableDebug();
        
        // Print node info
        this.printNode();
        
        // Register capabilities with proper cluster mappings
        await this.registerCapabilitiesAndReporting();
        
        // Set up flow triggers if applicable
        this.setupFlowTriggers();
        
        this.log('Valve Controller White has been initialized');
    }
    
    async registerCapabilitiesAndReporting() {
        try {
            // Target Temperature capability
            if (this.hasCapability('target_temperature')) {
                await this.registerCapability('target_temperature', 513, {
                    reportOpts: {
                        configureAttributeReporting: {
                            minInterval: 0,
                            maxInterval: 600,
                            minChange: null
                        }
                    }
                });
            }

            // Alarm Co capability
            if (this.hasCapability('alarm_co')) {
                await this.registerCapability('alarm_co', 1280, {
                    reportOpts: {
                            configureAttributeReporting: {
                                minInterval: 0,
                                maxInterval: 600,
                                minChange: null
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
        this.log('Valve Controller White has been deleted');
    }
}

module.exports = ValveControllerWhiteDevice;