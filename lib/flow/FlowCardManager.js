'use strict';

/**
 * Flow Card Manager
 * v5.8.45: MAJOR CLEANUP - removed 87 phantom flow card registrations
 * that were never defined in app.json and silently failed at startup.
 *
 * Only registers flow cards that actually exist in app.json/driver.flow.compose.json:
 * - Switch backlight/countdown/child_lock action cards (14 cards)
 * - Plug LED indicator + power-on behavior action cards (2 cards)
 *
 * DP cards (tuya_dp_send/received/equals) → handled by UniversalFlowCardLoader
 * Sub-capability cards → handled by UniversalFlowCardLoader
 *
 * v5.5.342: Safe device handler wrapper prevents "cant get device by id" errors
 */

class FlowCardManager {
  constructor(homey) {
    this.homey = homey;
    this.actions = {};
  }

  /**
   * v5.5.342: Safe device handler wrapper
   * Prevents "cant get device by id" errors when device was deleted/re-paired
   */
  _safeDeviceHandler(handler, cardName, defaultReturn = false) {
    return async (args, state) => {
      try {
        if (!args || !args.device) {
          this.homey.app?.error?.(`[FLOW] ${cardName}: No device in args`);
          return defaultReturn;
        }
        if (typeof args.device.getCapabilityValue !== 'function' &&
          typeof args.device.setCapabilityValue !== 'function' &&
          typeof args.device.getAvailable !== 'function') {
          this.homey.app?.error?.(`[FLOW] ${cardName}: Invalid device reference`);
          return defaultReturn;
        }
        return await handler(args, state);
      } catch (err) {
        if (err.message?.includes('device') || err.message?.includes('Device')) {
          this.homey.app?.error?.(`[FLOW] ${cardName}: ${err.message}`);
          return defaultReturn;
        }
        throw err;
      }
    };
  }

  /**
   * Register all DEFINED flow cards
   */
  registerAll() {
    this.registerSwitchBacklightCards();
    this.registerPlugLEDCards();
  }

  /**
   * v5.5.929: Register switch backlight/countdown/child_lock action cards
   * Supports switch_1gang through switch_4gang
   */
  registerSwitchBacklightCards() {
    const switchDrivers = ['switch_1gang', 'switch_2gang', 'switch_3gang', 'switch_4gang'];

    for (const driver of switchDrivers) {
      this._registerActionCard(`${driver}_set_backlight`, async (args) => {
        if (typeof args.device.setBacklightMode === 'function') {
          await args.device.setBacklightMode(args.mode);
          return true;
        }
        throw new Error('Device does not support backlight control');
      });

      this._registerActionCard(`${driver}_set_backlight_color`, async (args) => {
        if (typeof args.device.setBacklightColor === 'function') {
          await args.device.setBacklightColor(args.state, args.color);
          return true;
        }
        throw new Error('Device does not support LED color');
      });

      this._registerActionCard(`${driver}_set_backlight_brightness`, async (args) => {
        if (typeof args.device.setBacklightBrightness === 'function') {
          await args.device.setBacklightBrightness(args.brightness);
          return true;
        }
        throw new Error('Device does not support LED brightness');
      });

      this._registerActionCard(`${driver}_set_countdown`, async (args) => {
        if (typeof args.device.setCountdown === 'function') {
          await args.device.setCountdown(1, args.seconds);
          return true;
        }
        throw new Error('Device does not support countdown');
      });

      this._registerActionCard(`${driver}_set_child_lock`, async (args) => {
        if (typeof args.device.setChildLock === 'function') {
          await args.device.setChildLock(args.locked === 'true');
          return true;
        }
        throw new Error('Device does not support child lock');
      });
    }
  }

  /**
   * Helper to safely register an action card
   */
  _registerActionCard(cardId, handler) {
    try {
      const card = this.homey.flow.getActionCard(cardId);
      if (card) {
        card.registerRunListener(this._safeDeviceHandler(handler, cardId, true));
        this.actions[cardId] = card;
      }
    } catch (err) {
      // Card not defined in app.json - skip silently
    }
  }

  /**
   * v5.5.929: Register plug LED indicator and power-on behavior action cards
   */
  registerPlugLEDCards() {
    this._registerActionCard('plug_smart_set_indicator', async (args) => {
      if (typeof args.device.setIndicatorMode === 'function') {
        await args.device.setIndicatorMode(args.mode);
        return true;
      }
      throw new Error('Device does not support LED indicator control');
    });

    this._registerActionCard('plug_smart_set_power_on', async (args) => {
      if (typeof args.device.setPowerOnBehavior === 'function') {
        await args.device.setPowerOnBehavior(args.behavior);
        return true;
      }
      throw new Error('Device does not support power-on behavior control');
    });
  }
}

module.exports = FlowCardManager;
