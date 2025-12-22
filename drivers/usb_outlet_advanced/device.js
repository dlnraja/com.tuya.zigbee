'use strict';
const { HybridPlugBase } = require('../../lib/devices/HybridPlugBase');

/**
 * USB Outlet Advanced Device - v5.5.35 ENHANCED DP COVERAGE
 *
 * Supports: TS011F, TS0115, TS0601 USB outlets with power monitoring
 * Features: Multiple sockets, USB ports, LED control, button detection, power measurement
 *
 * ═══════════════════════════════════════════════════════════════════════════
 * KNOWN ISSUES & MODEL VARIATIONS (v5.4.7 Documentation)
 * ═══════════════════════════════════════════════════════════════════════════
 *
 * 1. POWER MEASUREMENT DIVISORS:
 *    - Most models: Power /10, Current /1000, Voltage /10, Energy /100
 *    - Some models may use different divisors (e.g., Power /100 or direct values)
 *    - If power readings seem incorrect (10x or 100x off), check device firmware
 *    - Alternative DPs: 104 (power), 105 (current), 106 (voltage)
 *
 * 2. LED INDICATOR CONTROL:
 *    - Primary DP: 13 (most common)
 *    - Alternative DP: 101 (some models)
 *    - Capability: 'onoff.led'
 *    - Note: Some devices may not support LED control via DP
 *
 * 3. BUTTON PRESS DETECTION:
 *    - DPs: 102, 103, 121 (model-dependent)
 *    - Capability: 'button' (triggers flow card when pressed)
 *    - Note: Not all models have physical buttons or report button events
 *    - Button events are transient (value always returns to false)
 *
 * 4. SOCKET/USB CONTROL:
 *    - Socket 1: DP 1 or DP 7
 *    - Socket 2: DP 2
 *    - USB 1: DP 9
 *    - USB 2: DP 10
 *    - Note: Not all models have all sockets/USB ports
 *
 * 5. ENERGY CONFIGURATION:
 *    - The device shows "batteries: OTHER" but is actually AC-powered
 *    - This is due to auto-detection fallback and does not affect functionality
 *
 * ═══════════════════════════════════════════════════════════════════════════
 */
class USBOutletAdvancedDevice extends HybridPlugBase {

