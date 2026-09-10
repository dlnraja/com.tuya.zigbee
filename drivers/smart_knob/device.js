'use strict';

const ButtonDevice = require('../../lib/devices/ButtonDevice');
const SmartKnobRotationMixin = require('../../lib/mixins/SmartKnobRotationMixin');

/**
 * SmartKnobDevice — ButtonDevice + rotation UX (P2448/P2449)
 * Sacred couples: kaflzta4 = scene press; uri7ongn/g9g2xnch/… = rotary dimmer.
 * DeviceOperatingMode classifies; mixin enables levelControl + 0xFC when dimmer.
 */
class SmartKnobDevice extends SmartKnobRotationMixin(ButtonDevice) {

  get knobFlowPrefix() {
    return 'smart_knob';
  }

  async onNodeInit({ zclNode }) {
    this.buttonCount = 1;

    await Promise.resolve()
      .then(() => super.onNodeInit({ zclNode }))
      .catch((err) => this.error('[INIT] Error:', err.message));

    // WHY(P2449): ButtonDevice alone never bound rotate RX / dim for ERS-10 on this driver
    await this.initSmartKnobRotation(zclNode, {
      migrateStoreKey: 'p2449_smart_knob_cmd_migrated',
    });

    this.log('[SMART_KNOB] rotation + flow UX initialized (P2449)');
  }

  /**
   * Hook press→hold window for press_and_rotate_* flow cards.
   */
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

module.exports = SmartKnobDevice;
