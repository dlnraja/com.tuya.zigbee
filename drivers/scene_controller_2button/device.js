'use strict';

const { ZigBeeDevice } = require('homey-zigbeedriver');

class SceneController_2buttonDevice extends ZigBeeDevice {
    
    async onNodeInit() {
        this.log('scene_controller_2button device initialized - 2 button(s), battery powered');
        
        await this.registerEnhancedCapabilities();
        await this.setupEnhancedListeners();
        
        // Device specifications
        this.specs = {
        "buttons": 2,
        "power": "battery",
        "type": "CR2032"
};
    }
    
    async registerEnhancedCapabilities() {
        // OnOff capability for main button
        if (this.hasCapability('onoff')) {
            this.registerCapability('onoff', 'genOnOff');
        }
        
        // Additional buttons for multi-gang switches
        
        for (let i = 2; i <= 2; i++) {
            if (this.hasCapability(`button.${i}`)) {
                this.registerCapability(`button.${i}`, 'genOnOff', {
                    endpoint: i
                });
            }
        }
        
        // Battery capabilities for battery-powered devices
        
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
        
        if (this.hasCapability('alarm_battery')) {
            this.registerCapability('alarm_battery', 'genPowerCfg');
        }
        
        // Motion sensing capabilities
        
    }
    
    async setupEnhancedListeners() {
        // Battery level monitoring
        
        this.registerAttrReportListener('genPowerCfg', 'batteryPercentageRemaining', 
            this.onBatteryPercentageRemainingAttributeReport.bind(this), 1);
        
        // Motion detection
        
    }
    
    
    onBatteryPercentageRemainingAttributeReport(value) {
        const batteryThreshold = this.getSetting('battery_threshold') || 20;
        const batteryPercentage = Math.max(0, Math.min(100, Math.round(value / 2)));
        
        this.setCapabilityValue('measure_battery', batteryPercentage);
        this.setCapabilityValue('alarm_battery', batteryPercentage <= batteryThreshold);
        
        this.log('Battery level:', batteryPercentage + '%');
    }
    
    
}

module.exports = SceneController_2buttonDevice;