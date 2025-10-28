'use strict';

const WallTouchDevice = require('../../lib/WallTouchDevice');

/**
 * Wall Touch Button 1 Gang - SDK3 Compliant
 * 
 * Features:
 * - 1-gang button control
 * - Button combination detection
 * - Temperature monitoring (if supported)
 * - Tamper detection (if supported)
 * - Battery vs AC auto-detection
 * - 100% SDK3 compliant (no deprecated APIs)
 */
class WallTouch1GangDevice extends WallTouchDevice {

  async onNodeInit({ zclNode }) {
    this.log('[COLOR] WallTouch1Gang initializing...');
    
    // Set button count (required by base class)
    this.buttonCount = 1;
    
    // Initialize via SDK3 base class
    await super.onNodeInit({ zclNode });

    // Setup sensor capabilities (SDK3)
    await this.setupTemperatureSensor();
    
    this.log('[OK] WallTouch1Gang ready (SDK3)');
  }
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
          } catch (err) { this.error(err); }},
        getOpts: {
          getOnStart: true
        }
      });
      
      this.log('[OK] measure_temperature configured (cluster 1026)');
    } catch (err) {
      this.error('measure_temperature setup failed:', err);
    }
  }
}

module.exports = WallTouch1GangDevice;
