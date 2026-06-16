'use strict';

const UnifiedPlugBase = require('../../lib/devices/UnifiedPlugBase');
const PhysicalButtonMixin = require('../../lib/mixins/PhysicalButtonMixin');

/**
 * ╔══════════════════════════════════════════════════════════════════════════════╗
 * ║      DIN RAIL SWITCH - v9.7.3 UNIFIED (extends UnifiedPlugBase properly)     ║
 * ╠══════════════════════════════════════════════════════════════════════════════╣
 * ║ UnifiedPlugBase handles: onoff, electrical measurement, Tuya DP               ║
 * ║  PhysicalButtonMixin handles: bidirectional physical/virtual button sync      ║
 * ║  v9.7.3: purged manual listeners in favor of centralized dpMappings         ║
 * ╚══════════════════════════════════════════════════════════════════════════════╝
 */
class DinRailSwitchDevice extends VirtualButtonMixin(PhysicalButtonMixin(UnifiedPlugBase)) {

  get mainsPowered() { return true; }

  get gangCount() { return 1; }

  get dpMappings() {
    return {
      ...super.dpMappings,
      1: { capability: 'onoff', transform: (v) => v === 1 || v === true },
      16: { capability: 'onoff', transform: (v) => v === 1 || v === true },
      17: { capability: 'measure_current', smartDivisor: true }, // A * 1000
      18: { capability: 'measure_power', divisor: 1 },      // W
      19: { capability: 'measure_voltage', smartDivisor: true },    // V * 10
      20: { capability: 'measure_current', smartDivisor: true }, // A * 1000
      101: { capability: 'meter_power', smartDivisor: true }     // kWh * 100
    };
  }

  async onNodeInit({ zclNode }) {
    // Auto-fix: Remove battery capabilities for mains-powered devices
    await this.removeCapability('measure_battery').catch(() => {});
    await this.removeCapability('alarm_battery').catch(() => {});
    await this._safeInvoke(async () => { // v9.7.3: Initialization handled by parent and mixins
      await super.onNodeInit({ zclNode  });
      await this.initVirtualButtons();
      this.log('DIN Rail Switch v9.7.3 initialized with bidirectional buttons');
      this.log('[DIN-RAIL] ✅ Ready');
    }, 'onNodeInit');
  }

  async onDeleted() {
    await super.onNodeInit({ zclNode });
    this.log('Device deleted, cleaning up');
  }
}

module.exports = DinRailSwitchDevice;

