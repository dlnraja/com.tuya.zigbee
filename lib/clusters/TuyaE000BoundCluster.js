'use strict';
const { safeParse } = require('../utils/tuyaUtils.js');

const { BoundCluster } = require('zigbee-clusters');
const { resolve: resolvePressType } = require('../utils/TuyaPressTypeMap');

// v5.9.5: CRITICAL  require TuyaE000Cluster so Cluster.addCluster() runs
// Without this, SDK doesn't know cluster 0xE000 exists  ALL E000 frames silently dropped
// Root cause of _TZ3000_b4awzgct/TS0041 "button not functioning" (GH#124)
try { require('./TuyaE000Cluster'); } catch (e) { /* already registered or unavailable */ }

/**
 * TuyaE000BoundCluster - v5.8.93 CRITICAL FIX (GH#98 DVMasters, GH#124 Lalla80111)
 *
 * BoundCluster for receiving button presses from Tuya cluster 0xE000 (57344)
 * Used by MOES _TZ3000_zgyzgdua and similar TS0044 devices
 *
 * WHY THIS IS NEEDED:
 * - Cluster 0xE000 is a Tuya-specific cluster not known by Homey SDK
 * - Homey doesn't create cluster objects for unknown clusters
 * - We need a BoundCluster to receive incoming commands from the device
 *
 * v5.8.93: CRITICAL FIX - handleFrame() is NOT called by zigbee-clusters SDK.
 * The SDK dispatches to methods named after TuyaE000Cluster.COMMANDS (cmd0, cmd1...).
 * Without cmd0-cmd6 methods, ALL E000 frames were silently dropped  zero button events.
 * Fix: Add cmd0-cmd6 + cmdFD/FE/FF methods matching TuyaE000Cluster command definitions.
 *
 * v5.5.796: FORUM FIX - Enhanced frame parsing for Freddyboy/Hartmut_Dunker
 *
 * Device sends button presses as commands on cluster 57344:
 * - Command payload contains button number and press type
 * - Press types: 0=single, 1=double, 2=long
 *
 * Sources:
 * - Z2M Issue #28224: MOES XH-SY-04Z 4-button remote
 * - Device structure: EP1 inClusterList: [1, 6, 57344, 0]
 * - Forum Thread #1159: Freddyboy, Hartmut_Dunker button issues
 */

class TuyaE000BoundCluster extends BoundCluster {

  /**
   * Constructor
   * @param {Object} options
   * @param {Function} options.onButtonPress - Called when button press is detected
   * @param {Object} options.device - Device instance for logging
   */
  constructor({ onButtonPress, device }) {
    super();
    this._onButtonPress = onButtonPress;
    this._device = device;
    this._frameLog = []; // v5.5.796: Store frames for debugging
    this._lastButtonPress = 0; // v5.5.796: Debounce
  }

  /**
   * Log helper
   */
  log(...args) {
    if (this._device?.log) {
      this._device.log('[E000-BOUND]', ...args);
    } else {
      console.log('[E000-BOUND]', ...args);
    }
  }

  /**
   * v5.5.796: Handle incoming frame from cluster 0xE000
   * Enhanced with multiple parsing strategies for forum fix
   */
  async cmd0({data}={}) { await this._hc(0,data); }
  async cmd1({data}={}) { await this._hc(1,data); }
  async cmd2({data}={}) { await this._hc(2,data); }
  async cmd3({data}={}) { await this._hc(3,data); }
  async cmd4({data}={}) { await this._hc(4,data); }
  async cmd5({data}={}) { await this._hc(5,data); }
  async cmd6({data}={}) { await this._hc(6,data); }
  async cmdFD({data}={}) { await this._hc(0xFD,data); }
  async cmdFE({data}={}) { await this._hc(0xFE,data); }
  async cmdFF({data}={}) { await this._hc(0xFF,data); }
  async _hc(id,data) { try { this.log(`cmd${id}`,data?.toString?.('hex')||'none'); await this.handleFrame({cmdId:id,data},null,data); } catch(err) { this.log(' FRAME SAVED  cmd'+id+' error:', err.message); } }

