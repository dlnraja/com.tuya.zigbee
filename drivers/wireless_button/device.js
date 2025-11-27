'use strict';

const HybridDriverSystem = require('../../lib/HybridDriverSystem');
const BatteryManagerV4 = require('../../lib/BatteryManagerV4');

/**
 * wireless_button - Auto-generated Hybrid Driver
 *
 * Type: button
 * Class: button
 * Energy: BATTERY
 *
 * AUTO-ADAPTIVE:
 * - Detects device capabilities from clusters
 * - Energy-aware management
 * - Real-time adaptation
 */

const HybridDevice = HybridDriverSystem.createHybridDevice();

class WirelessButtonDevice extends HybridDevice {

  async onNodeInit({ zclNode }) {
    this.log('wireless_button initializing...');

    // Call hybrid system init
    await super.onNodeInit({ zclNode });

    
    // Initialize battery manager
    this.batteryManager = new BatteryManagerV4(this);
    await this.batteryManager.startMonitoring();
    

    
    // Setup flow triggers for button
    await this.registerButtonScenes();
    

    

    this.log('✅ wireless_button ready');
  }

  
  /**
   * Register button scene triggers
   */
  async registerButtonScenes() {
    // Button pressed
    this.registerCommandListener('onOff', 'on', async () => {
      await this.triggerScene('button_pressed');
    }, 1);

    // Button double
    this.registerCommandListener('onOff', 'toggle', async () => {
      await this.triggerScene('button_double');
    }, 1);

    this.log('Button scenes registered');
  }

  async triggerScene(cardId) {
    try {
      const card = this.homey.flow.getDeviceTriggerCard(cardId);
      if (card) await card.trigger(this, {}, {});
    } catch (err) {
      this.error(`Failed to trigger ${cardId}:`, err);
    }
  }
  

  

  async onDeleted() {
    await super.onDeleted();

    
    if (this.batteryManager) {
      this.batteryManager.stopMonitoring();
    }
    
  }
}

module.exports = WirelessButtonDevice;
