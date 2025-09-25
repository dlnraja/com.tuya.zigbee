'use strict';

const { Device } = require('homey');

class SceneControllerDevice extends Device {

  async onInit() {
    this.log('scene_controller device has been initialized');
    
    // Register capability listeners
    this.registerCapabilityListener('onoff', this.onCapabilityOnoff.bind(this));
  }

  async onCapabilityOnoff(value, opts) {
    this.log('onCapabilityOnoff was called with value:', value);
    // Implement your device control logic here
    return Promise.resolve();
  }

}

module.exports = SceneControllerDevice;
