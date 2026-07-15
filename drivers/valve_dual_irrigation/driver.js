'use strict';

const { ZigBeeDriver } = require('homey-zigbeedriver');

class ValveDualIrrigationDriver extends ZigBeeDriver {

  getDeviceById(id) {
    try {
      return super.getDeviceById(id);
    } catch (err) {
      this.error(`[CRASH-PREVENTION] Could not get device by id: ${id} - ${err.message}`);
      return null;
    }
  }

  async onInit() {
    await super.onInit();
    if (this._flowCardsRegistered) { return; }
    this._flowCardsRegistered = true;

    this.log('ValveDualIrrigationDriver initialized');

    // v9.0.261 (P63.1): Register flow card action handlers.
    // The driver.flow.compose.json declared cards
    // (valve_dual_irrigation_valve_irrigation_turn_on/off/toggle) but the
    // driver never wired listeners — the run listener body was missing.
    // Forum post #2102/#2105 (Joep_Vullings, 2026-07-03 / 2026-07-06):
    // "I re-paired my two way irrigation valve and it connected and is
    //  sending the right battery level, but the buttons don't work".
    // Root cause: flow actions fired but had no listener, so they were
    // silently no-op. Wire the run listeners here. Both valve_1 and
    // valve_2 respond to the same flow card (acts on whichever the user
    // picks via the flow's "this device" reference).
    const reg = (id, fn) => {
      try {
        const card = this.homey.flow.getActionCard(id);
        if (card) { card.registerRunListener(fn); }
      } catch (e) {
        this.log('[Flow]', id, e.message);
      }
    };

    const setValve = async (device, capability, value) => {
      if (!device) { return false; }
      try {
        if (typeof device.setCapabilityValue === 'function') {
          await device.setCapabilityValue(capability, !!value);
        }
        if (typeof device.safeSetCapabilityValue === 'function') {
          await device.safeSetCapabilityValue(capability, !!value).catch(() => {});
        }
        return true;
      } catch (e) {
        this.log('[Flow] setValve error:', e.message);
        return false;
      }
    };

    reg('valve_dual_irrigation_valve_irrigation_turn_on', async ({ device }) => {
      // Prefer valve_1 if the device has it, fallback to onoff.
      const cap = (device && typeof device.hasCapability === 'function' && device.hasCapability('onoff.valve_1'))
        ? 'onoff.valve_1'
        : 'onoff';
      return setValve(device, cap, true);
    });

    reg('valve_dual_irrigation_valve_irrigation_turn_off', async ({ device }) => {
      const cap = (device && typeof device.hasCapability === 'function' && device.hasCapability('onoff.valve_1'))
        ? 'onoff.valve_1'
        : 'onoff';
      return setValve(device, cap, false);
    });

    reg('valve_dual_irrigation_valve_irrigation_toggle', async ({ device }) => {
      if (!device) { return false; }
      const cap = (typeof device.hasCapability === 'function' && device.hasCapability('onoff.valve_1'))
        ? 'onoff.valve_1'
        : 'onoff';
      const current = (typeof device.getCapabilityValue === 'function') ? !!device.getCapabilityValue(cap) : false;
      return setValve(device, cap, !current);
    });
  }

}

module.exports = ValveDualIrrigationDriver;