  async handleFrame(frame, meta, rawFrame) {
    const cmdId = frame?.cmdId ?? frame?.commandId;
    const data = frame?.data || rawFrame;this.log(' Frame received:', {
      cmdId: cmdId,
      cmdIdHex: cmdId !== undefined ? `0x${cmdId.toString(16)}` : 'unknown',
      dataHex: data?.toString?.('hex') || 'no data',
      dataLength: data?.length || 0,
      endpoint: this.endpoint,
      meta: JSON.stringify(meta || {})
    });

    // v5.5.796: Store frame for debugging
    this._storeFrame(frame, meta, rawFrame);

    try {
      // v5.5.796: Debounce rapid duplicate frames (within 200ms)
      const now = Date.now();
      if (now - this._lastButtonPress < 200) {
        this.log(' Debounced duplicate frame');
        return null;
      }

      // Parse button press from frame using multiple strategies
      const buttonPress = this._parseButtonPress(frame, rawFrame, cmdId);
      
      if (buttonPress && typeof this._onButtonPress === 'function') {
        this._lastButtonPress = now;
        this.log(` Button ${buttonPress.button} ${buttonPress.pressType.toUpperCase()} (strategy: ${buttonPress.strategy})`);
        await this._onButtonPress(buttonPress.button, buttonPress.pressType);
      } else {
        this.log(' Could not parse button press from frame');
      }
    } catch (err) {
      this.log(' Error parsing frame:', err.message);
    }

    return null;
  }

  /**
   * v5.5.796: Store frame for debugging
   */
  _storeFrame(frame, meta, rawFrame) {
    this._frameLog.push({
      timestamp: Date.now(),
      cmdId: frame?.cmdId ?? frame?.commandId,
      data: frame?.data?.toString?.('hex'),
      rawFrame: rawFrame?.toString?.('hex'),
      endpoint: this.endpoint
    });
    if (this._frameLog.length > 20) {
      this._frameLog.shift();
    }
  }

  /**
   * v5.5.796: Get frame log for debugging
   */
  getFrameLog() {
    return [...this._frameLog];
  }

  /**
   * v5.5.796: Parse button press from frame data
   * Enhanced with multiple parsing strategies for forum fix
   */
  _parseButtonPress(frame, rawFrame, cmdId) {
    const data = frame?.data || rawFrame;// v5.5.796: Strategy 1 - Command ID based (Z2M pattern)
    // Some MOES devices use cmdId as button number
    if (cmdId !== undefined && cmdId >= 0 && cmdId <= 8) {
      const button = cmdId === 0 ? 1 : cmdId;
      let pressType = 'single';
      
      if (data && data.length >= 1) {
        pressType = resolvePressType(data[0], 'E000-S1');
      }
      
      this.log(`[STRATEGY-1] cmdId = ${cmdId} as button, data[0]=${data?.[0]} as pressType`);return { button, pressType, strategy: 'cmdId_as_button' };
    }

    // v5.5.796: Strategy 2 - Data contains button+press (most common)
    if (data && data.length >= 2) {
      const button = (data[0] >= 1 && data[0] <= 8) ? data[0] : (this.endpoint || 1);
      const pressValue = data[1];
      const pressType = resolvePressType(pressValue, 'E000-S2');
      
      this.log(`[STRATEGY-2] data[0]=${data[0]} as button, data[1]=${data[1]} as pressType`);
      return { button, pressType, strategy: 'data_button_press' };
    }

    // v5.5.796: Strategy 3 - Single byte encoded or press type only
    if (data && data.length === 1) {
      const value = data[0];
      
      // If value is 0-2, it's press type (button from endpoint)
      if (value <= 2) {
        const pressType = resolvePressType(value, 'E000-S3a');
        const button = this.endpoint || 1;
        this.log(`[STRATEGY-3a] data[0]=${value} as pressType, endpoint=${this.endpoint} as button`);
        return { button, pressType, strategy: 'single_byte_press_type' };
      }
      
      // Encoded format: (button-1)*3 + press_type or button*3 + press_type
      // Try both decodings
      const button1 = Math.floor(safeParse(value, 3)) + 1;
      const press1 = value % 3;
      
      if (button1 >= 1 && button1 <= 8) {
        const pressType = resolvePressType(press1, 'E000-S3b');
        this.log(`[STRATEGY-3b] Encoded: value=${value} -> button=${button1}, press=${press1}`);
        return { button: button1, pressType, strategy: 'single_byte_encoded' };
      }
    }

    // v5.5.796: Strategy 4 - Use endpoint as button, assume single press
    if (this.endpoint >= 1 && this.endpoint <= 8) {
      this.log(`[STRATEGY-4] Fallback: endpoint=${this.endpoint} as button, single press`);
      return { button: this.endpoint, pressType: 'single', strategy: 'endpoint_fallback' };
    }

    // v5.5.796: Strategy 5 - Last resort, button 1 single
    if (data && data.length > 0) {
      this.log(`[STRATEGY-5] Last resort: button=1, single. Raw data: ${data.toString('hex')}`);
      return { button: 1, pressType: 'single', strategy: 'last_resort' };
    }

    this.log(' No data in frame, cannot parse');
    return null;
  }
}

// Cluster ID for external reference
TuyaE000BoundCluster.CLUSTER_ID = 57344; // 0xE000

module.exports = TuyaE000BoundCluster;


