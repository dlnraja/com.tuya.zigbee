const { ZigBeeDevice } = require('homey-zigbeedriver');

class SOSButtonDevice extends ZigBeeDevice {
    
    async onNodeInit({ zclNode }) {
        
        // Enable debug logging
        this.enableDebug();
        
        // Print node info
        this.printNode();
        
        // Register capabilities with proper cluster mappings
        await this.registerCapabilitiesAndReporting();
        
        // Set up flow triggers
        this.setupFlowTriggers();
        
        this.log('SOS Emergency Button has been initialized');
    }
    
    async registerCapabilitiesAndReporting() {
        try {
            // Emergency alarm capability
            if (this.hasCapability('alarm_generic')) {
                await this.registerCapability('alarm_generic', 6, {
                    reportOpts: {
                        configureAttributeReporting: {
                            minInterval: 0,
                            maxInterval: 300,
                            minChange: null
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
        // Register flow card triggers for emergency events
        
        // SOS button pressed trigger
        this.registerCapabilityListener('alarm_generic', (value) => {
            if (value) {
                this.homey.flow.getDeviceTriggerCard('sos_button_pressed')
                    .trigger(this, {}, { emergency: true })
                    .catch(this.error);
                
                this.log('SOS Emergency button pressed!');
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
            case 'sensitivity':
                this.log(`Button sensitivity changed to ${value}`);
                // Handle sensitivity change
                break;
            case 'emergency_mode':
                this.log(`Emergency mode ${value ? 'enabled' : 'disabled'}`);
                // Handle emergency mode change
                break;
            default:
                this.log(`Unhandled setting change: ${key} = ${value}`);
        }
    }
    
    onDeleted() {
        this.log('SOS Emergency Button has been deleted');
    }
}

module.exports = SOSButtonDevice;
