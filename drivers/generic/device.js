// generic - Migrated device
import { ZigBeeDevice } from 'homey-meshdriver';

class genericDevice extends ZigBeeDevice {
  
  async onMeshInit() {
    await super.onMeshInit();
    
    // Enregistrement des capacités
    
    
    // Configuration du monitoring
    this.setupMonitoring();
    
    // Configuration des flow cards
    this.setupFlowCards();
  }
}

export default genericDevice;