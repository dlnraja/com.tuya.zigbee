'use strict';

const { ZigBeeDriver } = require('homey-zigbeedriver');

class TuyaZigbeeDriver extends ZigBeeDriver {

    async onInit() {
        this.log('Tuya Zigbee Driver has been initialized');
        await super.onInit();
        
        // Register flow action for testing SOS button
        this.homey.flow.getActionCard('test_sos_button')
          .registerRunListener(async (args) => {
            return args.device.testSosButton();
          });
        
        this.log('✅ Flow cards registered for SOS button');
    }

}

module.exports = TuyaZigbeeDriver;