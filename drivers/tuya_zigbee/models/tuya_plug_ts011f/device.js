/**
 * Tuya Smart Plug TS011F Device
 * Logique spécifique à l'appareil pour la prise intelligente Tuya
 */

const TuyaPlugTS011F = require('./driver');

class TuyaPlugTS011FDevice extends TuyaPlugTS011F {
  
  constructor() {
    super();
    
    // Configuration spécifique à l'appareil
    this.deviceType = 'outlet';
    this.modelName = 'TS011F';
    this.manufacturer = 'Tuya';
    
    // Métadonnées de l'appareil
    this.metadata = {
      category: 'socket',
      capabilities: ['onoff', 'measure_power', 'meter_power'],
      tuyaDps: [1, 2, 101, 102],
      zigbeeClusters: ['genOnOff', 'haElectricalMeasurement', 'seMetering', 'manuSpecificTuya']
    };
  }
  
  /**
   * Initialisation spécifique à l'appareil
   */
  async onNodeInit({ zclNode, node }) {
    // Appeler l'initialisation parent
    await super.onNodeInit({ zclNode, node });
    
    // Configuration spécifique TS011F
    this._configureTS011FSpecific();
    
    // Écouter les événements spécifiques
    this._setupDeviceSpecificListeners();
    
    this.log('TS011F device-specific initialization completed');
  }
  
  /**
   * Configuration spécifique au modèle TS011F
   */
  _configureTS011FSpecific() {
    // Paramètres de calibration spécifiques au TS011F
    this.ts011fConfig = {
      powerOffset: 0,        // Offset de puissance en W
      voltageOffset: 0,      // Offset de tension en V
      currentOffset: 0,      // Offset de courant en A
      powerFactor: 1.0,      // Facteur de puissance
      maxPower: 3680,        // Puissance maximale en W (16A * 230V)
      maxVoltage: 250,       // Tension maximale en V
      maxCurrent: 16         // Courant maximal en A
    };
    
    // Appliquer les paramètres de calibration
    this._applyTS011FCalibration();
  }
  
  /**
   * Applique la calibration spécifique au TS011F
   */
  _applyTS011FCalibration() {
    // Ajuster la calibration de puissance avec les paramètres TS011F
    const totalCalibration = this.powerCalibration * this.ts011fConfig.powerFactor;
    
    this.log(`TS011F calibration applied: power=${totalCalibration}, factor=${this.ts011fConfig.powerFactor}`);
  }
  
  /**
   * Configuration des écouteurs spécifiques à l'appareil
   */
  _setupDeviceSpecificListeners() {
    // Écouter les changements de puissance avec validation TS011F
    this.on('capability.measure_power', async (value) => {
      await this._validateTS011FPower(value);
    });
    
    // Écouter les changements d'état avec protection
    this.on('capability.onoff', async (value) => {
      await this._validateTS011FState(value);
    });
  }
  
  /**
   * Validation de la puissance selon les limites TS011F
   */
  async _validateTS011FPower(power) {
    if (power > this.ts011fConfig.maxPower) {
      this.log(`Warning: Power ${power}W exceeds TS011F maximum ${this.ts011fConfig.maxPower}W`);
      
      // Optionnel : déclencher une alerte
      if (this.hasCapability('alarm_generic')) {
        await this.setCapabilityValue('alarm_generic', true);
        
        // Réinitialiser l'alarme après 5 secondes
        setTimeout(async () => {
          await this.setCapabilityValue('alarm_generic', false);
        }, 5000);
      }
    }
  }
  
  /**
   * Validation de l'état selon les contraintes TS011F
   */
  async _validateTS011FState(state) {
    // Vérifier que l'appareil peut changer d'état
    if (this._isOverloaded()) {
      this.log('Warning: Cannot change state - device is overloaded');
      return false;
    }
    
    return true;
  }
  
  /**
   * Vérifie si l'appareil est surchargé
   */
  _isOverloaded() {
    return this._power > this.ts011fConfig.maxPower * 0.95; // 95% du maximum
  }
  
  /**
   * Obtient les informations de diagnostic TS011F
   */
  getTS011FDiagnostics() {
    return {
      deviceType: this.deviceType,
      modelName: this.modelName,
      manufacturer: this.manufacturer,
      currentPower: this._power,
      maxPower: this.ts011fConfig.maxPower,
      powerUtilization: (this._power / this.ts011fConfig.maxPower * 100).toFixed(1) + '%',
      calibration: {
        power: this.powerCalibration,
        factor: this.ts011fConfig.powerFactor,
        total: this.powerCalibration * this.ts011fConfig.powerFactor
      },
      status: {
        overloaded: this._isOverloaded(),
        healthy: this._power <= this.ts011fConfig.maxPower,
        lastUpdate: new Date(this._lastPowerUpdate).toISOString()
      }
    };
  }
  
  /**
   * Mise à jour des paramètres TS011F
   */
  async updateTS011FConfig(newConfig) {
    try {
      // Valider la nouvelle configuration
      if (newConfig.maxPower && newConfig.maxPower > 0) {
        this.ts011fConfig.maxPower = newConfig.maxPower;
      }
      
      if (newConfig.powerFactor && newConfig.powerFactor > 0) {
        this.ts011fConfig.powerFactor = newConfig.powerFactor;
      }
      
      // Réappliquer la calibration
      this._applyTS011FCalibration();
      
      this.log('TS011F configuration updated successfully');
      return true;
      
    } catch (error) {
      this.error('Error updating TS011F config:', error);
      return false;
    }
  }
  
  /**
   * Nettoyage spécifique au TS011F
   */
  async onDeleted() {
    // Appeler le nettoyage parent
    await super.onDeleted();
    
    // Nettoyage spécifique au TS011F
    this.log('TS011F device-specific cleanup completed');
  }
}

module.exports = TuyaPlugTS011FDevice;
