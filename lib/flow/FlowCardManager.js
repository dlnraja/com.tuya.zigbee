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
 * DP cards (tuya_dp_send/received/equals)  handled by UniversalFlowCardLoader
 * Sub-capability cards  handled by UniversalFlowCardLoader
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
    this.registerIntelligentCards();
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
      if (!this.homey || !this.homey.flow) {
        this.error('[FLOW-SAFE] homey.flow is missing');
        return;
      }
      
      const card = this._getFlowCard(cardId, 'action');
      if (card) {
        card.registerRunListener(this._safeDeviceHandler(handler, cardId, true));
        this.actions[cardId] = card;
      }
    } catch (err) {
      // Card not defined in app.json - ignore silently unless in debug
      if (this.homey.app?.developerDebugMode) {
        this.homey.app.log(`[FLOW-SAFE] Card not found or failed to load: ${cardId}`);
      }
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

  /**
   * v7.2.0: Register Intelligent / Autonomous feature cards
   */
  registerIntelligentCards() {
    // Action: Enable Natural Light
    this._registerActionCard('natural_light_enable', async (args) => {
      await args.device.setSettings({ enable_natural_light: true });
      if (typeof args.device._initNaturalLight === 'function') {
        args.device._initNaturalLight();
      }
      return true;
    });

    // Action: Disable Natural Light
    this._registerActionCard('natural_light_disable', async (args) => {
      await args.device.setSettings({ enable_natural_light: false });
      if (args.device._naturalLightTimer) {
        args.device.clearInterval(args.device._naturalLightTimer);
        args.device._naturalLightTimer = null;
      }
      args.device._naturalLightActive = false;
      return true;
    });

    // Trigger: Radio Presence Detected
    // (Registration is enough, trigger is called from ZigbeeHealthMixin)
    try {
      const card = (() => { try { return this.homey.flow.getTriggerCard('radio_presence_detected'); } catch(e) { return null; } })();
      if (card) {
        card.registerRunListener(async (args, state) => true);
      }
    } catch (e) {}
  }
  /**
   * Safe helper to retrieve flow cards without crashing
   * v7.5.0: Enhanced with multi-stage discovery
   */
  _getFlowCard(id, type = 'trigger') {
    try {
      if (!id) return null;
      if (!this.homey || !this.homey.flow) return null;

      const typeMap = {
        'trigger': ['getTriggerCard'],
        'condition': ['getConditionCard'],
        'action': ['getActionCard'],
      };
      
      const candidates = typeMap[type] || [type];
      
      const idVariants = [id];
      if (!id.startsWith('tuya_')) idVariants.push(`tuya_${id}`);

      for (const method of candidates) {
        const flowMethod = this.homey.flow[method];
        if (typeof flowMethod === 'function') {
          for (const variantId of idVariants) {
            try {
              const card = flowMethod.call(this.homey.flow, variantId);
              if (card) return card;
            } catch (e) { /* continue */ }
          }
        }
      }
    } catch (err) { /* silent */ }
    return null;
  }
}

module.exports = FlowCardManager;
