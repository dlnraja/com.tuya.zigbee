const { ZigBeeDevice } = require('homey-meshdriver');

class SwitchDevice extends ZigBeeDevice {
  
  async onMeshInit() {
    await super.onMeshInit();
    
    this.log('🔌 switch initialisé');
    
    // Register basic capabilities
    this.registerCapability('onoff', 'genOnOff');
    
    this.log('✅ Device initialisé avec succès');
  }
  
  async onCapabilityOnoff(value, opts) {
    try {
      this.log(`🔌 Définition onoff: ${value}`);
      
      const onoffCluster = this.getClusterEndpoint('genOnOff');
      if (onoffCluster) {
        if (value) {
          await onoffCluster.on();
        } else {
          await onoffCluster.off();
        }
        
        this.log(`✅ Onoff défini: ${value}`);
      }
    } catch (error) {
      this.log('❌ Échec définition onoff:', error.message);
      throw error;
    }
  }
}

module.exports = SwitchDevice;