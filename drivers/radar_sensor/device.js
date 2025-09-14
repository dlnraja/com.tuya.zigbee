const { ZigBeeDevice } = require('homey-zigbeedriver');

class RadarSensorDevice extends ZigBeeDevice {
    
    async onNodeInit({ zclNode }) {
        
        // Enable debug logging
        this.enableDebug();
        
        // Print node info
        this.printNode();
        
        // Register capabilities with proper cluster mappings
        await this.registerCapabilitiesAndReporting();
        
        // Set up flow triggers
        this.setupFlowTriggers();
        
        this.log('Radar Motion Sensor has been initialized');
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
            
            // Battery alarm capability
            if (this.hasCapability('alarm_battery')) {
                await this.registerCapability('alarm_battery', 1, {
                    reportOpts: {
                        configureAttributeReporting: {
                            minInterval: 0,
                            maxInterval: 43200,
                            minChange: 1
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
        // Register flow card triggers for radar detection
        
        // Motion detection trigger
        this.registerCapabilityListener('alarm_motion', (value) => {
            if (value) {
                this.homey.flow.getDeviceTriggerCard('radar_motion_detected')
                    .trigger(this, {}, { motion: true })
                    .catch(this.error);
                
                this.log('Radar motion detected!');
            } else {
                this.homey.flow.getDeviceTriggerCard('radar_motion_cleared')
                    .trigger(this, {}, { motion: false })
                    .catch(this.error);
                
                this.log('Radar motion cleared');
            }
        });
        
        // Battery alarm trigger
        this.registerCapabilityListener('alarm_battery', (value) => {
            this.homey.flow.getDeviceTriggerCard('battery_alarm')
                .trigger(this, {}, { low_battery: value })
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
            case 'radar_sensitivity':
                this.log(`Radar sensitivity changed to ${value}`);
                // Handle radar sensitivity change
                break;
            case 'detection_distance':
                this.log(`Detection distance changed to ${value}m`);
                // Handle detection distance change
                break;
            case 'hold_time':
                this.log(`Motion hold time changed to ${value}s`);
                // Handle hold time change
                break;
            default:
                this.log(`Unhandled setting change: ${key} = ${value}`);
        }
    }
    
    onDeleted() {
        this.log('Radar Motion Sensor has been deleted');
    }
}

module.exports = RadarSensorDevice;
