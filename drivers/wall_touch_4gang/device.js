'use strict';

const WallTouchDevice = require('../../lib/WallTouchDevice');

/**
 * Wall Touch Button 4 Gang - SDK3 Compliant
 * 
 * Features:
 * - 4-gang button control
 * - Button combination detection
 * - Temperature monitoring (if supported)
 * - Tamper detection (if supported)
 * - Battery vs AC auto-detection
 * - 100% SDK3 compliant (no deprecated APIs)
 */
class WallTouch4GangDevice extends WallTouchDevice {

  async onNodeInit() {
    this.log('🎨 WallTouch4Gang initializing...');
    
    // Set button count (required by base class)
    this.buttonCount = 4;
    
    // Initialize via SDK3 base class
    await super.onNodeInit();
    
    this.log('✅ WallTouch4Gang ready (SDK3)');
  }
}

module.exports = WallTouch4GangDevice;
