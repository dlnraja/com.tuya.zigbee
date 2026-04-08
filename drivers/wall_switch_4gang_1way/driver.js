'use strict';

const { ZigBeeDriver } = require('homey-zigbeedriver');

class WallSwitch4Gang1WayDriver extends ZigBeeDriver {
  /**
   * v7.0.12: Defensive getDeviceById override to prevent crashes during deserialization.
   * If a device cannot be found (e.g. removed while flow is triggering), return null instead of throwing.
   */
  getDeviceById(id) {
    try {
      return super.getDeviceById(id);
    } catch (err) {
      this.error(`[CRASH-PREVENTION] Could not get device by id: ${id} - ${err.message}`);
      return null;
    }
  }

  async onInit() {
    this.log('Wall Switch 4-Gang 1-Way Driver initialized');
    this._registerFlowCards();
  }

  _registerFlowCards() {
    const P = 'wall_switch_4gang_1way';
    const triggers = [
      `${P}_turned_on`, `${P}_turned_off`,
      `${P}_physical_gang1_on`, `${P}_physical_gang1_off`,
      `${P}_physical_gang2_on`, `${P}_physical_gang2_off`,
      `${P}_physical_gang3_on`, `${P}_physical_gang3_off`,
      `${P}_physical_gang4_on`, `${P}_physical_gang4_off`,
      `${P}_gang1_scene`, `${P}_gang2_scene`, `${P}_gang3_scene`, `${P}_gang4_scene`
    ];
    for (const id of triggers) {
      try { (() => { try { return this.homey.flow.getTriggerCard(id); } catch (e) { this.error('[FLOW-SAFE] Failed to load card:', e.message); return null; } })(); } catch (e) { this.error(`Trigger ${id}: ${e.message}`); }
    }

    try {
      (() => { try { return this.homey.flow.getActionCard(`${P}_set_backlight`); } catch (e) { this.error('[FLOW-SAFE] Failed to load card:', e.message); return null; } })()
        .registerRunListener(async (args) => {
          if (!args.device) return false;
          await args.device.setBacklightMode(args.mode);
          await args.device.setSettings({ backlight_mode: args.mode }).catch(() => {});
          return true;
        });
    } catch (err) { this.error('Action set_backlight:', err.message); }

    try {
      (() => { try { return this.homey.flow.getActionCard(`${P}_set_scene_mode`); } catch (e) { this.error('[FLOW-SAFE] Failed to load card:', e.message); return null; } })()
        .registerRunListener(async (args) => {
          if (!args.device) return false;
          await args.device.setSceneMode(args.mode);
          await args.device.setSettings({ scene_mode: args.mode }).catch(() => {});
          return true;
        });
    } catch (err) { this.error('Action set_scene_mode:', err.message); }

    // Virtual control (sub-device arch: each device = 1 gang)
    const simpleActions = [
      { id: `${P}_turn_on`, fn: async (d) => { await d.triggerCapabilityListener('onoff', true); } },
      { id: `${P}_turn_off`, fn: async (d) => { await d.triggerCapabilityListener('onoff', false); } },
      { id: `${P}_toggle`, fn: async (d) => { const v = d.getCapabilityValue('onoff'); await d.triggerCapabilityListener('onoff', !v); } },
    ];
    // Per-gang: control specific endpoint via zclNode
    const gangActions = [
      { id: `${P}_turn_on_gang1`, ep: 1, val: true },
      { id: `${P}_turn_off_gang1`, ep: 1, val: false },
      { id: `${P}_toggle_gang1`, ep: 1, val: 'toggle' },
      { id: `${P}_turn_on_gang2`, ep: 2, val: true },
      { id: `${P}_turn_off_gang2`, ep: 2, val: false },
      { id: `${P}_toggle_gang2`, ep: 2, val: 'toggle' },
      { id: `${P}_turn_on_gang3`, ep: 3, val: true },
      { id: `${P}_turn_off_gang3`, ep: 3, val: false },
      { id: `${P}_toggle_gang3`, ep: 3, val: 'toggle' },
      { id: `${P}_turn_on_gang4`, ep: 4, val: true },
      { id: `${P}_turn_off_gang4`, ep: 4, val: false },
      { id: `${P}_toggle_gang4`, ep: 4, val: 'toggle' },
    ];
    for (const { id, fn } of simpleActions) {
      try {
        (() => { try { return this.homey.flow.getActionCard(id); } catch (e) { this.error('[FLOW-SAFE] Failed to load card:', e.message); return null; } })().registerRunListener(async (args) => {
          if (!args.device) return false;
          await fn(args.device);
          return true;
        });
      } catch (err) { this.error(`Action ${id}: ${err.message}`); }
    }
        for (const { id, ep, val } of gangActions) {
      try {
        (() => { try { return this.homey.flow.getActionCard(id); } catch (e) { this.error('[FLOW-SAFE] Failed to load card:', e.message); return null; } })().registerRunListener(async (args) => {
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
      } catch (err) { this.error(`Action ${id}: ${err.message}`); }
    }
        for (const { id, val } of [
      { id: `${P}_turn_on_all`, val: true },
      { id: `${P}_turn_off_all`, val: false },
    ]) {
      try {
        (() => { try { return this.homey.flow.getActionCard(id); } catch (e) { this.error('[FLOW-SAFE] Failed to load card:', e.message); return null; } })().registerRunListener(async (args) => {
          if (!args.device) return false;
          // Determine the number of gangs from P (e.g. 'switch_3gang' -> 3)
          let numGangs = 1;
          const match = P.match(/^switch_(\d+)gang$/);
          if (match) numGangs = parseInt(match[1], 10);
          for (let ep = 1; ep <= numGangs; ep++) {
            const cap = ep === 1 ? 'onoff' : ('onoff.gang' + ep);
            try { await args.device.triggerCapabilityListener(cap, val); } catch(e) {}
          }
          return true;
        });
      } catch (err) { this.error(`Action ${id}: ${err.message}`); }
    }

    // ACTION: Set power-on behavior (v5.11.30)
    try {
      (() => { try { return this.homey.flow.getActionCard(`${P}_set_power_on_behavior`); } catch (e) { this.error('[FLOW-SAFE] Failed to load card:', e.message); return null; } })()
        .registerRunListener(async (args) => {
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
    } catch (err) { this.log('set_power_on_behavior card:', err.message); }

    // ACTION: Set external switch type (v5.11.30)
    try {
      (() => { try { return this.homey.flow.getActionCard(`${P}_set_switch_mode`); } catch (e) { this.error('[FLOW-SAFE] Failed to load card:', e.message); return null; } })()
        .registerRunListener(async (args) => {
          if (!args.device) return false;
          await args.device.setSettings({ switch_mode: args.mode });
          const smValue = { toggle: 0, state: 1, momentary: 2 }[args.mode] ?? 0;
          if (typeof args.device._writeE001Attribute === 'function') {
            await args.device._writeE001Attribute('switchMode', smValue);
          }
          return true;
        });
    } catch (err) { this.log('set_switch_mode card:', err.message); }

    this.log(`✅ ${P}: ${triggers.length} triggers + ${simpleActions.length + gangActions.length + 2} actions registered`);
  }
}

module.exports = WallSwitch4Gang1WayDriver;

