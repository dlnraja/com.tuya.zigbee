'use strict';

const { ZigBeeDriver } = require('homey-zigbeedriver');

class TuyaZigbeeDriver extends ZigBeeDriver {

    async onInit() {
        this.log('Tuya Zigbee Driver has been initialized');
        await super.onInit();
        
        // Register flow conditions
        this.homey.flow.getConditionCard('is_motion_detected')
          .registerRunListener(async (args) => {
            return args.device.isMotionDetected();
          });
        
        this.homey.flow.getConditionCard('temperature_above')
          .registerRunListener(async (args) => {
            return args.device.isTemperatureAbove(args);
          });
        
        this.homey.flow.getConditionCard('humidity_above')
          .registerRunListener(async (args) => {
            return args.device.isHumidityAbove(args);
          });
        
        this.homey.flow.getConditionCard('luminance_above')
          .registerRunListener(async (args) => {
            return args.device.isLuminanceAbove(args);
          });
        
        // Register flow actions
        this.homey.flow.getActionCard('reset_motion_alarm')
          .registerRunListener(async (args) => {
            return args.device.resetMotionAlarm();
          });
        
        this.homey.flow.getActionCard('set_motion_timeout')
          .registerRunListener(async (args) => {
            return args.device.setMotionTimeout(args);
          });
        
        this.log('✅ Flow cards registered for motion sensor');
    }

}

module.exports = TuyaZigbeeDriver;