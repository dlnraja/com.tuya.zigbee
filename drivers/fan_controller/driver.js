'use strict';

const { Driver } = require('homey');

class FanControllerDriver extends Driver {
  async onInit() {
    /* P131-AUTO-FLOW-LISTENERS */

    try {
      const __card = this.homey.flow.getConditionCard('fan_controller_is_on');
      if (__card) {
        __card.registerRunListener(async (args) => {
          if (!args.device) return false;
          return args.device.getCapabilityValue('onoff') === true;
        });
      }
    } catch (e) { this.error('[FLOW] fan_controller_is_on:', e.message); }

    try {
      const __card = this.homey.flow.getActionCard('fan_controller_turn_on');
      if (__card) {
        __card.registerRunListener(async (args) => {
          if (!args.device) return false;
          if (typeof args.device.safeSetCapabilityValue === 'function') {
            await args.device.safeSetCapabilityValue('onoff', true).catch(() => {});
          } else {
            await args.device.setCapabilityValue('onoff', true).catch(() => {});
          }
          return true;
        });
      }
    } catch (e) { this.error('[FLOW] fan_controller_turn_on:', e.message); }

    try {
      const __card = this.homey.flow.getActionCard('fan_controller_turn_off');
      if (__card) {
        __card.registerRunListener(async (args) => {
          if (!args.device) return false;
          if (typeof args.device.safeSetCapabilityValue === 'function') {
            await args.device.safeSetCapabilityValue('onoff', false).catch(() => {});
          } else {
            await args.device.setCapabilityValue('onoff', false).catch(() => {});
          }
          return true;
        });
      }
    } catch (e) { this.error('[FLOW] fan_controller_turn_off:', e.message); }

    try {
      const __card = this.homey.flow.getActionCard('fan_controller_set_speed');
      if (__card) {
        __card.registerRunListener(async (args) => {
          if (!args.device) return false;
          const raw = args.speed ?? args.brightness ?? args.dim ?? args.value;
          if (raw === undefined) return false;
          const dim = Number(raw) > 1 ? Number(raw) / 100 : Number(raw);
          if (typeof args.device.safeSetCapabilityValue === 'function') {
            await args.device.safeSetCapabilityValue('dim', dim).catch(() => {});
          } else {
            await args.device.setCapabilityValue('dim', dim).catch(() => {});
          }
          if (typeof args.device._setFanSpeed === 'function') {
            await args.device._setFanSpeed(dim).catch(() => {});
          }
          return true;
        });
      }
    } catch (e) { this.error('[FLOW] fan_controller_set_speed:', e.message); }

    try {
      const __card = this.homey.flow.getActionCard('fan_controller_speed_up');
      if (__card) {
        __card.registerRunListener(async (args) => {
          if (!args.device) return false;
          const cur = Number(args.device.getCapabilityValue('dim')) || 0;
          const next = Math.max(0, Math.min(1, cur + (0.1)));
          if (typeof args.device.safeSetCapabilityValue === 'function') {
            await args.device.safeSetCapabilityValue('dim', next).catch(() => {});
          } else {
            await args.device.setCapabilityValue('dim', next).catch(() => {});
          }
          return true;
        });
      }
    } catch (e) { this.error('[FLOW] fan_controller_speed_up:', e.message); }

    try {
      const __card = this.homey.flow.getActionCard('fan_controller_speed_down');
      if (__card) {
        __card.registerRunListener(async (args) => {
          if (!args.device) return false;
          const cur = Number(args.device.getCapabilityValue('dim')) || 0;
          const next = Math.max(0, Math.min(1, cur + (-0.1)));
          if (typeof args.device.safeSetCapabilityValue === 'function') {
            await args.device.safeSetCapabilityValue('dim', next).catch(() => {});
          } else {
            await args.device.setCapabilityValue('dim', next).catch(() => {});
          }
          return true;
        });
      }
    } catch (e) { this.error('[FLOW] fan_controller_speed_down:', e.message); }

    try {
      const __card = this.homey.flow.getActionCard('fan_controller_toggle');
      if (__card) {
        __card.registerRunListener(async (args) => {
          if (!args.device) return false;
          const v = !args.device.getCapabilityValue('onoff');
          if (typeof args.device.safeSetCapabilityValue === 'function') {
            await args.device.safeSetCapabilityValue('onoff', v).catch(() => {});
          } else {
            await args.device.setCapabilityValue('onoff', v).catch(() => {});
          }
          return true;
        });
      }
    } catch (e) { this.error('[FLOW] fan_controller_toggle:', e.message); }

    try {
      const __card = this.homey.flow.getActionCard('fan_controller_set_brightness');
      if (__card) {
        __card.registerRunListener(async (args) => {
          if (!args.device) return false;
          const raw = args.temperature ?? args.brightness ?? args.dim ?? args.value ?? args.speed;
          if (raw === undefined) return false;
          if (typeof args.device.safeSetCapabilityValue === 'function') {
            await args.device.safeSetCapabilityValue('dim', raw).catch(() => {});
          } else {
            await args.device.setCapabilityValue('dim', raw).catch(() => {});
          }
          return true;
        });
      }
    } catch (e) { this.error('[FLOW] fan_controller_set_brightness:', e.message); }
    /* P131-AUTO-FLOW-LISTENERS-END */

    this.log('Fan Controller driver initialized');
  }
}

module.exports = FanControllerDriver;
