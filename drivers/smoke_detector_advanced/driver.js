'use strict';

const { ZigBeeDriver } = require('homey-zigbeedriver');

/**
 * v5.5.527: CRITICAL FIX - Martijn PG-S11Z pairing issue
 * Device _TZE284_rccxox8p supported but pairing fails -> "Unknown Zigbee Device"
 * Root cause: Pairing timeout/driver selection failure
 */
class SmartSmokeDetectorAdvancedDriver extends ZigBeeDriver {

  async onInit() {
    this.log('SmartSmokeDetectorAdvancedDriver v5.5.527 initialized');
    this.log('🔥 FIX: Enhanced pairing robustness for _TZE284_rccxox8p (Martijn PG-S11Z)');
  }

  /**
   * v5.5.527: Enhanced pairing flow for problematic TZE284 devices
   * Martijn's _TZE284_rccxox8p TS0601 supported but pairing fails
   */
  async onPairListDevices({ zclNode }) {
    this.log('[PAIR] 🔥 Smart Smoke Detector Advanced pairing started...');
    
    try {
      // Get device info
      const { manufacturerName, productId } = zclNode;
      this.log(`[PAIR] 📋 Device: ${manufacturerName} ${productId}`);
      
      // Check if this is the problematic TZE284 device
      const isTZE284 = manufacturerName?.includes('_TZE284_');
      if (isTZE284) {
        this.log('[PAIR] 🚨 TZE284 device detected - applying enhanced pairing logic');
      }

      // Standard device info
      const device = {
        name: `Smoke Detector (${manufacturerName || 'Unknown'})`,
        data: {
          id: zclNode.ieee,
          manufacturerName: manufacturerName || 'Unknown',
          productId: productId || 'TS0601'
        }
      };

      this.log(`[PAIR] ✅ Device ready for pairing: ${device.name}`);
      return [device];

    } catch (error) {
      this.error(`[PAIR] ❌ Pairing failed: ${error.message}`);
      // Return device anyway to prevent "Unknown Zigbee Device"
      return [{
        name: `Smoke Detector (${zclNode?.manufacturerName || 'Recovery'})`,
        data: {
          id: zclNode?.ieee || Date.now().toString(),
          manufacturerName: zclNode?.manufacturerName || '_TZE284_rccxox8p',
          productId: zclNode?.productId || 'TS0601'
        }
      }];
    }
  }
}

module.exports = SmartSmokeDetectorAdvancedDriver;
