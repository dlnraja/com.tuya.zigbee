'use strict';
const TuyaZigbeeDevice = require('../../lib/tuya/TuyaZigbeeDevice');

/**
 * Smart Knob - TS004F
 * Rotary knob/dimmer remote with button press
 * Uses standard ZCL onOff + levelControl clusters
 */
class SmartKnobDevice extends TuyaZigbeeDevice {
  async onNodeInit({ zclNode }) {
    await super.onNodeInit({ zclNode });

    const ep1 = zclNode?.endpoints?.[1];
    if (!ep1) {
      this.log('[KNOB] No endpoint 1');
      return;
    }

    // Listen for button press via onOff cluster
    const onOff = ep1.clusters?.onOff || ep1.clusters?.[6];
    if (onOff?.on) {
      onOff.on('commandToggle', () => {
        this.setCapabilityValue('button', true).catch(() => {});
        this.log('[KNOB] Button pressed');
      });
      onOff.on('commandOn', () => {
        this.setCapabilityValue('button', true).catch(() => {});
      });
      onOff.on('commandOff', () => {
        this.setCapabilityValue('button', true).catch(() => {});
      });
    }

    // Listen for rotation via levelControl cluster
    const level = ep1.clusters?.levelControl || ep1.clusters?.[8];
    if (level?.on) {
      level.on('commandMoveToLevel', ({ level: lvl }) => {
        const dim = Math.max(0, Math.min(1, lvl / 254));
        this.setCapabilityValue('dim', dim).catch(() => {});
        this.log('[KNOB] Level:', Math.round(dim * 100) + '%');
      });
      level.on('commandMove', ({ moveMode, rate }) => {
        const direction = moveMode === 0 ? 'up' : 'down';
        this.log('[KNOB] Move ' + direction + ' rate:' + rate);
      });
      level.on('commandStep', ({ stepMode, stepSize }) => {
        const curDim = this.getCapabilityValue('dim') || 0;
        const step = (stepSize / 254) * (stepMode === 0 ? 1 : -1);
        const newDim = Math.max(0, Math.min(1, curDim + step));
        this.setCapabilityValue('dim', newDim).catch(() => {});
        this.log('[KNOB] Step to:', Math.round(newDim * 100) + '%');
      });
    }

    // Battery via power configuration cluster
    const power = ep1.clusters?.powerConfiguration || ep1.clusters?.[1];
    if (power?.on) {
      power.on('attr.batteryPercentageRemaining', (val) => {
        const pct = Math.min(100, Math.round(val / 2));
        this.setCapabilityValue('measure_battery', pct).catch(() => {});
      });
    }

    this.log('[KNOB] \u2705 Ready');
  }
}
module.exports = SmartKnobDevice;
