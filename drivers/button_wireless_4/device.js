'use strict';

const ButtonDevice = require('../../lib/devices/ButtonDevice');

/**
 * Button4GangDevice - v10.0.0 Universal Standard
 * Automatically adapts and registers physical & virtual button events
 * Inherits all features from ButtonDevice base class
 */
class Button4GangDevice extends ButtonDevice {

  async onNodeInit({ zclNode }) {
    this.buttonCount = 4;
    
    await super.onNodeInit({ zclNode }).catch(err => this.error('[INIT] Error:', err.message));
    
    // Physical button event listeners for TS004F
    if (this.zclNode && this.zclNode.endpoints[1]) {
      if (this.zclNode.endpoints[1].clusters.scenes) {
        this.zclNode.endpoints[1].clusters.scenes.on('command', this._onSceneCommand.bind(this));
      }
      if (this.zclNode.endpoints[1].clusters.onOff) {
        this.zclNode.endpoints[1].clusters.onOff.on('command', this._onOnOffCommand.bind(this));
      }
    }

    this.log('[BUTTON_WIRELESS_4] 🔘 v10.0.0 initialized via ButtonDevice');
  }

  _onSceneCommand({ command, data }) {
    this.log('[BUTTON_WIRELESS_4] Physical button scene command:', command, data);
    if (command === 'recall' && data) {
      const sceneId = data.sceneId;
      const button = Math.floor(sceneId / 10) + 1; // Extract button from scene ID
      const action = sceneId % 10; // Extract action type
      if (typeof this._triggerButtonFlow === 'function') {
        this._triggerButtonFlow(button, this._mapSceneAction(action));
      }
    }
  }

  _onOnOffCommand({ command, data }) {
    this.log('[BUTTON_WIRELESS_4] Virtual button onOff command:', command, data);
    // Virtual button handling logic could be extended here
  }

  _mapSceneAction(action) {
    switch(action) {
      case 0: return 'pushed';
      case 1: return 'double';
      case 2: return 'held';
      default: return 'pushed';
    }
  }

}

module.exports = Button4GangDevice;
