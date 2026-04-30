'use strict';

const TuyaZigbeeDevice = require('../../lib/tuya/TuyaZigbeeDevice');

/**
 * 4 Gang Wall Remote (Type 2)
 * v5.13.2: Migrated to TuyaZigbeeDevice with standardized onZigBeeMessage hook
 */
class wall_remote_4_gang_2 extends TuyaZigbeeDevice {

  async onNodeInit({ zclNode }) {
    this.log(' Initializing 4 Gang Wall Remote (Type 2)...');
    
    // Call parent to setup raw frame fallbacks
    await super.onNodeInit({ zclNode });
      this.homey.flow.getTriggerCard('wall_remote_4_gang_buttons_2')?.trigger(this, {}, {}).catch(this.error || console.error)
    if (this._buttonPressedTriggerDevice ) {
      this._buttonPressedTriggerDevice.registerRunListener(async (args, state) => {
        return args.button === state.button;
      });
    }
    
    this.log(' Remote Initialized');
  }

  /**
   * Standardized raw frame handler for remote buttons
   * Intercepts cluster 6 (OnOff) and 8 (LevelControl)
   * v5.13.2: Intercepts BEFORE Homey SDK routing
   */
  onZigBeeMessage(endpointId, clusterId, frame, meta) {
    if (clusterId === 6 || clusterId === 8) {
      this.log(`[RX] Remote Frame: ep=${endpointId}, cl=${clusterId}`, JSON.stringify(frame));
      
      const frameData = frame.toJSON?.().data || frame.data || [];this.buttonCommandParser(clusterId, frameData );
      return true; // Mark as handled to prevent SDK routing
    }
    return false;
  }

  buttonCommandParser(cl, data) {
    const side = cl === 6 ? 'left' : 'right';
    
    // Logic from original implementation (data[2] is command/action index)
    // 0 = Down, 1 = Up
    const button = data[2] === 0 ? side + 'Down' : 
      data[2] === 1 ? side + 'Up' : 
        data[3] === 1 ? side + 'Down' : side + 'Up';
                   
    this.log(`[BUTTON] Detected: ${button}`);
    
    if (this._buttonPressedTriggerDevice) {
      return this._buttonPressedTriggerDevice.trigger(this, {}, { button: `${button}` })
        .then(() => this.log(`[BUTTON] Triggered flow: ${button}`))
        .catch(err => this.error('[BUTTON] Trigger error:', err.message));
    }
  }

  onDeleted() {
    this.log('4 Gang Wall Remote removed');
    if (typeof super.onDeleted === 'function') super.onDeleted();
  }

}

module.exports = wall_remote_4_gang_2;

