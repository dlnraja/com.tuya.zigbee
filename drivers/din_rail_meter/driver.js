'use strict';

const { Driver } = require('homey');

class DinRailMeterDriver extends Driver {
  async onInit() {
    this.log('Din Rail Meter driver initialized');
    try {
      const actionCard = this.homey.flow.getActionCard('din_rail_meter_reset_meter');
      if (actionCard) {
        actionCard.registerRunListener(async (args, state) => {
          if (args.device && typeof args.device.resetMeter === 'function') {
            await args.device.resetMeter();
          }
          return true;
        });
      }
    } catch(e) {
      this.log('[Flow]', e.message);
    }
  }
}

module.exports = DinRailMeterDriver;
