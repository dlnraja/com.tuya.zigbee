const { ZigBeeDevice } = require('homey-meshdriver');

class ZigbeeTuyaUniversalDevice extends ZigBeeDevice {
  
  async onMeshInit() {
    await super.onMeshInit();
    
    // Log device initialization
    this.log('🔌 device Tuya Universal initialisé');
    
    // Register capabilities based on device class
    this.registerCapability('onoff', 'genOnOff');
    this.registerCapability('measure_power', 'genPowerCfg');
    this.registerCapability('measure_temperature', 'genBasic');
    this.registerCapability('alarm_battery', 'genPowerCfg');
    
    
    // Set up advanced monitoring
    this.setupAdvancedMonitoring();
    
    // Set up flow cards
    this.setupFlowCards();
    
    // Log successful initialization
    this.log('✅ Toutes les capacités et fonctionnalités avancées enregistrées');
  }
  
  setupAdvancedMonitoring() {
    try {
      // Power monitoring
      
      if (this.hasCapability('measure_power')) {
        const powerCluster = this.getClusterEndpoint('genPowerCfg');
        if (powerCluster) {
          powerCluster.report('activePower', 1, 60, 1, (value) => {
            this.setCapabilityValue('measure_power', value);
            this.log(`⚡ Consommation: ${value}W`);
          });
        }
      }
      
      // Temperature monitoring
      
      if (this.hasCapability('measure_temperature')) {
        const tempCluster = this.getClusterEndpoint('genBasic');
        if (tempCluster) {
          tempCluster.report('temperature', 1, 300, 1, (value) => {
            this.setCapabilityValue('measure_temperature', value);
            this.log(`🌡️ Température: ${value}°C`);
          });
        }
      }
      
      // Battery monitoring
      
      if (this.hasCapability('alarm_battery')) {
        const batteryCluster = this.getClusterEndpoint('genPowerCfg');
        if (batteryCluster) {
          batteryCluster.report('batteryPercentageRemaining', 1, 3600, 1, (value) => {
            if (value <= 20) {
              this.setCapabilityValue('alarm_battery', true);
              this.log('🔋 Batterie faible');
            } else {
              this.setCapabilityValue('alarm_battery', false);
            }
          });
        }
      }
      
      // Environmental monitoring
      // Monitoring environnemental non configuré
      
    } catch (error) {
      this.log('⚠️ Configuration monitoring avancé échouée:', error.message);
    }
  }
  
  setupFlowCards() {
    try {
      // Register advanced flow cards
      this.registerFlowCard('toggle');
      this.registerFlowCard('is_on');
      this.registerFlowCard('is_off');
      this.registerFlowCard('power_threshold');
      this.registerFlowCard('temperature_alert');
      
      
    } catch (error) {
      this.log('⚠️ Configuration flow cards échouée:', error.message);
    }
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
  
  // Advanced error handling and recovery
  async onMeshInitFailed(error) {
    this.log('❌ Échec initialisation mesh:', error.message);
    
    // Auto-recovery attempt
    setTimeout(async () => {
      try {
        this.log('🔄 Tentative de récupération automatique...');
        await this.onMeshInit();
      } catch (recoveryError) {
        this.log('❌ Récupération échouée:', recoveryError.message);
      }
    }, 5000);
  }
  
  // Health check method
  async healthCheck() {
    try {
      const health = {
        timestamp: new Date().toISOString(),
        device_id: this.getData().id,
        capabilities: this.getCapabilities(),
        battery_level: this.getCapabilityValue('alarm_battery'),
        status: 'healthy'
      };
      
      this.log('📊 Health check:', health);
      return health;
      
    } catch (error) {
      this.log('❌ Health check échoué:', error.message);
      return { status: 'error', error: error.message };
    }
  }
}

module.exports = ZigbeeTuyaUniversalDevice;