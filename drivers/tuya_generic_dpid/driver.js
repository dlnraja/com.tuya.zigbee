'use strict';
const { Driver } = require('homey');

class TuyaGenericDpidDriver extends Driver {
  async onInit() {
    this.log('Tuya Generic DPID Driver initialized');
    
    try {
      const sendDpAction = this.homey.flow.getActionCard('tuya_generic_send_dp');
      sendDpAction.registerRunListener(async (args) => {
        if (args.device && typeof args.device.sendRawDataPoint === 'function') {
          return await args.device.sendRawDataPoint(args.dp, args.type.id || args.type, args.value);
        }
        return false;
      });
    } catch (err) {
      this.error('Failed to register flow card tuya_generic_send_dp:', err.message);
    }
  }
}

module.exports = TuyaGenericDpidDriver;
