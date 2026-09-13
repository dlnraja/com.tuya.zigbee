'use strict';

const { Driver } = require('homey');

/**
 * P2485 — wire gang TX + backlight / power-on / child-lock / countdown.
 * Prefer device._setGangOnOff (EF00 write) over setCapabilityValue-only.
 */
class WallSwitch4GangTuyaDriver extends Driver {
  async onInit() {
    await super.onInit();
    if (this._flowCardsRegistered) return;
    this._flowCardsRegistered = true;

    const gangAction = async (args, gang, value) => {
      if (!args.device) return false;
      if (typeof args.device._setGangOnOff === 'function') {
        await args.device._setGangOnOff(gang, value);
      } else {
        await args.device.setCapabilityValue('onoff', value).catch(() => {});
      }
      return true;
    };

    const toggleGang = async (args, gang) => {
      if (!args.device) return false;
      const cur = args.device.getCapabilityValue('onoff') === true;
      return gangAction(args, gang, !cur);
    };

    this.homey.flow.getActionCard('wall_switch_4_gang_tuya_turn_on')?.registerRunListener(async (args) => {
      const g = args.device?._gangNumber || 1;
      return gangAction(args, g, true);
    });
    this.homey.flow.getActionCard('wall_switch_4_gang_tuya_turn_off')?.registerRunListener(async (args) => {
      const g = args.device?._gangNumber || 1;
      return gangAction(args, g, false);
    });
    this.homey.flow.getActionCard('wall_switch_4_gang_tuya_toggle')?.registerRunListener(async (args) => {
      const g = args.device?._gangNumber || 1;
      return toggleGang(args, g);
    });

    for (const gang of [1, 2, 3, 4]) {
      this.homey.flow.getActionCard(`wall_switch_4_gang_tuya_turn_on_gang${gang}`)
        ?.registerRunListener(async (args) => gangAction(args, gang, true));
      this.homey.flow.getActionCard(`wall_switch_4_gang_tuya_turn_off_gang${gang}`)
        ?.registerRunListener(async (args) => gangAction(args, gang, false));
      this.homey.flow.getActionCard(`wall_switch_4_gang_tuya_toggle_gang${gang}`)
        ?.registerRunListener(async (args) => toggleGang(args, gang));
    }

    this.homey.flow.getActionCard('wall_switch_4_gang_tuya_set_backlight')
      ?.registerRunListener(async (args) => {
        if (!args.device) return false;
        await args.device.setSettings({ backlight_mode: args.mode }).catch(() => {});
        await args.device._applySettingsToDevice?.({ backlight_mode: args.mode }, ['backlight_mode']);
        return true;
      });

    this.homey.flow.getActionCard('wall_switch_4_gang_tuya_set_power_on_behavior')
      ?.registerRunListener(async (args) => {
        if (!args.device) return false;
        await args.device.setSettings({ power_on_behavior: args.mode }).catch(() => {});
        await args.device._applySettingsToDevice?.({ power_on_behavior: args.mode }, ['power_on_behavior']);
        return true;
      });

    this.homey.flow.getActionCard('wall_switch_4_gang_tuya_set_child_lock')
      ?.registerRunListener(async (args) => {
        if (!args.device?.setChildLock) return false;
        await args.device.setChildLock(!!args.locked);
        return true;
      });

    this.homey.flow.getActionCard('wall_switch_4_gang_tuya_set_backlight_switch')
      ?.registerRunListener(async (args) => {
        if (!args.device?.setBacklightSwitch) return false;
        await args.device.setBacklightSwitch(!!args.on);
        return true;
      });

    this.homey.flow.getActionCard('wall_switch_4_gang_tuya_set_countdown')
      ?.registerRunListener(async (args) => {
        if (!args.device?.setGangCountdown) return false;
        const gang = Number(args.gang) || 1;
        await args.device.setGangCountdown(gang, Number(args.seconds) || 0);
        return true;
      });

    // Conditions — gang is on (main tile / subdevice onoff)
    for (const gang of [1, 2, 3, 4]) {
      this.homey.flow.getConditionCard(`wall_switch_4_gang_tuya_gang${gang}_is_on`)
        ?.registerRunListener(async (args) => {
          if (!args.device) return false;
          return args.device.getCapabilityValue('onoff') === true;
        });
    }
    this.homey.flow.getConditionCard('wall_switch_4_gang_tuya_is_on')
      ?.registerRunListener(async (args) => {
        if (!args.device) return false;
        return args.device.getCapabilityValue('onoff') === true;
      });
  }
}

module.exports = WallSwitch4GangTuyaDriver;