  get plugCapabilities() {
    return ['onoff', 'onoff.socket2', 'onoff.usb1', 'onoff.usb2', 'onoff.led'];
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
      // USB PORTS CONTROL - Multiple possible DPs depending on model
      // ═══════════════════════════════════════════════════════════════════
      9: { capability: 'onoff.usb1', transform: (v) => v === 1 || v === true },
      10: { capability: 'onoff.usb2', transform: (v) => v === 1 || v === true },
      // v5.5.35: Additional USB DPs found in some models
      3: { capability: 'onoff.usb1', transform: (v) => v === 1 || v === true }, // Alt USB1 DP
      4: { capability: 'onoff.usb2', transform: (v) => v === 1 || v === true }, // Alt USB2 DP
      11: { capability: 'onoff.usb1', transform: (v) => v === 1 || v === true }, // Alt USB1 DP
      12: { capability: 'onoff.usb2', transform: (v) => v === 1 || v === true }, // Alt USB2 DP

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
      // BUTTON PRESS DETECTION - v5.5.19: Uses flow trigger instead of capability
      // ═══════════════════════════════════════════════════════════════════
      102: { capability: null, flowTrigger: 'button_pressed' },
      103: { capability: null, flowTrigger: 'button_pressed' },
      121: { capability: null, flowTrigger: 'button_pressed' },
    };
  }

  async onNodeInit({ zclNode }) {
    await super.onNodeInit({ zclNode });

    // Register capability listeners for control
    await this._registerCapabilityListeners();

    // v5.5.19: Register flow trigger for button press
    this._registerButtonFlowTrigger();

    // v5.5.35: Request initial state of all switches/USBs
    this._requestInitialStates();

    // v5.5.54: Setup ZCL listeners for endpoints 2 and 3 (non-Tuya devices)
    await this._setupMultiEndpointZCL(zclNode);

    this.log('[USB-ADV] ✅ Ready - Full power monitoring enabled');
  }

  /**
   * v5.5.54: Setup ZCL listeners for endpoints 2 and 3
   * For devices that use standard ZCL onOff instead of Tuya DP
   * Only sets up LISTENERS, not control (control is in _registerCapabilityListeners)
   */
  async _setupMultiEndpointZCL(zclNode) {
    // Store reference for later use
    this._zclNode = zclNode;

    // Endpoint 2 - Socket 2 (listen only)
    try {
      const ep2 = zclNode.endpoints?.[2];
      if (ep2?.clusters?.onOff) {
        this.log('[USB-ADV] Endpoint 2 found - setting up ZCL listener');
        this._ep2 = ep2;

        // Listen for on/off changes from device
        ep2.clusters.onOff.on('attr.onOff', (value) => {
          this.log(`[USB-ADV] EP2 ZCL onOff=${value}`);
          if (this.hasCapability('onoff.socket2')) {
            this.setCapabilityValue('onoff.socket2', value).catch(this.error);
          }
        });
      }
    } catch (err) {
      this.log('[USB-ADV] Endpoint 2 listener skipped:', err.message);
    }

    // Endpoint 3 - USB or Socket 3 (listen only)
    try {
      const ep3 = zclNode.endpoints?.[3];
      if (ep3?.clusters?.onOff) {
        this.log('[USB-ADV] Endpoint 3 found - setting up ZCL listener');
        this._ep3 = ep3;

        // Listen for on/off changes from device
        ep3.clusters.onOff.on('attr.onOff', (value) => {
          this.log(`[USB-ADV] EP3 ZCL onOff=${value}`);
          if (this.hasCapability('onoff.usb1')) {
            this.setCapabilityValue('onoff.usb1', value).catch(this.error);
          }
        });
      }
    } catch (err) {
      this.log('[USB-ADV] Endpoint 3 listener skipped:', err.message);
    }
  }

  /**
   * v5.5.35: Request initial states of all DPs
   */
  async _requestInitialStates() {
    // Wait a bit for device to be fully ready
    this.homey.setTimeout(async () => {
      if (this.safeTuyaDataQuery) {
        // All relevant control DPs
        const controlDPs = [1, 2, 3, 4, 7, 9, 10, 11, 12, 13, 101];
        this.log('[USB-ADV] 📤 Requesting initial states...');
        await this.safeTuyaDataQuery(controlDPs, {
          logPrefix: '[USB-INIT]',
          delayBetweenQueries: 50
        }).catch(() => { });
      }
    }, 2000);
  }

  /**
   * v5.5.19: Register flow trigger for button press events
   */
  _registerButtonFlowTrigger() {
    try {
      this._buttonTrigger = this.homey.flow.getDeviceTriggerCard('usb_outlet_button_pressed');
      this.log('[USB-ADV] Button flow trigger registered');
    } catch (err) {
      this.log('[USB-ADV] Button flow trigger not available:', err.message);
    }
  }

  /**
   * v5.5.19: Trigger button pressed flow
   */
  async _triggerButtonPressed() {
    if (this._buttonTrigger) {
      try {
        await this._buttonTrigger.trigger(this);
        this.log('[USB-ADV] Button pressed flow triggered');
      } catch (err) {
        this.error('[USB-ADV] Failed to trigger button flow:', err.message);
      }
    }
  }

  async _registerCapabilityListeners() {
    // LED control
    if (this.hasCapability('onoff.led')) {
      this.registerCapabilityListener('onoff.led', async (value) => {
        this.log('[USB-ADV] LED →', value);
        await this._sendDP(13, value);
      });
    }

    // Socket 2 control - v5.5.54: Try both Tuya DP AND ZCL
    if (this.hasCapability('onoff.socket2')) {
      this.registerCapabilityListener('onoff.socket2', async (value) => {
        this.log('[USB-ADV] Socket 2 →', value);
        await this._sendDP(2, value);
        // v5.5.54: Also try ZCL endpoint 2 for non-Tuya devices
        if (this._ep2?.clusters?.onOff) {
          try {
            await this._ep2.clusters.onOff[value ? 'setOn' : 'setOff']();
            this.log('[USB-ADV] Socket 2 ZCL command sent');
          } catch (e) { /* Tuya DP probably worked */ }
        }
      });
    }

    // USB 1 control - v5.5.54: Try both Tuya DP AND ZCL
    if (this.hasCapability('onoff.usb1')) {
      this.registerCapabilityListener('onoff.usb1', async (value) => {
        this.log('[USB-ADV] USB 1 →', value);
        // v5.5.35: Try common USB1 DPs
        await this._sendDP(9, value);   // Primary
        await this._sendDP(3, value);   // Alt
        await this._sendDP(11, value);  // Alt
        // v5.5.54: Also try ZCL endpoint 3 for non-Tuya devices
        if (this._ep3?.clusters?.onOff) {
          try {
            await this._ep3.clusters.onOff[value ? 'setOn' : 'setOff']();
            this.log('[USB-ADV] USB 1 ZCL command sent');
          } catch (e) { /* Tuya DP probably worked */ }
        }
      });
    }

    // USB 2 control - try multiple DPs
    if (this.hasCapability('onoff.usb2')) {
      this.registerCapabilityListener('onoff.usb2', async (value) => {
        this.log('[USB-ADV] USB 2 →', value);
        // v5.5.35: Try common USB2 DPs
        await this._sendDP(10, value);  // Primary
        await this._sendDP(4, value);   // Alt
        await this._sendDP(12, value);  // Alt
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

  /**
   * v5.5.5: Enhanced logging per MASTER BLOCK specs
   * Shows raw + converted values for power measurements
   */
  onTuyaStatus(status) {
    if (!status || status.dp === undefined) {
      if (super.onTuyaStatus) super.onTuyaStatus(status);
      return;
    }

    const dp = status.dp;
    const rawValue = status.data || status.value;

    // v5.5.5: Log raw + converted per MASTER BLOCK format
    switch (dp) {
    case 1:
    case 7: // Socket on/off
      this.log(`[ZCL-DATA] USB_outlet.socket raw=${rawValue} converted=${rawValue === 1 || rawValue === true}`);
      break;
    case 2: // Socket 2
      this.log(`[ZCL-DATA] USB_outlet.socket2 raw=${rawValue} converted=${rawValue === 1 || rawValue === true}`);
      break;
    case 9:
    case 10: // USB ports
      this.log(`[ZCL-DATA] USB_outlet.usb raw=${rawValue} converted=${rawValue === 1 || rawValue === true}`);
      break;
    case 13:
    case 101: // LED indicator
      this.log(`[ZCL-DATA] USB_outlet.led raw=${rawValue} converted=${rawValue === 1 || rawValue === true}`);
      break;
    case 16:
    case 104: // Power (W)
      this.log(`[ZCL-DATA] USB_outlet.power raw=${rawValue} converted=${rawValue / 10}W`);
      break;
    case 17:
    case 105: // Current (A)
      this.log(`[ZCL-DATA] USB_outlet.current raw=${rawValue} converted=${rawValue / 1000}A`);
      break;
    case 18:
    case 106: // Voltage (V)
      this.log(`[ZCL-DATA] USB_outlet.voltage raw=${rawValue} converted=${rawValue / 10}V`);
      break;
    case 19: // Energy (kWh)
      this.log(`[ZCL-DATA] USB_outlet.energy raw=${rawValue} converted=${rawValue / 100}kWh`);
      break;
    case 102:
    case 103:
    case 121: // Button press
      this.log(`[ZCL-DATA] USB_outlet.button raw=${rawValue} event=press`);
      // v5.5.19: Trigger flow instead of setting capability
      this._triggerButtonPressed();
      break;
    default:
      this.log(`[ZCL-DATA] USB_outlet.unknown_dp dp=${dp} raw=${rawValue}`);
    }

    // Call parent handler
    if (super.onTuyaStatus) super.onTuyaStatus(status);
  }
}

module.exports = USBOutletAdvancedDevice;
