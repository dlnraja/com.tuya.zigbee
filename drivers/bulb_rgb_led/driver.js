'use strict';

const { ZigBeeDriver } = require('homey-zigbeedriver');

/**
 * P2839 — Align runListeners to driver.flow.compose.json IDs (was hollow bulb_rgb_*).
 */
class SmartBulbRgbDriver extends ZigBeeDriver {
  async onInit() {
    await super.onInit();
    this.log('SmartBulbRgbDriver initialized');
    this._registerFlowCards();
  }

  async _registerFlowCards() {
    const setOnOff = async (device, value) => {
      if (typeof device.safeSetCapabilityValue === 'function') {
        await device.safeSetCapabilityValue('onoff', value).catch(() => {});
      } else {
        await device.setCapabilityValue('onoff', value).catch(() => {});
      }
      return true;
    };

    try {
      const conditionCard = this.homey.flow.getConditionCard('bulb_rgb_led_is_on');
      if (conditionCard) {
        conditionCard.registerRunListener(async (args) => {
          if (!args.device) {return false;}
          return args.device.getCapabilityValue('onoff') === true;
        });
      }
    } catch (err) {
      this.log(`[FLOW] bulb_rgb_led_is_on: ${err.message}`);
    }

    try {
      const card = this.homey.flow.getConditionCard('bulb_rgb_led_rgb_is_on');
      if (card) {
        card.registerRunListener(async (args) => {
          if (!args.device) {return false;}
          return args.device.getCapabilityValue('onoff') === true;
        });
      }
    } catch (err) {
      this.log(`[FLOW] bulb_rgb_led_rgb_is_on: ${err.message}`);
    }

    for (const [id, value] of [
      ['bulb_rgb_led_turn_on', true],
      ['bulb_rgb_led_turn_off', false],
      ['bulb_rgb_led_rgb_turn_on', true],
      ['bulb_rgb_led_rgb_turn_off', false],
    ]) {
      try {
        const card = this.homey.flow.getActionCard(id);
        if (card) {
          card.registerRunListener(async (args) => {
            if (!args.device) {return false;}
            return setOnOff(args.device, value);
          });
        }
      } catch (err) {
        this.log(`[FLOW] ${id}: ${err.message}`);
      }
    }

    for (const id of ['bulb_rgb_led_toggle', 'bulb_rgb_led_rgb_toggle']) {
      try {
        const card = this.homey.flow.getActionCard(id);
        if (card) {
          card.registerRunListener(async (args) => {
            if (!args.device) {return false;}
            const current = args.device.getCapabilityValue('onoff');
            return setOnOff(args.device, !current);
          });
        }
      } catch (err) {
        this.log(`[FLOW] ${id}: ${err.message}`);
      }
    }

    try {
      const card = this.homey.flow.getActionCard('bulb_rgb_led_set_brightness');
      if (card) {
        card.registerRunListener(async (args) => {
          if (!args.device) {return false;}
          const raw = Number(args.brightness);
          if (!Number.isFinite(raw)) {return false;}
          const dim = raw > 1 ? Math.max(0, Math.min(1, raw / 100)) : Math.max(0, Math.min(1, raw));
          if (typeof args.device.safeSetCapabilityValue === 'function') {
            await args.device.safeSetCapabilityValue('dim', dim).catch(() => {});
          } else {
            await args.device.setCapabilityValue('dim', dim).catch(() => {});
          }
          return true;
        });
      }
    } catch (err) {
      this.log(`[FLOW] set_brightness: ${err.message}`);
    }

    try {
      const card = this.homey.flow.getActionCard('bulb_rgb_led_rgb_set_dim');
      if (card) {
        card.registerRunListener(async (args) => {
          if (!args.device) {return false;}
          const dim = Math.max(0, Math.min(1, Number(args.brightness) || 0));
          if (typeof args.device.safeSetCapabilityValue === 'function') {
            await args.device.safeSetCapabilityValue('dim', dim).catch(() => {});
          } else {
            await args.device.setCapabilityValue('dim', dim).catch(() => {});
          }
          return true;
        });
      }
    } catch (err) {
      this.log(`[FLOW] rgb_set_dim: ${err.message}`);
    }
  }
}

module.exports = SmartBulbRgbDriver;
