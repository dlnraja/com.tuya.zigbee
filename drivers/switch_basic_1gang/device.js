'use strict';

const BaseHybridDevice = require('../../lib/devices/BaseHybridDevice');

/**
 * Switch1gangDevice - Basic 1-Gang Switch
 * v5.2.10: PATCH 1 - Mains-powered device, no battery management
 *
 * Capabilities: onoff only (no dim, no battery)
 */
class Switch1gangDevice extends BaseHybridDevice {

  async onNodeInit({ zclNode }) {
    this.log('[SWITCH-1GANG] Initializing...');

    // v5.2.10: Mark as mains-powered BEFORE super.onNodeInit
    this._mainsPowered = true;

    // Initialize base
    await super.onNodeInit({ zclNode }).catch(err => this.error(err));

    // Setup on/off capability
    await this._setupOnOff(zclNode);

    this.log('[SWITCH-1GANG] ✅ Initialized (mains-powered)');
  }

  /**
   * Setup on/off capability
   */
  async _setupOnOff(zclNode) {
    try {
      const endpoint = zclNode.endpoints?.[1];
      if (!endpoint?.clusters?.onOff) {
        this.log('[SWITCH-1GANG] ⚠️ No onOff cluster');
        return;
      }

      // Register capability listener
      this.registerCapabilityListener('onoff', async (value) => {
        this.log(`[SWITCH-1GANG] Setting onoff to ${value}`);
        try {
          if (value) {
            await endpoint.clusters.onOff.setOn();
          } else {
            await endpoint.clusters.onOff.setOff();
          }
        } catch (err) {
          this.error('[SWITCH-1GANG] Failed to set onoff:', err.message);
          throw err;
        }
      });

      // Listen for state changes
      endpoint.clusters.onOff.on('attr.onOff', (value) => {
        this.log(`[SWITCH-1GANG] State changed to ${value}`);
        this.setCapabilityValue('onoff', value).catch(this.error);
      });

      // Read initial state
      const { onOff } = await endpoint.clusters.onOff.readAttributes(['onOff']).catch(() => ({}));
      if (onOff !== undefined) {
        await this.setCapabilityValue('onoff', onOff).catch(this.error);
        this.log(`[SWITCH-1GANG] Initial state: ${onOff}`);
      }

    } catch (err) {
      this.error('[SWITCH-1GANG] Setup error:', err.message);
    }
  }

  async onDeleted() {
    this.log('[SWITCH-1GANG] Deleted');
    await super.onDeleted().catch(() => { });
  }
}

module.exports = Switch1gangDevice;
