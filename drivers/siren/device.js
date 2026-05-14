'use strict';

const { PlugBase } = require('../../lib/devices/UnifiedPlugBase');

/**
 * SirenDevice - v5.13.6 Hardened Architecture
 * Supports Alarm, Volume, Duration, Melody, Strobe
 */
class SirenDevice extends PlugBase {

  get plugCapabilities() {
    return ['onoff', 'measure_battery', 'measure_temperature', 'measure_humidity'];
  }

  get dpMappings() {
    return {
      1: { capability: 'onoff', transform: (v) => v === 1 || v === true },
      13: { capability: 'onoff', transform: (v) => v === 1 || v === true },
      104: { capability: 'onoff', transform: (v) => !!v },
      5: { capability: 'volume_set', transform: (v) => ({ 0: 0.33, 1: 0.66, 2: 1.0 }[v] ?? (v / 100)) },
      116: { capability: 'volume_set', transform: (v) => ({ 0: 0.33, 1: 0.66, 2: 1.0 }[v] ?? (v / 100)) },
      15: { capability: 'measure_battery', divisor: 1 },
      101: { capability: 'measure_temperature', divisor: 10 },
      102: { capability: 'measure_humidity', divisor: 1 },
      4: { capability: 'alarm_tamper', transform: (v) => v === 1 || v === true },
    };
  }

  async onNodeInit({ zclNode }) {
    this.log('[Siren] 🚀 Initializing hardened driver...');
    await super.onNodeInit({ zclNode });

    // 1. Specialized Cluster Setup
    await this._setupIasWD(zclNode);

    // 2. Volume Listener
    if (this.hasCapability('volume_set')) {
      this.registerCapabilityListener('volume_set', async (value) => {
        const volume = value < 0.4 ? 0 : (value < 0.7 ? 1 : 2);
        this.log(`[Siren] Setting volume to: ${volume}`);
        try { await this.sendTuyaCommand(5, volume, 'enum'); } catch (e) {}
        try { await this.sendTuyaCommand(116, volume, 'enum'); } catch (e) {}
      });
    }

    this.log('[Siren] ✅ Ready');
  }

  async _setupIasWD(zclNode) {
    try {
      const ep1 = zclNode.endpoints[1];
      this._iasWd = ep1.clusters.ssIasWd || ep1.clusters.iasWd;
      if (this._iasWd) this.log('[Siren] ✅ IAS WD cluster available');
    } catch (e) {}
  }

  /**
   * Override parent _setOnOff to add specialized siren logic
   */
  async _setOnOff(value) {
    this.log(`[Siren] 🔔 Alarm: ${value ? 'ON' : 'OFF'}`);

    // Route through multiple DPs for compatibility
    try { await this.sendTuyaCommand(13, !!value, 'bool'); } catch (e) {}
    try { await this.sendTuyaCommand(104, !!value, 'bool'); } catch (e) {}
    
    await super._setOnOff(value);

    // IAS WD Warning
    if (this._iasWd?.startWarning) {
      try {
        await this._iasWd.startWarning({
          warningMode: value ? 1 : 0,
          warningDuration: value ? 30 : 0,
          strobeDutyCycle: value ? 50 : 0,
          strobeLevel: value ? 1 : 0
        });
      } catch (e) {}
    }
  }

}

module.exports = SirenDevice;
