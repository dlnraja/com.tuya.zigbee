'use strict';

const BaseZigBeeDriver = require('../../lib/drivers/BaseZigBeeDriver');

/**
 * Garage Door Opener Driver - TS0601 / TS0603
 * 
 * v9.7.4: FIX - Added missing driver.js inheriting BaseZigBeeDriver
 * CRITICAL: Without this file Homey uses a generic ZigBeeDriver which
 * lacks the defensive getDeviceById() override → "Could not get device by ID" crash
 * 
 * Issue #332 (PDominikPL): QS-Zigbee-C03 / TS0603 crashed on repair/open-close
 * Issue #331 (PDominikPL): Settings tab not loading (same root cause)
 */
class GarageDoorOpenerDriver extends BaseZigBeeDriver {

  async onInit() {
    await super.onInit();
    if (this._flowCardsRegistered) return;
    this._flowCardsRegistered = true;

    this.log('[GarageDriver] ✅ Driver initialized (BaseZigBeeDriver crash protection active)');

    // Register flow card actions for garage door control
    const reg = (id, fn) => {
      try {
        const card = this.homey.flow.getActionCard(id);
        if (card) { card.registerRunListener(fn); }
      } catch (e) {
        this.log('[GarageDriver][Flow]', id, e.message);
      }
    };

    // Open garage door action
    reg('garage_door_open', async ({ device }) => {
      this.log('[GarageDriver][Flow] Open garage door');
      await device.triggerCapabilityListener('garagedoor_closed', false);
      return true;
    });

    // Close garage door action
    reg('garage_door_close', async ({ device }) => {
      this.log('[GarageDriver][Flow] Close garage door');
      await device.triggerCapabilityListener('garagedoor_closed', true);
      return true;
    });
  }
}

module.exports = GarageDoorOpenerDriver;
