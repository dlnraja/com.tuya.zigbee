const { TuyaDevice } = require('homey-tuya');
const { TuyaZigbeeDevice } = require('homey-tuya-zigbee');

class TuyaSmartPlugCommunity extends TuyaDevice {
    async onInit() {
        try {
        await super.onInit();
        
        // Logique spécifique à la communauté
        this.log('Tuya Smart Plug Community initialized');
        
        // Capabilities
        this.registerCapabilityListener('onoff', async (value) => {
            await this.setCapabilityValue('onoff', value);
        });
        
        // Power monitoring
        this.registerCapabilityListener('measure_power', async (value) => {
            await this.setCapabilityValue('measure_power', value);
        });
    }
    
    async onUninit() {
        this.log('Tuya Smart Plug Community uninitialized');
    }
}

module.exports = TuyaSmartPlugCommunity;