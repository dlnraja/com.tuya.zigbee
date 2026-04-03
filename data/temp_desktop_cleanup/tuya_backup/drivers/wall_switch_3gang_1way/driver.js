'use strict';

const { ZigBeeDriver } = require('homey-zigbeedriver');

class WallSwitch3Gang1WayDriver extends ZigBeeDriver {
  async onInit() {
    this.log('Wall Switch 3-Gang 1-Way Driver initialized');
    this._registerFlowCards();
  }

  _registerFlowCards() {
    const P = 'wall_switch_3gang_1way';
    const triggers = [
      `${P}_turned_on`, `${P}_turned_off`,
      `${P}_physical_gang1_on`, `${P}_physical_gang1_off`,
      `${P}_physical_gang2_on`, `${P}_physical_gang2_off`,
      `${P}_physical_gang3_on`, `${P}_physical_gang3_off`,
      `${P}_gang1_scene`, `${P}_gang2_scene`, `${P}_gang3_scene`
    ];
    for (const id of triggers) {
      try { this.homey.flow.getDeviceTriggerCard(id); } catch (e) { this.error(`Trigger ${id}: ${e.message}`); }
    }

    try {
      this.homey.flow.getActionCard(`${P}_set_backlight`)
        .registerRunListener(async (args) => {
          if (!args.device) return false;
          await args.device.setBacklightMode(args.mode);
          await args.device.setSettings({ backlight_mode: args.mode }).catch(() => {});
          return true;
        });
    } catch (err) { this.error('Action set_backlight:', err.message); }

    try {
      this.homey.flow.getActionCard(`${P}_set_scene_mode`)
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
    ];
    for (const { id, fn } of simpleActions) {
      try {
        this.homey.flow.getActionCard(id).registerRunListener(async (args) => {
          if (!args.device) return false;
          await fn(args.device);
          return true;
        });
      } catch (err) { this.error(`Action ${id}: ${err.message}`); }
    }
    for (const { id, ep, val } of gangActions) {
      try {
        this.homey.flow.getActionCard(id).registerRunListener(async (args) => {
          if (!args.device) return false;
          const onOff = args.device.zclNode?.endpoints?.[ep]?.clusters?.onOff;
          if (!onOff) return false;
          if (val === 'toggle') { await onOff.toggle(); }
          else { await onOff[val ? 'setOn' : 'setOff'](); }
          return true;
        });
      } catch (err) { this.error(`Action ${id}: ${err.message}`); }
    }
    for (const { id, val } of [
      { id: `${P}_turn_on_all`, val: true },
      { id: `${P}_turn_off_all`, val: false },
    ]) {
      try {
        this.homey.flow.getActionCard(id).registerRunListener(async (args) => {
          if (!args.device) return false;
          for (let ep = 1; ep <= 3; ep++) {
            const onOff = args.device.zclNode?.endpoints?.[ep]?.clusters?.onOff;
            if (onOff) await onOff[val ? 'setOn' : 'setOff']().catch(() => {});
          }
          return true;
        });
      } catch (err) { this.error(`Action ${id}: ${err.message}`); }
    }

    // ACTION: Set power-on behavior (v5.11.30)
    try {
      this.homey.flow.getActionCard(`${P}_set_power_on_behavior`)
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
      this.homey.flow.getActionCard(`${P}_set_switch_mode`)
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

module.exports = WallSwitch3Gang1WayDriver;
