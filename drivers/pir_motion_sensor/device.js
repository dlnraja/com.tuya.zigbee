const { ZigBeeDevice } = require('homey-zigbeedriver');

class PirMotionSensorDevice extends ZigBeeDevice {
    
    async onNodeInit({ zclNode }) {
        
        // Enable debug logging
        this.enableDebug();
        
        // Print node info
        this.printNode();
        
        // Register capabilities with proper cluster mappings
        await this.registerCapabilitiesAndReporting();
        
        // Set up flow triggers if applicable
        this.setupFlowTriggers();
        
        this.log('PIR Motion Sensor has been initialized');
    }
    
    async registerCapabilitiesAndReporting() {
        try {
            // Alarm Motion capability
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
        // Motion sensor triggers
        this.registerCapabilityListener('alarm_motion', (value) => {
            this.homey.flow.getDeviceTriggerCard('motion_detected')
                .trigger(this, {}, { motion: value })
                .catch(this.error);
        });
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
        this.log('PIR Motion Sensor has been deleted');
    }
}

module.exports = PirMotionSensorDevice;