'use strict';

const HybridDriverSystem = require('../../lib/HybridDriverSystem');
const BatteryManagerV4 = require('../../lib/BatteryManagerV4');

/**
 * TS0041 - Wireless Button (1 button) V2
 *
 * HYBRID AUTO-ADAPTIVE DRIVER
 * - Auto-detects button configuration
 * - Energy-aware (battery monitoring)
 * - Flow cards for scenes
 * - Inspired by: IKEA Trådfri remotes
 */

const HybridDevice = HybridDriverSystem.createHybridDevice();

class ButtonWireless1V2 extends HybridDevice {

  async onNodeInit({ zclNode }) {
    // Call hybrid init
    await super.onNodeInit({ zclNode });

    // Initialize battery manager
    this.batteryManager = new BatteryManagerV4(this);
    await this.batteryManager.startMonitoring();

    // Register button scene triggers
    await this.registerButtonScenes();

    this.log('✅ Button wireless 1 ready');
  }

  /**
   * Register button scene triggers
   */
  async registerButtonScenes() {
    // Button 1 - Short press
    this.registerCommandListener('onOff', 'on', async () => {
      await this.triggerScene('button_1_pressed', { button: 1, action: 'pressed' });
    }, 1);

    this.registerCommandListener('onOff', 'off', async () => {
      await this.triggerScene('button_1_pressed', { button: 1, action: 'pressed' });
    }, 1);

    // Button 1 - Double press
    this.registerCommandListener('onOff', 'toggle', async () => {
      await this.triggerScene('button_1_double', { button: 1, action: 'double' });
    }, 1);

    // Button 1 - Long press start
    this.registerCommandListener('levelControl', 'moveWithOnOff', async (payload) => {
      await this.triggerScene('button_1_long_press_start', {
        button: 1,
        action: 'long_press_start',
        direction: payload.moveMode === 0 ? 'up' : 'down'
      });
    }, 1);

    // Button 1 - Long press stop
    this.registerCommandListener('levelControl', 'stop', async () => {
      await this.triggerScene('button_1_long_press_stop', {
        button: 1,
        action: 'long_press_stop'
      });
    }, 1);

    this.log('🎮 Button scenes registered');
  }

  /**
   * Trigger flow card
   */
  async triggerScene(cardId, tokens) {
    this.log(`Triggering scene: ${cardId}`, tokens);

    try {
      const card = this.homey.flow.getDeviceTriggerCard(cardId);
      if (card) {
        await card.trigger(this, tokens, {});
      }
    } catch (err) {
      this.error(`Failed to trigger ${cardId}:`, err);
    }
  }

  /**
   * No refresh needed for buttons (event-based only)
   */
  async refreshDevice() {
    // Buttons don't poll - event driven only
  }

  async onDeleted() {
    await super.onDeleted();

    if (this.batteryManager) {
      this.batteryManager.stopMonitoring();
    }
  }
}

module.exports = ButtonWireless1V2;
