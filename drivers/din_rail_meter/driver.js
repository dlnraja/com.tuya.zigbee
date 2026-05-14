'use strict';

const { Driver } = require('homey');

class DinRailMeterDriver extends Driver {
  async onInit() {
    this.log('Din Rail Meter driver v5.13.6 initialized');
    
    // v5.13.6: Fix "getDeviceConditionCard is not a function" crash
    // Register condition cards from driver.flow.compose.json
    
    // Action: Reset meter
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
      this.log('[Flow] reset_meter error:', e.message);
    }
    
    // Condition: Power above
    try {
      (() => { try { return this.homey.flow.getConditionCard('din_rail_meter_power_above'); } catch(e) { return null; } })()?.registerRunListener(async (args) => {
        if (!args.device) return false;
        try {
          const power = await args.device.getCapabilityValue('measure_power');
          return power !== null && power > args.power;
        } catch (e) {
          this.log('[Condition] power_above error:', e.message);
          return false;
        }
      });
    } catch(e) {
      this.log('[Flow] power_above condition error:', e.message);
    }
  }
}

module.exports = DinRailMeterDriver;
