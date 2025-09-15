'use strict';

const { ZigBeeDevice } = require('homey-zigbeedriver');

class OutdoorLightControllerDevice extends ZigBeeDevice {
    
    async onNodeInit() {
        this.log('outdoor_light_controller device initialized');
        
        // Register capabilities based on driver type
        await this.registerCapabilities();
        
        // Set up device-specific listeners
        await this.setupListeners();
    }
    
    async registerCapabilities() {
        // Implementation based on capabilities defined in driver.compose.json
        if (this.hasCapability('onoff')) {
            this.registerCapability('onoff', 'genOnOff');
        }
        
        if (this.hasCapability('dim')) {
            this.registerCapability('dim', 'genLevelCtrl');
        }
        
        if (this.hasCapability('measure_battery')) {
            this.registerCapability('measure_battery', 'genPowerCfg', {
                reportOpts: {
                    configureAttributeReporting: {
                        minInterval: 0,
                        maxInterval: 3600,
                        minChange: 1
                    }
                }
            });
        }
        
        if (this.hasCapability('alarm_motion')) {
            this.registerCapability('alarm_motion', 'msOccupancySensing');
        }
        
        if (this.hasCapability('measure_temperature')) {
            this.registerCapability('measure_temperature', 'msTemperatureMeasurement');
        }
        
        if (this.hasCapability('measure_humidity')) {
            this.registerCapability('measure_humidity', 'msRelativeHumidity');
        }
    }
    
    async setupListeners() {
        // Device-specific event listeners and configurations
        this.log('Device listeners configured');
    }
}

module.exports = OutdoorLightControllerDevice;