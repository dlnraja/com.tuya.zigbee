'use strict';

const { ZigBeeDevice } = require('homey-meshdriver');

<<<<<<< HEAD
class ZigbeeOnoffDevice extends ZigBeeDevice {
  async onMeshInit() {
    await super.onMeshInit();
    
    this.log('ZigbeeOnoffDevice initialized');
    
=======
class ZigbeeOnOffDevice extends ZigBeeDevice {
  async onMeshInit() {
    await super.onMeshInit();
    
>>>>>>> master
    // Enable debugging
    this.enableDebug();
    
    // Register capabilities
<<<<<<< HEAD
    
    // Register onoff capabilities
    this.registerCapability('onoff', 'genOnOff');
    
    this.log('ZigbeeOnoffDevice capabilities registered');
  }

  
    // Register onoff capabilities
    this.registerCapability('onoff', 'genOnOff');

  async onSettings({ oldSettings, newSettings, changedKeys }) {
    this.log('ZigbeeOnoffDevice settings changed');
  }
}

module.exports = ZigbeeOnoffDevice;
=======
    this.registerCapability('onoff', 'genOnOff');
    
    this.log('Zigbee OnOff Device initialized');
  }

  async onSettings({ oldSettings, newSettings, changedKeys }) {
    this.log('Zigbee OnOff Device settings changed');
  }
}

module.exports = ZigbeeOnOffDevice; 
>>>>>>> master
