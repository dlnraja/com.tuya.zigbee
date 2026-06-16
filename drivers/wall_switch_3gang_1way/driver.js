'use strict';

const { ZigBeeDriver } = require('homey-zigbeedriver');

class WallSwitch3Gang1WayDriver extends ZigBeeDriver {
  async onInit() {
    this.log('Wall Switch 3-Gang 1-Way Driver initialized');
    this._registerFlowCards();
  }

  async _registerFlowCards() {
    const P = 'wall_switch_3gang_1way';
    const triggers = [
      `${P}_turned_on`, `${P}_turned_off`,
      `${P}_physical_gang1_on`, `${P}_physical_gang1_off`,
      `${P}_physical_gang2_on`, `${P}_physical_gang2_off`,
      `${P}_physical_gang3_on`, `${P}_physical_gang3_off`,
      `${P}_gang1_scene`, `${P}_gang2_scene`, `${P}_gang3_scene`
    ];

    for (const id of triggers) {
      try {
        this.homey.flow.getDeviceTriggerCard(id);
      } catch (err) {
        this.error(`Trigger ${id} registration error: ${err.message}`);
      }
    }

    // ACTION: Set backlight mode
    try {
      const backlightCard = this.homey.flow.getActionCard(`${P}_set_backlight`);
      if (backlightCard) {
        backlightCard.registerRunListener(async (args) => {
          if (!args.device) {return false;}
          await args.device.setBacklightMode(args.mode);
          await args.device.setSettings({ backlight_mode: args.mode }).catch(() => { });
          return true;
        });
      }
    } catch (err) {
      this.error('Action set_backlight error:', err.message);
    }

    // ACTION: Set scene mode
    try {
      const sceneModeCard = this.homey.flow.getActionCard(`${P}_set_scene_mode`);
      if (sceneModeCard) {
        sceneModeCard.registerRunListener(async (args) => {
          if (!args.device) {return false;}
          await args.device.setSceneMode(args.mode);
          await args.device.setSettings({ scene_mode: args.mode }).catch(() => { });
          return true;
        });
      }
    } catch (err) {
      this.error('Action set_scene_mode error:', err.message);
    }

    // Virtual control
    const simpleActions = [
      { id: `${P}_turn_on`, fn: async (d) => { await d.triggerCapabilityListener('onoff', true); } },
      { id: `${P}_turn_off`, fn: async (d) => { await d.triggerCapabilityListener('onoff', false); } },
      { id: `${P}_toggle`, fn: async (d) => { const v = d.getCapabilityValue('onoff'); await d.triggerCapabilityListener('onoff', !v); } },
    ];

    for (const { id, fn } of simpleActions) {
      try {
        const card = this.homey.flow.getActionCard(id);
        if (card) {
          card.registerRunListener(async (args) => {
            if (!args.device) {return false;}
            await fn(args.device);
            return true;
          });
        }
      } catch (err) {
        this.error(`Action ${id} error: ${err.message}`);
      }
    }

    // Per-gang actions
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

    for (const { id, ep, val } of gangActions) {
      try {
        const card = this.homey.flow.getActionCard(id);
        if (card) {
          card.registerRunListener(async (args) => {
            if (!args.device) {return false;}
            const cap = ep === 1 ? 'onoff' : `onoff.gang${  ep}`;
            try {
              if (val === 'toggle') {
                await args.device.triggerCapabilityListener(cap, !args.device.getCapabilityValue(cap));
              } else {
                await args.device.triggerCapabilityListener(cap, val);
              }
            } catch (e) {
              args.device.error('Flow Action Error:', e);
            }
            return true;
          });
        }
      } catch (err) {
        this.error(`Action ${id} error: ${err.message}`);
      }
    }

    // All gangs on/off
    const allActions = [
      { id: `${P}_turn_on_all`, val: true },
      { id: `${P}_turn_off_all`, val: false },
    ];

    for (const { id, val } of allActions) {
      try {
        const card = this.homey.flow.getActionCard(id);
        if (card) {
          card.registerRunListener(async (args) => {
            if (!args.device) {return false;}
            const numGangs = 3;
            for (let ep = 1; ep <= numGangs; ep++) {
              const cap = ep === 1 ? 'onoff' : `onoff.gang${  ep}`;
              await args.device.triggerCapabilityListener(cap, val).catch(() => {});
            }
            return true;
          });
        }
      } catch (err) {
        this.error(`Action ${id} error: ${err.message}`);
      }
    }

    // ACTION: Set power-on behavior
    try {
      const pobCard = this.homey.flow.getActionCard(`${P}_set_power_on_behavior`);
      if (pobCard) {
        pobCard.registerRunListener(async (args) => {
          if (!args.device) {return false;}
          await args.device.setSettings({ power_on_behavior: args.mode });
          const pobValue = { off: 0, on: 1, memory: 2 }[args.mode] ?? 2;
          if (typeof args.device._writeE001Attribute === 'function') {
            await args.device._writeE001Attribute('powerOnBehavior', pobValue);
          } else if (typeof args.device._sendTuyaDP === 'function') {
            await args.device._sendTuyaDP(14, pobValue, 'enum');
          }
          return true;
        });
      }
    } catch (err) {
      this.log('set_power_on_behavior card error:', err.message);
    }

    // ACTION: Set external switch type
    try {
      const switchModeCard = this.homey.flow.getActionCard(`${P}_set_switch_mode`);
      if (switchModeCard) {
        switchModeCard.registerRunListener(async (args) => {
          if (!args.device) {return false;}
          await args.device.setSettings({ switch_mode: args.mode });
          const smValue = { toggle: 0, state: 1, momentary: 2 }[args.mode] ?? 0;
          if (typeof args.device._writeE001Attribute === 'function') {
            await args.device._writeE001Attribute('switchMode', smValue);
          }
          return true;
        });
      }
    } catch (err) {
      this.log('set_switch_mode card error:', err.message);
    }

    this.log(`✅ ${P}: flow cards registered`);
  }
}

module.exports = WallSwitch3Gang1WayDriver;
