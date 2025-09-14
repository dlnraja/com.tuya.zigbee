const { ZigBeeDevice } = require('homey-zigbeedriver');

class EnhancedSmokeDetectorDevice extends ZigBeeDevice {
    
    async onNodeInit({ zclNode }) {
        
        // Enable debug logging
        this.enableDebug();
        
        // Print node info
        this.printNode();
        
        // Register capabilities with proper cluster mappings
        await this.registerCapabilitiesAndReporting();
        
        // Set up smoke alarm flow triggers
        this.setupFlowTriggers();
        
        this.log('Enhanced Smoke Detector has been initialized');
    }
    
    async registerCapabilitiesAndReporting() {
        try {
            // Smoke alarm capability
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
            
            this.log('All capabilities registered successfully with cluster mappings');
        } catch (error) {
            this.error('Failed to register capabilities:', error);
        }
    }
    
    setupFlowTriggers() {
        // Smoke alarm trigger
        this.registerCapabilityListener('alarm_smoke', (value) => {
            if (value) {
                this.homey.flow.getDeviceTriggerCard('smoke_alarm_triggered')
                    .trigger(this, {}, { smoke_detected: true })
                    .catch(this.error);
                
                this.log('Smoke alarm triggered!');
            } else {
                this.homey.flow.getDeviceTriggerCard('smoke_alarm_cleared')
                    .trigger(this, {}, { smoke_detected: false })
                    .catch(this.error);
                
                this.log('Smoke alarm cleared');
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
        
        changedKeys.forEach(key => {
            this.log(`Setting ${key} changed from ${oldSettings[key]} to ${newSettings[key]}`);
            this.handleSettingChange(key, newSettings[key]);
        });
        
        return Promise.resolve(true);
    }
    
    handleSettingChange(key, value) {
        switch(key) {
            case 'smoke_sensitivity':
                this.log(`Smoke sensitivity changed to ${value}`);
                break;
            case 'test_mode':
                this.log(`Test mode changed to ${value}`);
                break;
            default:
                this.log(`Unhandled setting change: ${key} = ${value}`);
        }
    }
    
    onDeleted() {
        this.log('Enhanced Smoke Detector has been deleted');
    }
}

module.exports = EnhancedSmokeDetectorDevice;
