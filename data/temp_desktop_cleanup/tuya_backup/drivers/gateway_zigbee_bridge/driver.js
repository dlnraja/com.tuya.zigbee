'use strict';

const { ZigBeeDriver } = require('homey-zigbeedriver');

/**
 * v5.5.582: CRITICAL FIX - Flow card run listeners were missing
 */
class ZbbridgeDriver extends ZigBeeDriver {

  async onInit() {
    this.log('ZbbridgeDriver v5.5.582 initialized');
    this._registerFlowCards();
  }

  _registerFlowCards() {
    // CONDITION: Is connected
    try {
      this.homey.flow.getConditionCard('gateway_zigbee_bridge_is_connected')
        .registerRunListener(async (args) => {
          if (!args.device) return false;
          return args.device.getAvailable() === true;
        });
      this.log('[FLOW] ✅ gateway_zigbee_bridge_is_connected');
    } catch (err) { this.log(`[FLOW] ⚠️ ${err.message}`); }

    // ACTION: Permit join
    try {
      this.homey.flow.getActionCard('gateway_zigbee_bridge_permit_join')
        .registerRunListener(async (args) => {
          if (!args.device) return false;
          this.log('[FLOW] Permit join requested');
          return true;
        });
      this.log('[FLOW] ✅ gateway_zigbee_bridge_permit_join');
    } catch (err) { this.log(`[FLOW] ⚠️ ${err.message}`); }

    // ACTION: Disable join
    try {
      this.homey.flow.getActionCard('gateway_zigbee_bridge_disable_join')
        .registerRunListener(async (args) => {
          if (!args.device) return false;
          this.log('[FLOW] Disable join requested');
          return true;
        });
      this.log('[FLOW] ✅ gateway_zigbee_bridge_disable_join');
    } catch (err) { this.log(`[FLOW] ⚠️ ${err.message}`); }

    this.log('[FLOW] 🎉 Zigbee bridge flow cards registered');
  }
}

module.exports = ZbbridgeDriver;
