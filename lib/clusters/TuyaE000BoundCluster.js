'use strict';

const { BoundCluster } = require('zigbee-clusters');

/**
 * TuyaE000BoundCluster - v5.5.758 MOES Button Fix
 *
 * BoundCluster for receiving button presses from Tuya cluster 0xE000 (57344)
 * Used by MOES _TZ3000_zgyzgdua and similar TS0044 devices
 *
 * WHY THIS IS NEEDED:
 * - Cluster 0xE000 is a Tuya-specific cluster not known by Homey SDK
 * - Homey doesn't create cluster objects for unknown clusters
 * - We need a BoundCluster to receive incoming commands from the device
 *
 * Device sends button presses as commands on cluster 57344:
 * - Command payload contains button number and press type
 * - Press types: 0=single, 1=double, 2=long
 *
 * Sources:
 * - Z2M Issue #28224: MOES XH-SY-04Z 4-button remote
 * - Device structure: EP1 inClusterList: [1, 6, 57344, 0]
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
   * Handle incoming frame from cluster 0xE000
   * This is called by the zigbee-clusters library when a frame arrives
   */
  async handleFrame(frame, meta, rawFrame) {
    this.log('📥 Frame received:', {
      cmdId: frame.cmdId,
      data: frame.data?.toString('hex'),
      meta
    });

    try {
      // Parse button press from frame
      const buttonPress = this._parseButtonPress(frame, rawFrame);
      
      if (buttonPress && typeof this._onButtonPress === 'function') {
        this.log(`🔘 Button ${buttonPress.button} ${buttonPress.pressType.toUpperCase()}`);
        await this._onButtonPress(buttonPress.button, buttonPress.pressType);
      }
    } catch (err) {
      this.log('⚠️ Error parsing frame:', err.message);
    }

    // Return null = no cluster-specific response needed
    return null;
  }

  /**
   * Parse button press from frame data
   * Different devices may use different formats
   */
  _parseButtonPress(frame, rawFrame) {
    const pressTypeMap = { 0: 'single', 1: 'double', 2: 'long' };
    
    // Try to extract button number and press type from frame data
    const data = frame.data || rawFrame;
    
    if (!data || data.length === 0) {
      this.log('⚠️ No data in frame');
      return null;
    }

    // Common patterns for Tuya button clusters:
    // Pattern 1: [button_number, press_type]
    // Pattern 2: [press_type] with button determined by endpoint
    // Pattern 3: Single byte value representing button+action

    let button = 1;
    let pressType = 'single';

    if (data.length >= 2) {
      // Pattern 1: [button, press_type]
      button = data[0] || 1;
      const pressValue = data[1];
      pressType = pressTypeMap[pressValue] || 'single';
    } else if (data.length === 1) {
      // Pattern 2 or 3: Single byte
      const value = data[0];
      
      // If value is 0-2, it's press type (button from endpoint)
      if (value <= 2) {
        pressType = pressTypeMap[value] || 'single';
        // Button number comes from endpoint (set by caller)
        button = this.endpoint || 1;
      } else {
        // Encoded format: button*3 + press_type
        button = Math.floor(value / 3) + 1;
        pressType = pressTypeMap[value % 3] || 'single';
      }
    }

    // Validate button number (1-4 for 4-gang button)
    if (button < 1 || button > 8) {
      button = 1;
    }

    return { button, pressType };
  }
}

// Cluster ID for external reference
TuyaE000BoundCluster.CLUSTER_ID = 57344; // 0xE000

module.exports = TuyaE000BoundCluster;
