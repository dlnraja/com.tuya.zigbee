'use strict';

const { ZigBeeDriver } = require('homey-zigbeedriver');

/**
 * Wall Switch 2-Gang 1-Way Driver v7.5.8
 * BSEED Sub-Device: each gang = separate Homey device
 */
class WallSwitch2Gang1WayDriver extends ZigBeeDriver {
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
    if (this._flowCardsRegistered) return;
    this._flowCardsRegistered = true;

    this.log('WallSwitch2Gang1WayDriver v7.5.8 initialized');
    this._registerFlowCards();
  }

  _registerFlowCards() {
    const P = 'wall_switch_2gang_1way';

    // Helper function for safe card registration
    const safeRegister = (type, id, handler) => {
      try {
        const card = type === 'condition' 
          ? this.homey.flow.getConditionCard(id)
          : this.homey.flow.getActionCard(id);
        if (card) {
          card.registerRunListener(handler);
          this.log(`[FLOW] Registered: ${id}`);
        } else {
          this.log(`[FLOW] Card not found: ${id}`);
        }
      } catch (err) {
        this.error(`[FLOW] Failed to register ${id}: ${err.message}`);
      }
    };

    // Triggers
    const triggers = [
      `${P}_turned_on`, `${P}_turned_off`,
      `${P}_physical_gang1_on`, `${P}_physical_gang1_off`,
      `${P}_physical_gang2_on`, `${P}_physical_gang2_off`,
      `${P}_gang1_scene`, `${P}_gang2_scene`
    ];
    triggers.forEach(id => {
      try {
        this.homey.flow.getTriggerCard(id);
        this.log(`[FLOW] Trigger: ${id}`);
      } catch (err) {
        this.error(`[FLOW] Trigger ${id}: ${err.message}`);
      }
    });

    // ACTION: set_backlight
    safeRegister('action', `${P}_set_backlight`, async (args) => {
      if (!args.device) return false;
      await args.device.setBacklightMode(args.mode);
      await args.device.setSettings({ backlight_mode: args.mode }).catch(() => {});
      return true;
    });

    // ACTION: set_scene_mode
    safeRegister('action', `${P}_set_scene_mode`, async (args) => {
      if (!args.device) return false;
      await args.device.setSceneMode(args.mode);
      await args.device.setSettings({ scene_mode: args.mode }).catch(() => {});
      return true;
    });

    // Simple actions
    const simpleActions = [
      { id: `${P}_turn_on`, fn: async (d) => { await d.triggerCapabilityListener('onoff', true); } },
      { id: `${P}_turn_off`, fn: async (d) => { await d.triggerCapabilityListener('onoff', false); } },
      { id: `${P}_toggle`, fn: async (d) => { const v = d.getCapabilityValue('onoff'); await d.triggerCapabilityListener('onoff', !v); } },
    ];
    simpleActions.forEach(({ id, fn }) => {
      safeRegister('action', id, async (args) => {
        if (!args.device) return false;
        await fn(args.device);
        return true;
      });
    });

    // Per-gang actions
    const gangActions = [
      { id: `${P}_turn_on_gang1`, ep: 1, val: true },
      { id: `${P}_turn_off_gang1`, ep: 1, val: false },
      { id: `${P}_toggle_gang1`, ep: 1, val: 'toggle' },
      { id: `${P}_turn_on_gang2`, ep: 2, val: true },
      { id: `${P}_turn_off_gang2`, ep: 2, val: false },
      { id: `${P}_toggle_gang2`, ep: 2, val: 'toggle' },
    ];
    gangActions.forEach(({ id, ep, val }) => {
      safeRegister('action', id, async (args) => {
        if (!args.device) return false;
        const cap = ep === 1 ? 'onoff' : ('onoff.gang' + ep);
        try {
          if (val === 'toggle') {
            await args.device.triggerCapabilityListener(cap, !args.device.getCapabilityValue(cap));
          } else {
            await args.device.triggerCapabilityListener(cap, val);
          }
        } catch(e) {
          args.device.error('Flow Action Error:', e);
        }
        return true;
      });
    });

    // All gangs on/off
    [{ id: `${P}_turn_on_all`, val: true }, { id: `${P}_turn_off_all`, val: false }].forEach(({ id, val }) => {
      safeRegister('action', id, async (args) => {
        if (!args.device) return false;
        for (let ep = 1; ep <= 2; ep++) {
          const cap = ep === 1 ? 'onoff' : ('onoff.gang' + ep);
          try { await args.device.triggerCapabilityListener(cap, val); } catch(e) {}
        }
        return true;
      });
    });

    // ACTION: set_power_on_behavior
    safeRegister('action', `${P}_set_power_on_behavior`, async (args) => {
      if (!args.device) return false;
      await args.device.setSettings({ power_on_behavior: args.mode });
      const pobValue = { off: 0, on: 1, memory: 2 }[args.mode] ?? 2;
      if (typeof args.device._writeE001Attribute === 'function') {
        await args.device._writeE001Attribute('powerOnBehavior', pobValue);
      } else if (typeof args.device._sendTuyaDP === 'function') {
        await args.device._sendTuyaDP(14, pobValue, 'enum');
      }
      return true;
    });

    // ACTION: set_switch_mode
    safeRegister('action', `${P}_set_switch_mode`, async (args) => {
      if (!args.device) return false;
      await args.device.setSettings({ switch_mode: args.mode });
      const smValue = { toggle: 0, state: 1, momentary: 2 }[args.mode] ?? 0;
      if (typeof args.device._writeE001Attribute === 'function') {
        await args.device._writeE001Attribute('switchMode', smValue);
      }
      return true;
    });

    this.log(`[FLOW] ${P}: ${triggers.length} triggers + actions registered`);
  }
}

module.exports = WallSwitch2Gang1WayDriver;