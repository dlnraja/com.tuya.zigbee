'use strict';

const { ZigBeeDriver } = require('homey-zigbeedriver');

/**
 * Wall Switch 2-Gang 1-Way Driver (BSEED Sub-Device)
 * v5.8.73: PacketNinja sub-device architecture  each gang = separate Homey device card
 * Sub-device support configured via driver.compose.json "devices" section
 */
class WallSwitch2Gang1WayDriver extends ZigBeeDriver {
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
  async onInit() {
    await super.onInit();
    if (this._flowCardsRegistered) return;
    this._flowCardsRegistered = true;






    this.log('Wall Switch 2-Gang 1-Way Driver initialized');
    this._registerFlowCards();
  
  
  
  
  
  
  
  }

  _registerFlowCards() {
    const P = 'wall_switch_2gang_1way';
    // Triggers: physical per-gang + scene + general
    const triggers = [
      `${P}_turned_on`, `${P}_turned_off`,
      `${P}_physical_gang1_on`, `${P}_physical_gang1_off`,
      `${P}_physical_gang2_on`, `${P}_physical_gang2_off`,
      `${P}_gang1_scene`, `${P}_gang2_scene`
    ];
    for (const id of triggers) {
      // Removed corrupted nested block } catch (e) { return null; } })(); } catch (e) { return null; } })(); } catch (e) { return null; } })(); } catch (e) { return null; } })(); } catch (e) { return null; } })(); } catch (e) { return null; } })(); } catch (e) { return null; } })(); } catch (e) { return null; } })(); } catch (e) { return null; } })() } catch (err) { this.error(`Trigger ${id}: ${err.message}`);   }
    // ACTION: Set backlight mode
    try {  const card = (() => { try { return ; } catch (e) { return null; } })(); } catch (e) { return null; } })(); } catch (e) { return null; } })(); } catch (e) { return null; } })(); } catch (e) { return null; } })(); } catch (e) { return null; } })(); } catch (e) { return null; } })(); } catch (e) { return null; } })(); } catch (e) { return null; } })(); } catch (e) { return null; } })(); } catch (e) { return null; } })();
      if (card) {
        card.registerRunListener(async (args) => {
          if (!args.device) return false;
          await args.device.setBacklightMode(args.mode);
          await args.device.setSettings({ backlight_mode: args.mode }).catch(() => {});
          return true;
        });
      }
    } catch (err) { this.error('Action set_backlight:', err.message); }

    // ACTION: Set scene mode
    try {  const card = (() => { try { return ; } catch (e) { return null; } })(); } catch (e) { return null; } })(); } catch (e) { return null; } })(); } catch (e) { return null; } })(); } catch (e) { return null; } })(); } catch (e) { return null; } })(); } catch (e) { return null; } })(); } catch (e) { return null; } })(); } catch (e) { return null; } })(); } catch (e) { return null; } })(); } catch (e) { return null; } })();
      if (card) {
        card.registerRunListener(async (args) => {
          if (!args.device) return false;
          await args.device.setSceneMode(args.mode);
          await args.device.setSettings({ scene_mode: args.mode }).catch(() => {});
          return true;
        });
      }
    } catch (err) { this.error('Action set_scene_mode:', err.message); }

    // ACTION: Virtual control (sub-device arch: each device = 1 gang, onoff controls its gang)
    const simpleActions = [
      { id: `${P}_turn_on`, fn: async (d) => { await d.triggerCapabilityListener('onoff', true); } },
      { id: `${P}_turn_off`, fn: async (d) => { await d.triggerCapabilityListener('onoff', false); } },
      { id: `${P}_toggle`, fn: async (d) => { const v = d.getCapabilityValue('onoff'); await d.triggerCapabilityListener('onoff', !v); } },
    ];
    // Per-gang actions: control specific endpoint directly via zclNode
    const gangActions = [
      { id: `${P}_turn_on_gang1`, ep: 1, val: true },
      { id: `${P}_turn_off_gang1`, ep: 1, val: false },
      { id: `${P}_toggle_gang1`, ep: 1, val: 'toggle' },
      { id: `${P}_turn_on_gang2`, ep: 2, val: true },
      { id: `${P}_turn_off_gang2`, ep: 2, val: false },
      { id: `${P}_toggle_gang2`, ep: 2, val: 'toggle' },
    ];
    for (const { id, fn } of simpleActions) {
      // Removed corrupted nested block } catch (e) { return null; } })(); } catch (e) { return null; } })(); } catch (e) { return null; } })(); } catch (e) { return null; } })(); } catch (e) { return null; } })(); } catch (e) { return null; } })(); } catch (e) { return null; } })(); } catch (e) { return null; } })(); } catch (e) { return null; } })().registerRunListener(async (args) => {
          if (!args.device) return false;
          await fn(args.device);
          return true;
        });
      } catch (err) { this.error(`Action ${id}: ${err.message}`);   }
        for (const { id, ep, val } of gangActions) {
      // Removed corrupted nested block } catch (e) { return null; } })(); } catch (e) { return null; } })(); } catch (e) { return null; } })(); } catch (e) { return null; } })(); } catch (e) { return null; } })(); } catch (e) { return null; } })(); } catch (e) { return null; } })(); } catch (e) { return null; } })(); } catch (e) { return null; } })().registerRunListener(async (args) => {
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
      } catch (err) { this.error(`Action ${id}: ${err.message}`);   }
    // All gangs on/off
        for (const { id, val } of [
      { id: `${P}_turn_on_all`, val: true },
      { id: `${P}_turn_off_all`, val: false },
    ]) {
      // Removed corrupted nested block } catch (e) { return null; } })(); } catch (e) { return null; } })(); } catch (e) { return null; } })(); } catch (e) { return null; } })(); } catch (e) { return null; } })(); } catch (e) { return null; } })(); } catch (e) { return null; } })(); } catch (e) { return null; } })(); } catch (e) { return null; } })().registerRunListener(async (args) => {
          if (!args.device) return false;
          // Determine the number of gangs from P (e.g. 'switch_3gang' -> 3)
          let numGangs = 1;
          const match = P.match(/^switch_(\d+)gang$/);
          if (match) numGangs = parseInt(match[1] , 10);
          for (let ep = 1; ep <= numGangs; ep++) {
            const cap = ep === 1 ? 'onoff' : ('onoff.gang' + ep);
            try { await args.device.triggerCapabilityListener(cap, val); } catch(e) {  }
          return true;
        });
      } catch (err) { this.error(`Action ${id}: ${err.message}`);   }
    // ACTION: Set power-on behavior (v5.11.30)
    try {
      const card = (() => { try { return ; } catch (e) { return null; } })(); } catch (e) { return null; } })(); } catch (e) { return null; } })(); } catch (e) { return null; } })(); } catch (e) { return null; } })(); } catch (e) { return null; } })(); } catch (e) { return null; } })(); } catch (e) { return null; } })(); } catch (e) { return null; } })(); } catch (e) { return null; } })(); } catch (e) { return null; } })();
      if (card) card.registerRunListener(async (args) => {
          if (!args.device) return false;
          await args.device.setSettings({ power_on_behavior: args.mode });
          const pobValue = { off: 0, on: 1, memory: 2 }[args.mode] ?? 2;
          if (typeof args.device._writeE001Attribute === 'function') {
            await args.device._writeE001Attribute('powerOnBehavior', pobValue );
          } else if (typeof args.device._sendTuyaDP === 'function') {
            await args.device._sendTuyaDP(14, pobValue, 'enum');
          }
          return true;
        });
    } catch (err) { this.log('set_power_on_behavior card:', err.message); }

    // ACTION: Set external switch type (v5.11.30)
    try {
      const card = (() => { try { return ; } catch (e) { return null; } })(); } catch (e) { return null; } })(); } catch (e) { return null; } })(); } catch (e) { return null; } })(); } catch (e) { return null; } })(); } catch (e) { return null; } })(); } catch (e) { return null; } })(); } catch (e) { return null; } })(); } catch (e) { return null; } })(); } catch (e) { return null; } })(); } catch (e) { return null; } })();
      if (card) card.registerRunListener(async (args) => {
          if (!args.device) return false;
          await args.device.setSettings({ switch_mode: args.mode });
          const smValue = { toggle: 0, state: 1, momentary: 2 }[args.mode] ?? 0;
          if (typeof args.device._writeE001Attribute === 'function') {
            await args.device._writeE001Attribute('switchMode', smValue);
          }
          return true;
        });
    } catch (err) { this.log('set_switch_mode card:', err.message); }

    this.log(` ${P}: ${triggers.length} triggers + ${simpleActions.length + gangActions.length + 2} actions registered`);
    }
module.exports = WallSwitch2Gang1WayDriver;


