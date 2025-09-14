const { ZigBeeDevice } = require('homey-zigbeedriver');

class SceneRemoteDevice extends ZigBeeDevice {
  
  async onNodeInit() {
    await super.onNodeInit();
    
    this.printNode();
    
    // Enable debugging
    this.enableDebug();
    
    // Register button capabilities
    
    if (this.hasCapability('button.1')) {
      this.registerCapability('button.1', 'genOnOff', {
        endpoint: 1
      });
    }
    if (this.hasCapability('button.2')) {
      this.registerCapability('button.2', 'genOnOff', {
        endpoint: 2
      });
    }
  }
  
}

module.exports = SceneRemoteDevice;
