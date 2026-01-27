'use strict';

// v5.5.530: Fix "Class extends value undefined" error
let HybridSwitchBase;
try {
  HybridSwitchBase = require('../../lib/devices/HybridSwitchBase');
  if (!HybridSwitchBase) throw new Error('HybridSwitchBase is undefined');
} catch (e) {
  console.error('[switch_4gang] HybridSwitchBase load failed:', e.message);
  const { ZigBeeDevice } = require('homey-zigbeedriver');
  HybridSwitchBase = ZigBeeDevice;
}

const VirtualButtonMixin = require('../../lib/mixins/VirtualButtonMixin');
const PhysicalButtonMixin = require('../../lib/mixins/PhysicalButtonMixin');

/**
 * 4-GANG SWITCH - v5.5.896 + PhysicalButtonMixin
 * Physical button detection: single/double/long/triple per gang
 */
const BaseClass = typeof HybridSwitchBase === 'function' 
  ? PhysicalButtonMixin(VirtualButtonMixin(HybridSwitchBase)) 
  : HybridSwitchBase;

class Switch4GangDevice extends BaseClass {
  get gangCount() { return 4; }

  async onNodeInit({ zclNode }) {
    await super.onNodeInit({ zclNode });

    // v5.5.896: Physical button detection (single/double/long/triple)
    await this.initPhysicalButtonDetection?.(zclNode);

    // v5.5.412: Initialize virtual buttons
    await this.initVirtualButtons?.();

    this.log('[SWITCH-4G] v5.5.896 - Physical button detection enabled');
  }

  /**
   * Handle capability changes and trigger appropriate flow cards
   */
  async _onCapabilityChanged(capability, value, gang) {
    try {
      this.log(`[SWITCH-4G] Gang ${gang} ${capability}: ${value}`);

      // Get the appropriate trigger from driver
      const triggerName = `switch_4gang_gang${gang}_turned_${value ? 'on' : 'off'}`;
      const trigger = this.driver[`gang${gang}${value ? 'On' : 'Off'}Trigger`];

      if (trigger) {
        await trigger.trigger(this, {
          gang: gang,
          state: value
        }, {});
        this.log(`[SWITCH-4G] 🎯 Triggered flow: ${triggerName}`);
      } else {
        this.log(`[SWITCH-4G] ⚠️ Flow trigger not found: ${triggerName}`);
      }

    } catch (err) {
      this.log('[SWITCH-4G] ⚠️ Error triggering flow:', err.message);
    }
  }

  /**
   * Override setCapabilityValue to also trigger flows for external changes
   */
  async setCapabilityValue(capability, value) {
    const oldValue = this.getCapabilityValue(capability);
    await super.setCapabilityValue(capability, value);

    // Only trigger if value actually changed
    if (oldValue !== value) {
      let gang = 1;
      if (capability === 'onoff.gang2') gang = 2;
      else if (capability === 'onoff.gang3') gang = 3;
      else if (capability === 'onoff.gang4') gang = 4;

      if (['onoff', 'onoff.gang2', 'onoff.gang3', 'onoff.gang4'].includes(capability)) {
        await this._onCapabilityChanged(capability, value, gang);
      }
    }
  }
}
module.exports = Switch4GangDevice;
