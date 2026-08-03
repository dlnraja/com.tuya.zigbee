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

    // v9.0.262 (P63.2): setCapabilityValue() alone only updates Homey state —
    // SDK3 does NOT invoke capability listeners on programmatic sets, so the
    // P63.1 run listeners updated the UI but the valve never actuated
    // (forum #2102/#2105: "the right actions, but isn't working"). Route the
    // command through the device's physical DP sender instead.
    const setValve = async (device, capability, value) => {
      if (!device) { return false; }
      const dp = capability === 'onoff.valve_2' ? 2 : 1;
      if (typeof device._sendValveDP === 'function') {
        return device._sendValveDP(dp, capability, !!value);
      }
      if (typeof device.sendDP === 'function') {
        await device.sendDP(dp, !!value, 'bool');
        await device.safeSetCapabilityValue?.(capability, !!value).catch(() => {});
        return true;
      }
      if (typeof device.setCapabilityValue === 'function') {
        await device.setCapabilityValue(capability, !!value);
        return true;
      }
      return false;
    };

    reg('valve_dual_irrigation_valve_irrigation_turn_on', async ({ device }) => {
      // Prefer valve_1 if the device has it, fallback to onoff.
      const cap = device && typeof device.hasCapability === 'function' && device.hasCapability('onoff.valve_1')
        ? 'onoff.valve_1'
        : 'onoff';
      return setValve(device, cap, true);
    });

    reg('valve_dual_irrigation_valve_irrigation_turn_off', async ({ device }) => {
      const cap = device && typeof device.hasCapability === 'function' && device.hasCapability('onoff.valve_1')
        ? 'onoff.valve_1'
        : 'onoff';
      return setValve(device, cap, false);
    });

    reg('valve_dual_irrigation_valve_irrigation_toggle', async ({ device }) => {
      if (!device) { return false; }
      const cap = typeof device.hasCapability === 'function' && device.hasCapability('onoff.valve_1')
        ? 'onoff.valve_1'
        : 'onoff';
      const current = typeof device.getCapabilityValue === 'function' ? !!device.getCapabilityValue(cap) : false;
      return setValve(device, cap, !current);
    });

    // v9.0.262 (P63.2): the is_on condition card was declared in
    // driver.flow.compose.json but had no run listener, so any flow using it
    // failed. Wire it to the current valve state.
    try {
      const condition = this.homey.flow.getConditionCard('valve_dual_irrigation_valve_irrigation_is_on');
      if (condition) {
        condition.registerRunListener(async ({ device }) => {
          if (!device) { return false; }
          const cap = typeof device.hasCapability === 'function' && device.hasCapability('onoff.valve_1')
            ? 'onoff.valve_1'
            : 'onoff';
          return typeof device.getCapabilityValue === 'function' ? !!device.getCapabilityValue(cap) : false;
        });
      }
    } catch (e) {
      this.log('[Flow]', 'valve_dual_irrigation_valve_irrigation_is_on', e.message);
    }
  }

}

module.exports = ValveDualIrrigationDriver;
