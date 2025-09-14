const { ZigBeeDevice } = require('homey-zigbeedriver');

class MultisensorDevice extends ZigBeeDevice {
    
    async onNodeInit({ zclNode }) {
        
        // Enable debug logging
        this.enableDebug();
        
        // Print node info
        this.printNode();
        
        // Register capabilities with proper cluster mappings
        await this.registerCapabilitiesAndReporting();
        
        // Set up flow triggers
        this.setupFlowTriggers();
        
        this.log('Multi-Sensor has been initialized');
    }
    
    async registerCapabilitiesAndReporting() {
        try {
            // Motion detection capability with occupancy sensing cluster
            if (this.hasCapability('alarm_motion')) {
                await this.registerCapability('alarm_motion', 1030, {
                    reportOpts: {
                        configureAttributeReporting: {
                            minInterval: 0,
                            maxInterval: 600,
                            minChange: null
                        }
                    }
                });
            }
            
            // Temperature measurement capability
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
            
            // Humidity measurement capability
            if (this.hasCapability('measure_humidity')) {
                await this.registerCapability('measure_humidity', 1029, {
                    reportOpts: {
                        configureAttributeReporting: {
                            minInterval: 60,
                            maxInterval: 3600,
                            minChange: 500
                        }
                    }
                });
            }
            
            // Luminance measurement capability
            if (this.hasCapability('measure_luminance')) {
                await this.registerCapability('measure_luminance', 1024, {
                    reportOpts: {
                        configureAttributeReporting: {
                            minInterval: 60,
                            maxInterval: 3600,
                            minChange: 100
                        }
                    }
                });
            }
            
            // Battery measurement capability
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
        // Register flow card triggers
        
        // Motion/presence detection triggers
        this.registerCapabilityListener('alarm_motion', (value) => {
            this.homey.flow.getDeviceTriggerCard('motion_detected')
                .trigger(this, {}, { motion: value })
                .catch(this.error);
        });
        
        this.registerCapabilityListener('alarm_contact', (value) => {
            this.homey.flow.getDeviceTriggerCard('contact_changed')
                .trigger(this, {}, { contact: value })
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
            
            case 'motion_sensitivity':
                this.log(`motion_sensitivity changed to ${value}`);
                // Handle motion_sensitivity change
                break;
            case 'temp_offset':
                this.log(`temp_offset changed to ${value}`);
                // Handle temp_offset change
                break;
            case 'humidity_offset':
                this.log(`humidity_offset changed to ${value}`);
                // Handle humidity_offset change
                break;
            default:
                this.log(`Unhandled setting change: ${key} = ${value}`);
        }
    }
    
    onDeleted() {
        this.log('Multi-Sensor has been deleted');
    }
}

module.exports = MultisensorDevice;
