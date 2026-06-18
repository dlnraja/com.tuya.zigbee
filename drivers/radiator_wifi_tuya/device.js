'use strict';
const TuyaLocalDevice = require('../../lib/tuya-local/TuyaLocalDevice');
const { safeDivide, safeMultiply } = require('../../lib/utils/tuyaUtils');

/**
 * RADIATOR WiFi TUYA - v7.0
 * Local WiFi control for (Tuya / Besterm) radiators using unified TuyaLocalDevice base
 */
class RadiatorWifiTuyaDevice extends TuyaLocalDevice {
  get dpMappings() {
    const mappings = {
      '1': { 
        capability: 'onoff', 
        transform: (v) => v === true || v === 1, 
        reverseTransform: (v) => v === true 
      },
      '2': {
        capability: 'target_temperature',
        transform: (v) => safeDivide(parseFloat(v), 2),
        reverseTransform: (v) => safeMultiply(v, 2)
      },
      '3': { 
        capability: 'measure_temperature', 
        transform: (v) => parseFloat(v) 
      },
      '4': {
        capability: 'thermostat_mode',
        transform: (v) => ({ '0': 'auto', '1': 'manual', '2': 'eco', '3': 'boost' }[String(v)] || 'manual'),
        reverseTransform: (v) => ({ 'auto': 0, 'manual': 1, 'eco': 2, 'boost': 3 }[v] ?? 1)
      }
    };

    if (this.hasCapability('child_lock')) {
      mappings['5'] = { 
        capability: 'child_lock', 
        transform: (v) => v === true || v === 1, 
        reverseTransform: (v) => v === true 
      };
    }
    
    if (this.hasCapability('window_detection')) {
      mappings['6'] = { 
        capability: 'window_detection', 
        transform: (v) => v === true || v === 1, 
        reverseTransform: (v) => v === true 
      };
    }

    return mappings;
  }

  async onInit() {
    this.log('[RADIATOR-WIFI] Initializing WiFi Tuya radiator via TuyaLocalDevice...');
    await super.onInit();
    this.log('[RADIATOR-WIFI] Initialized successfully');
  }

  async onDeleted() {
    if (this._destroyed) return;
    this._destroyed = true;
    this.log('[RADIATOR-WIFI] Device deleted, cleaning up');
    await super.onDeleted();
  }
}

module.exports = RadiatorWifiTuyaDevice;
