const { ZigBeeDevice } = require('homey-zigbeedriver');

class SoilSensorDevice extends ZigBeeDevice {
    
    async onNodeInit({ zclNode }) {
        
        // Enable debug logging
        this.enableDebug();
        
        // Print node info
        this.printNode();
        
        // Register capabilities with proper cluster mappings
        await this.registerCapabilitiesAndReporting();
        
        this.log('Soil Temperature & Humidity Sensor has been initialized');
    }
    
    async registerCapabilitiesAndReporting() {
        try {
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
            case 'measurement_interval':
                this.log(`Measurement interval changed to ${value} minutes`);
                break;
            case 'temperature_offset':
                this.log(`Temperature offset changed to ${value}°C`);
                break;
            default:
                this.log(`Unhandled setting change: ${key} = ${value}`);
        }
    }
    
    onDeleted() {
        this.log('Soil Temperature & Humidity Sensor has been deleted');
    }
}

module.exports = SoilSensorDevice;
