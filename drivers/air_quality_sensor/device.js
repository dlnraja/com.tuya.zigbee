const { ZigBeeDevice } = require('homey-zigbeedriver');

class AirQualitySensorDevice extends ZigBeeDevice {
    
    async onNodeInit({ zclNode }) {
        
        // Enable debug logging
        this.enableDebug();
        
        // Print node info
        this.printNode();
        
        // Register capabilities
        await this.registerCapabilities();
        
        // Configure reporting
        await this.configureReporting();
        
        // Set up flow triggers
        this.setupFlowTriggers();
        
        this.log('Air Quality Sensor has been initialized');
    }
    
    async registerCapabilities() {
        const capabilities = [
        "measure_pm25",
        "measure_formaldehyde",
        "measure_battery"
];
        
        for (const capability of capabilities) {
            if (this.hasCapability(capability)) {
                this.log(`Capability ${capability} already registered`);
                continue;
            }
            
            try {
                await this.addCapability(capability);
                this.log(`Added capability: ${capability}`);
            } catch (error) {
                this.error(`Failed to add capability ${capability}:`, error);
            }
        }
    }
    
    async configureReporting() {
        try {
            // Configure cluster reporting based on device type
            
            // Configure sensor reporting
            if (this.zclNode.endpoints[1].clusters.occupancySensing) {
                await this.zclNode.endpoints[1].clusters.occupancySensing.configureReporting('occupancy', {
                    minInterval: 0,
                    maxInterval: 600,
                    minChange: null
                });
            }
            
            if (this.zclNode.endpoints[1].clusters.temperatureMeasurement) {
                await this.zclNode.endpoints[1].clusters.temperatureMeasurement.configureReporting('measuredValue', {
                    minInterval: 60,
                    maxInterval: 3600,
                    minChange: 100
                });
            }
            
            if (this.zclNode.endpoints[1].clusters.relativeHumidity) {
                await this.zclNode.endpoints[1].clusters.relativeHumidity.configureReporting('measuredValue', {
                    minInterval: 60,
                    maxInterval: 3600,
                    minChange: 500
                });
            }
        } catch (error) {
            this.error('Failed to configure reporting:', error);
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
            
            case 'air_quality_threshold':
                this.log(`air_quality_threshold changed to ${value}`);
                // Handle air_quality_threshold change
                break;
            default:
                this.log(`Unhandled setting change: ${key} = ${value}`);
        }
    }
    
    onDeleted() {
        this.log('Air Quality Sensor has been deleted');
    }
}

module.exports = AirQualitySensorDevice;
