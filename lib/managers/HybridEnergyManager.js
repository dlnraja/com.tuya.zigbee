'use strict';

/**
 * Hybrid Energy Manager
 * Gère intelligemment les sources d'énergie (battery, AC, DC, USB, hybrid)
 * et les capacités propriétaires des constructeurs
 */

const { ZigBeeDevice } = require('homey-zigbeedriver');

class HybridEnergyManager {
  
  constructor(device) {
    this.device = device;
    this.powerSource = null;
    this.batteryType = null;
    this.energyMode = 'balanced'; // performance, balanced, power_saving
  }

  /**
   * Détection automatique de la source d'énergie
   */
  async detectPowerSource() {
    const settings = this.device.getSettings();
    const capabilities = this.device.getCapabilities();
    
    // Méthode 1: Basé sur les capabilities
    if (capabilities.includes('measure_battery')) {
      // Vérifier si vraiment battery ou hybrid (AC+battery backup)
      if (capabilities.includes('measure_power') || capabilities.includes('measure_voltage')) {
        this.powerSource = 'hybrid';
        this.device.log('Detected hybrid power source (AC + battery backup)');
      } else {
        this.powerSource = 'battery';
        this.device.log('Detected battery power source');
      }
    } else if (capabilities.includes('measure_power')) {
      this.powerSource = 'ac';
      this.device.log('Detected AC power source');
    } else {
      this.powerSource = 'dc';
      this.device.log('Detected DC power source');
    }

    // Méthode 2: Basé sur energy.batteries dans driver
    const driverEnergy = this.device.driver?.manifest?.energy;
    if (driverEnergy && driverEnergy.batteries && driverEnergy.batteries.length > 0) {
      this.batteryType = driverEnergy.batteries[0];
      this.device.log(`Detected battery type: ${this.batteryType}`);
    }

    // Méthode 3: Basé sur les clusters Zigbee
    try {
      const node = this.device.zclNode;
      const powerCluster = node.endpoints[1]?.clusters?.genPowerCfg;
      
      if (powerCluster) {
        const batteryVoltage = await powerCluster.Promise.resolve(readAttributes(['batteryVoltage'])).catch(() => null);
        if (batteryVoltage && batteryVoltage.batteryVoltage > 0) {
          this.powerSource = this.powerSource === 'ac' ? 'hybrid' : 'battery';
        }
      }
    } catch (err) {
      this.device.error('Error detecting power via clusters:', err);
    }

    return this.powerSource;
  }

  /**
   * Gestion intelligente du reporting selon la source d'énergie
   */
  getOptimalReportingConfig() {
    const configs = {
      battery: {
        minInterval: 300,    // 5 minutes
        maxInterval: 3600,   // 1 hour
        reportableChange: 1
      },
      ac: {
        minInterval: 5,      // 5 seconds
        maxInterval: 60,     // 1 minute
        reportableChange: 0.1
      },
      dc: {
        minInterval: 10,
        maxInterval: 300,
        reportableChange: 0.5
      },
      hybrid: {
        minInterval: 30,
        maxInterval: 600,
        reportableChange: 0.5
      }
    };

    // Ajuster selon le mode énergétique
    const config = configs[this.powerSource] || configs.battery;
    
    if (this.energyMode === 'performance') {
      config.minInterval = Math.max(1, Math.floor(config.minInterval / 2));
      config.maxInterval = Math.max(10, Math.floor(config.maxInterval / 2));
    } else if (this.energyMode === 'power_saving') {
      config.minInterval = config.minInterval * 2;
      config.maxInterval = config.maxInterval * 2;
    }

    return config;
  }

  /**
   * Gestion des capacités propriétaires Tuya
   */
  async registerProprietaryCapabilities(tuyaDpMap) {
    if (!tuyaDpMap) return;

    this.device.log('Registering proprietary Tuya datapoints:', tuyaDpMap);

    // Enregistrer les handlers pour chaque DP
    for (const [dp, capability] of Object.entries(tuyaDpMap)) {
      try {
        await this.registerTuyaDp(parseInt(dp), capability);
      } catch (err) {
        this.device.error(`Failed to register DP ${dp}:`, err);
      }
    }
  }

  async registerTuyaDp(dp, capabilityName) {
    const node = this.device.zclNode;
    if (!node) return;

    try {
      // Écouter les rapports Tuya pour ce DP
      const cluster = node.endpoints[1]?.clusters?.manuSpecificTuya;
      
      if (cluster) {
        cluster.on('reporting', (data) => {
          if (data.dp === dp) {
            this.handleTuyaDpReport(dp, data.data, capabilityName);
          }
        });
      }
    } catch (err) {
      this.device.error(`Error registering Tuya DP ${dp}:`, err);
    }
  }

  handleTuyaDpReport(dp, rawData, capabilityName) {
    this.device.log(`Tuya DP ${dp} report:`, rawData);

    // Conversion intelligente selon le type de capacité
    let value = rawData;

    if (capabilityName.includes('battery')) {
      value = this.convertBatteryValue(rawData);
    } else if (capabilityName.includes('temperature')) {
      value = this.convertTemperatureValue(rawData);
    } else if (capabilityName.includes('humidity')) {
      value = this.convertHumidityValue(rawData);
    }

    // Mettre à jour la capability Homey
    if (this.device.hasCapability(capabilityName)) {
      this.device.Promise.resolve(setCapabilityValue(capabilityName, value)).catch(err => {
        this.device.error(`Failed to set ${capabilityName}:`, err);
      });
    }
  }

  convertBatteryValue(rawValue) {
    // Tuya battery: 0-100 ou 0-200 (double)
    if (rawValue > 100) return Math.min(100, Math.round(rawValue / 2));
    return Math.min(100, Math.max(0, rawValue));
  }

  convertTemperatureValue(rawValue) {
    // Tuya temp: souvent en dixièmes de degré
    return parseFloat((rawValue / 10).toFixed(1));
  }

  convertHumidityValue(rawValue) {
    // Tuya humidity: 0-100
    return Math.min(100, Math.max(0, rawValue));
  }

  /**
   * Définir le mode énergétique
   */
  setEnergyMode(mode) {
    if (!['performance', 'balanced', 'power_saving'].includes(mode)) {
      throw new Error(`Invalid energy mode: ${mode}`);
    }
    
    this.energyMode = mode;
    this.device.log(`Energy mode set to: ${mode}`);
    
    // Appliquer le nouveau mode
    this.applyEnergyMode();
  }

  async applyEnergyMode() {
    const config = this.getOptimalReportingConfig();
    this.device.log('Applying energy mode config:', config);

    // Reconfigurer le reporting pour toutes les capacités mesurables
    const capabilities = this.device.getCapabilities();
    
    for (const cap of capabilities) {
      if (cap.startsWith('measure_') || cap.startsWith('meter_')) {
        await Promise.resolve(configureCapabilityReporting(cap, config)).catch(err => {
          this.device.error(`Failed to configure ${cap}:`, err);
        });
      }
    }
  }

  async configureCapabilityReporting(capability, config) {
    // Implémenter la configuration du reporting Zigbee
    // selon la capability et le config
    this.device.log(`Configuring reporting for ${capability}`, config);
    // TODO: Implémenter avec registerCapability ou configureAttributeReporting
  }
}

module.exports = HybridEnergyManager;
