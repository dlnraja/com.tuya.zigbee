'use strict';

const WallTouchDevice = require('../../lib/WallTouchDevice');

/**
 * Wall Touch Button 3 Gang - SDK3 Compliant
 * 
 * Features:
 * - 3-gang button control
 * - Button combination detection
 * - Temperature monitoring (if supported)
 * - Tamper detection (if supported)
 * - Battery vs AC auto-detection
 * - 100% SDK3 compliant (no deprecated APIs)
 */
class WallTouch3GangDevice extends WallTouchDevice {

  async onNodeInit() {
    this.log('🎨 WallTouch3Gang initializing...');
    
    // Set button count (required by base class)
    this.buttonCount = 3;
    
    // Initialize via SDK3 base class
    await super.onNodeInit();
    
    this.log('✅ WallTouch3Gang ready (SDK3)');
  }
}

module.exports = WallTouch3GangDevice;
