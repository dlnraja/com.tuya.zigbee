const { ZigBeeDriver } = require('homey-meshdriver');

class TuyaDriver extends ZigBeeDriver {
  async onMeshInit() {
    await super.onMeshInit();
    
    // Configuration des clusters
    this.enableDebug();
    this.printNode();
  }
}

module.exports = TuyaDriver;