'use strict';

const { ZigbeeDevice } = require('homey-unknown');

class HandlesDevice extends ZigbeeDevice {
    async onInit() {
        await super.onInit();
        
        this.log('handles device initialized');
        this.log('Source: D:\Download\Compressed\com.tuya.zigbee-SDK3_2\com.tuya.zigbee-SDK3\node_modules\homey-zigbeedriver\lib\ZigBeeLightDevice.js');
        this.log('Original file: ZigBeeLightDevice.js');
        
        // Register capabilities
        this.registerCapabilityListener('`onoff`', this.onCapability`onoff`.bind(this));
        this.registerCapabilityListener('`dim`', this.onCapability`dim`.bind(this));
        this.registerCapabilityListener('* `light_mode`', this.onCapability* `light_mode`.bind(this));
        this.registerCapabilityListener('`light_hue`', this.onCapability`light_hue`.bind(this));
        this.registerCapabilityListener('`light_saturation` and `light_temperature`', this.onCapability`light_saturation` and `light_temperature`.bind(this));
    }
    
    async onCapability`onoff`(value) {
        try {
            await this.setCapabilityValue('`onoff`', value);
            this.log('✅ `onoff`: ' + value);
        } catch (error) {
            this.log('❌ Erreur `onoff`:', error.message);
        }
    }
    
    async onCapability`dim`(value) {
        try {
            await this.setCapabilityValue('`dim`', value);
            this.log('✅ `dim`: ' + value);
        } catch (error) {
            this.log('❌ Erreur `dim`:', error.message);
        }
    }
    
    async onCapability* `light_mode`(value) {
        try {
            await this.setCapabilityValue('* `light_mode`', value);
            this.log('✅ * `light_mode`: ' + value);
        } catch (error) {
            this.log('❌ Erreur * `light_mode`:', error.message);
        }
    }
    
    async onCapability`light_hue`(value) {
        try {
            await this.setCapabilityValue('`light_hue`', value);
            this.log('✅ `light_hue`: ' + value);
        } catch (error) {
            this.log('❌ Erreur `light_hue`:', error.message);
        }
    }
    
    async onCapability`light_saturation` and `light_temperature`(value) {
        try {
            await this.setCapabilityValue('`light_saturation` and `light_temperature`', value);
            this.log('✅ `light_saturation` and `light_temperature`: ' + value);
        } catch (error) {
            this.log('❌ Erreur `light_saturation` and `light_temperature`:', error.message);
        }
    }
}

module.exports = HandlesDevice;
