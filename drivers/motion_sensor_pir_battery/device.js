'use strict';

const { ZigBeeDevice } = require('homey-zigbeedriver');

class MotionSensorPirBatteryDevice extends ZigBeeDevice {
    
    async onNodeInit() {
        this.log('motion_sensor_pir_battery device initialized - 1 button(s), battery powered');
        
        await this.registerEnhancedCapabilities();
        await this.setupEnhancedListeners();
        
        // Device specifications
        this.specs = {
        "type": "PIR",
        "power": "battery",
        "range": "8m"
};
    }
    
    async registerEnhancedCapabilities() {
        // OnOff capability for main button
        if (this.hasCapability('onoff')) {
            this.registerCapability('onoff', 'genOnOff');
        }
        
        // Additional buttons for multi-gang switches
        
        
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
        
        if (this.hasCapability('alarm_motion')) {
            this.registerCapability('alarm_motion', 'msOccupancySensing');
        }
    }
    
    async setupEnhancedListeners() {
        // Battery level monitoring
        
        this.registerAttrReportListener('genPowerCfg', 'batteryPercentageRemaining', 
            this.onBatteryPercentageRemainingAttributeReport.bind(this), 1);
        
        // Motion detection
        
        this.registerAttrReportListener('msOccupancySensing', 'occupancy',
            this.onOccupancyAttributeReport.bind(this), 1);
    }
    
    
    onBatteryPercentageRemainingAttributeReport(value) {
        const batteryThreshold = this.getSetting('battery_threshold') || 20;
        const batteryPercentage = Math.max(0, Math.min(100, Math.round(value / 2)));
        
        this.setCapabilityValue('measure_battery', batteryPercentage);
        this.setCapabilityValue('alarm_battery', batteryPercentage <= batteryThreshold);
        
        this.log('Battery level:', batteryPercentage + '%');
    }
    
    
    onOccupancyAttributeReport(value) {
        const motionDetected = (value & 1) === 1;
        this.setCapabilityValue('alarm_motion', motionDetected);
        
        this.log('Motion detected:', motionDetected);
    }
}

module.exports = MotionSensorPirBatteryDevice;