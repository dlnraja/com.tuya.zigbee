'use strict';

const BaseZigBeeDriver = require('../../lib/drivers/BaseZigBeeDriver');
const { registerButtonFlowCards } = require('../../lib/FlowCardHelper');

/**
 * ButtonWireless4 Driver - v7.5.52
 * Provides crash-prevention device ID lookup + safe init
 */
class ButtonWireless4Driver extends BaseZigBeeDriver {
async onInit() {
    await super.onInit();
    if (this._flowCardsRegistered) {return;}
    this._flowCardsRegistered = true;

    const driverId = this.id || this.manifest?.id || 'button_wireless_4';
    this.log(`Button Wireless 4 Driver initialized [v7.5.52] for ${driverId}`);
    registerButtonFlowCards(this, driverId, 4);
    // 2026-10-11 fold: FUT089Z zone triggers (fire only for that exact couple; zone filter run listener)
    try {
      const { EVENTS, TRIGGER_PREFIX } = require('../../lib/devices/MiBoxerFut089zZones');
      for (const ev of EVENTS) {
        try {
          this.homey.flow.getDeviceTriggerCard(`${TRIGGER_PREFIX}${ev}`)
            .registerRunListener(async (args, state) => args.zone_filter === 'any' || Number(args.zone_filter) === Number(state.zone));
        } catch (e) { this.error(`FUT089Z trigger ${ev}: ${e.message}`); }
      }
    } catch (e) { this.error('FUT089Z cards:', e.message); }
  }
}

module.exports = ButtonWireless4Driver;
