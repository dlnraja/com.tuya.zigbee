const { ZigBeeDevice } = require('homey-zigbeedriver');

class SmokeDetectorDevice extends ZigBeeDevice {
    
    async onNodeInit({ zclNode }) {
        
        // Enable debug logging
        this.enableDebug();
        
        // Print node info
        this.printNode();
        
        // Register capabilities with proper cluster mappings
        await this.registerCapabilitiesAndReporting();
        
        // Set up flow triggers if applicable
        this.setupFlowTriggers();
        
        this.log('smoke detector has been initialized');
    }
    
    async registerCapabilitiesAndReporting() {
        try {
            // Alarm Smoke capability
            if (this.hasCapability('alarm_smoke')) {
                await this.registerCapability('alarm_smoke', 1280, {
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
        // Smoke alarm triggers
        this.registerCapabilityListener('alarm_smoke', (value) => {
            if (value) {
                this.homey.flow.getDeviceTriggerCard('smoke_alarm_triggered')
                    .trigger(this, {}, { smoke_detected: true })
                    .catch(this.error);
            } else {
                this.homey.flow.getDeviceTriggerCard('smoke_alarm_cleared')
                    .trigger(this, {}, { smoke_detected: false })
                    .catch(this.error);
            }
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
        this.log('smoke detector has been deleted');
    }
}

module.exports = SmokeDetectorDevice;