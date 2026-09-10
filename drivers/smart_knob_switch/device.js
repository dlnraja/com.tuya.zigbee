'use strict';

const ButtonDevice = require('../../lib/devices/ButtonDevice');
const SmartKnobRotationMixin = require('../../lib/mixins/SmartKnobRotationMixin');

/**
 * SmartKnobSwitchDevice — ButtonDevice + rotation UX (P2448/P2449)
 * Couple: _TZ3000_uri7ber7 + TS004F → command/dimmer default.
 */
class SmartKnobSwitchDevice extends SmartKnobRotationMixin(ButtonDevice) {

  get knobFlowPrefix() {
    return 'smart_knob_switch';
  }

  async onNodeInit({ zclNode }) {
    this.buttonCount = 1;

    await Promise.resolve()
      .then(() => super.onNodeInit({ zclNode }))
      .catch((err) => this.error('[INIT] Error:', err.message));

    await this.initSmartKnobRotation(zclNode, {
      migrateStoreKey: 'p2449_smart_knob_switch_cmd_migrated',
      defaultMode: 'dimmer',
    });

    this.log('[SMART_KNOB_SWITCH] rotation + flow UX initialized (P2449)');
  }

  async triggerButtonPress(buttonNumber, pressType = 'single', count = 1, options = {}) {
    const type = String(pressType || 'single').toLowerCase();
    if (type === 'hold' || type === 'long' || type === 'long_press') {
      this.markKnobPressHeld();
    } else if (type === 'single') {
      this.markKnobPressHeld(800);
    } else if (type === 'release') {
      this.clearKnobPressHeld();
    }
    return super.triggerButtonPress(buttonNumber, pressType, count, options);
  }
}

module.exports = SmartKnobSwitchDevice;
