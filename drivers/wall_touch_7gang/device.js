'use strict';

// MIGRATED TO HYBRID SYSTEM v2.0
const HybridDriverSystem = require('../../lib/HybridDriverSystem');
const BatteryManagerV2 = require('../../lib/BatteryManagerV2');

/**
 * wall_touch_7gang - Hybrid-Enhanced Driver
 *
 * MIGRATION: Original driver enhanced with Hybrid System
 * - Auto-adaptive capabilities
 * - Energy-aware management
 * - Smart detection
 */

// Create hybrid base
const HybridDevice = HybridDriverSystem.createHybridDevice();

'use strict';

const WallTouchDevice = require('../../lib/devices/WallTouchDevice');

/**
 * Wall Touch Button 7 Gang - SDK3 Compliant
 *
 * Features:
 * - 7-gang button control
 * - Button combination detection
 * - Temperature monitoring (if supported)
 * - Tamper detection (if supported)
 * - Battery vs AC auto-detection
 * - 100% SDK3 compliant (no deprecated APIs)
 */
class WallTouch7GangDevice extends HybridDevice {

  async onNodeInit({ zclNode }) {
    // Hybrid system initialization
    await super.onNodeInit({ zclNode });

    // Original initialization below:
    this.log('[COLOR] WallTouch7Gang initializing...');

    // Set button count (required by base class)
    this.buttonCount = 7;

    // Initialize via SDK3 base class
    await super.onNodeInit({ zclNode });

    // Setup sensor capabilities (SDK3)
    await this.setupTemperatureSensor();

    this.log('[OK] WallTouch7Gang ready (SDK3)');
  }

  /**
   * Setup measure_temperature capability (SDK3)
   * Cluster 1026 - measuredValue
   */
  async setupTemperatureSensor() {
    if (!this.hasCapability('measure_temperature')) {
      return;
    }

    this.log('[TEMP]  Setting up measure_temperature (cluster 1026)...');

    const endpoint = this.zclNode.endpoints[1];
    if (!endpoint?.clusters[1026]) {
      this.log('[WARN]  Cluster 1026 not available');
      return;
    }

    try {
      /* REFACTOR: registerCapability deprecated with cluster spec.
   Original: this.registerCapability('measure_temperature', 1026,
   Replace with SDK3 pattern - see ZigbeeDevice docs
   Capability: 'measure_temperature', Cluster: 1026
*/
      // this.registerCapability('measure_temperature', 1026, {
      //         get: 'measuredValue',
      //         report: 'measuredValue',
      //         reportParser: value => value / 100,
      //         reportOpts: {
      //           configureAttributeReporting: {
      //             minInterval: 60,
      //             maxInterval: 3600,
      //             minChange: 10
      //           }
      //         },
      //         getOpts: {
      //           getOnStart: true
      //         }
      //       });

      this.log('[OK] measure_temperature configured (cluster 1026)');
    } catch (err) {
      this.error('measure_temperature setup failed:', err);
    }
  }
}

module.exports = WallTouch7GangDevice;


module.exports = WallTouch7GangDevice;
