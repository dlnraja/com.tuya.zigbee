'use strict';
const { HybridPlugBase } = require('../../lib/devices');

/**
 * USB Outlet Advanced Device - v5.4.2 COMPLETE
 *
 * Supports: TS011F, TS0115, TS0601 USB outlets with power monitoring
 * Features: Multiple sockets, USB ports, LED control, button detection, power measurement
 */
class USBOutletAdvancedDevice extends HybridPlugBase {

  get plugCapabilities() {
    return ['onoff', 'onoff.socket2', 'onoff.usb1', 'onoff.usb2', 'onoff.led', 'button'];
  }

  /**
   * v5.4.2: COMPLETE DP mappings for USB outlets
   * Based on Z2M TS011F and similar devices
   */
  get dpMappings() {
    return {
      // ═══════════════════════════════════════════════════════════════════
      // SOCKET/RELAY CONTROL
      // ═══════════════════════════════════════════════════════════════════
      1: { capability: 'onoff', transform: (v) => v === 1 || v === true },
      2: { capability: 'onoff.socket2', transform: (v) => v === 1 || v === true },
      7: { capability: 'onoff', transform: (v) => v === 1 || v === true }, // Alt DP for some models

      // ═══════════════════════════════════════════════════════════════════
      // USB PORTS CONTROL
      // ═══════════════════════════════════════════════════════════════════
      9: { capability: 'onoff.usb1', transform: (v) => v === 1 || v === true },
      10: { capability: 'onoff.usb2', transform: (v) => v === 1 || v === true },

      // ═══════════════════════════════════════════════════════════════════
      // LED INDICATOR CONTROL
      // ═══════════════════════════════════════════════════════════════════
      13: { capability: 'onoff.led', transform: (v) => v === 1 || v === true },
      101: { capability: 'onoff.led', transform: (v) => v === 1 || v === true }, // Alt DP

      // ═══════════════════════════════════════════════════════════════════
      // POWER MEASUREMENT (Z2M: value in 0.1W or 0.01W depending on model)
      // ═══════════════════════════════════════════════════════════════════
      16: { capability: 'measure_power', divisor: 10 },      // Power W (value/10)
      17: { capability: 'measure_current', divisor: 1000 },  // Current A (value/1000)
      18: { capability: 'measure_voltage', divisor: 10 },    // Voltage V (value/10)
      19: { capability: 'meter_power', divisor: 100 },       // Energy kWh (value/100)

      // Some models use different DPs
      104: { capability: 'measure_power', divisor: 10 },     // Alt power DP
      105: { capability: 'measure_current', divisor: 1000 }, // Alt current DP
      106: { capability: 'measure_voltage', divisor: 10 },   // Alt voltage DP

      // ═══════════════════════════════════════════════════════════════════
      // BUTTON PRESS DETECTION
      // ═══════════════════════════════════════════════════════════════════
      102: { capability: 'button', transform: () => true },
      103: { capability: 'button', transform: () => true }, // Some models
      121: { capability: 'button', transform: () => true }, // Alt DP
    };
  }

  async onNodeInit({ zclNode }) {
    await super.onNodeInit({ zclNode });

    // Register capability listeners for control
    await this._registerCapabilityListeners();

    this.log('[USB-ADV] ✅ Ready - Full power monitoring enabled');
  }

  async _registerCapabilityListeners() {
    // LED control
    if (this.hasCapability('onoff.led')) {
      this.registerCapabilityListener('onoff.led', async (value) => {
        this.log('[USB-ADV] LED →', value);
        await this._sendDP(13, value);
      });
    }

    // Socket 2 control
    if (this.hasCapability('onoff.socket2')) {
      this.registerCapabilityListener('onoff.socket2', async (value) => {
        this.log('[USB-ADV] Socket 2 →', value);
        await this._sendDP(2, value);
      });
    }

    // USB 1 control
    if (this.hasCapability('onoff.usb1')) {
      this.registerCapabilityListener('onoff.usb1', async (value) => {
        this.log('[USB-ADV] USB 1 →', value);
        await this._sendDP(9, value);
      });
    }

    // USB 2 control
    if (this.hasCapability('onoff.usb2')) {
      this.registerCapabilityListener('onoff.usb2', async (value) => {
        this.log('[USB-ADV] USB 2 →', value);
        await this._sendDP(10, value);
      });
    }
  }

  async _sendDP(dp, value) {
    try {
      if (this.tuyaEF00Manager) {
        await this.tuyaEF00Manager.sendDP(dp, value ? 1 : 0);
      }
    } catch (err) {
      this.error('[USB-ADV] Failed to send DP', dp, err.message);
    }
  }
}

module.exports = USBOutletAdvancedDevice;
