'use strict';

/**
 * ENERGY CAPABILITY DETECTOR
 * 
 * Détecte intelligemment les capacités de mesure d'énergie:
 * - Voltage, Current, Power, Energy
 * - Battery percentage, voltage
 * - Power source type (mains, battery, DC)
 * - Consumption modes (AC/DC)
 * 
 * S'adapte dynamiquement aux clusters disponibles
 */

const { CLUSTER } = require('zigbee-clusters');

class EnergyCapabilityDetector {
  
  /**
   * Détecte toutes les capacités énergétiques d'un device
   * @param {Object} node - Le node Zigbee
   * @returns {Object} Capacités détectées avec KPIs
   */
  static detectEnergyCapabilities(node) {
    const capabilities = {
      powerSource: null,      // 'mains', 'battery', 'dc', 'unknown'
      consumptionMode: null,  // 'ac', 'dc', 'none'
      measurements: {
        voltage: false,       // measure_voltage
        current: false,       // measure_current
        power: false,         // measure_power
        energy: false,        // meter_power
        battery: false,       // measure_battery
        batteryVoltage: false // measure_voltage.battery
      },
      kpis: {},
      clusters: []
    };

    if (!node || !node.endpoints) {
      return capabilities;
    }

    // Parcourir tous les endpoints
    Object.keys(node.endpoints).forEach(epId => {
      const endpoint = node.endpoints[epId];
      if (!endpoint || !endpoint.clusters) return;

      // Détecter power source
      if (endpoint.clusters.basic) {
        const powerSource = this._detectPowerSource(endpoint.clusters.basic);
        if (powerSource) {
          capabilities.powerSource = powerSource;
        }
      }

      // Détecter mesures électriques (AC)
      if (endpoint.clusters.electricalMeasurement) {
        Object.assign(capabilities.measurements, 
          this._detectElectricalMeasurements(endpoint.clusters.electricalMeasurement)
        );
        capabilities.clusters.push('electricalMeasurement');
        capabilities.consumptionMode = 'ac';
      }

      // Détecter metering (énergie cumulée)
      if (endpoint.clusters.metering) {
        capabilities.measurements.energy = true;
        capabilities.clusters.push('metering');
      }

      // Détecter batterie
      if (endpoint.clusters.powerConfiguration) {
        Object.assign(capabilities.measurements,
          this._detectBatteryMeasurements(endpoint.clusters.powerConfiguration)
        );
        capabilities.clusters.push('powerConfiguration');
      }

      // Clusters Tuya propriétaires
      if (endpoint.clusters.tuya || endpoint.clusters.tuyaSpecificCluster) {
        const tuyaCluster = endpoint.clusters.tuya || endpoint.clusters.tuyaSpecificCluster;
        Object.assign(capabilities.measurements,
          this._detectTuyaMeasurements(tuyaCluster)
        );
      }
    });

    // Générer KPIs recommandés
    capabilities.kpis = this._generateKPIs(capabilities);

    return capabilities;
  }

  /**
   * Détecte le type de source d'énergie
   * @private
   */
  static _detectPowerSource(basicCluster) {
    if (!basicCluster.attributes) return null;

    const powerSourceAttr = basicCluster.attributes.find(
      attr => attr.name === 'powerSource'
    );

    if (!powerSourceAttr || !powerSourceAttr.value) return null;

    const value = powerSourceAttr.value;
    
    if (typeof value === 'string') {
      if (value.includes('mains') || value.includes('ac')) return 'mains';
      if (value.includes('battery')) return 'battery';
      if (value.includes('dc')) return 'dc';
    } else if (typeof value === 'number') {
      // ZCL PowerSource enum
      // 0x01 = Mains (single phase)
      // 0x03 = Battery
      // 0x04 = DC Source
      if (value === 1) return 'mains';
      if (value === 3) return 'battery';
      if (value === 4) return 'dc';
    }

    return 'unknown';
  }

  /**
   * Détecte les mesures électriques AC
   * @private
   */
  static _detectElectricalMeasurements(emCluster) {
    const measurements = {
      voltage: false,
      current: false,
      power: false
    };

    if (!emCluster.attributes) return measurements;

    // Voltage RMS (AC)
    if (emCluster.attributes.find(a => 
      a.name === 'rmsVoltage' || 
      a.name === 'acVoltageMultiplier' ||
      a.id === 0x0505 // rmsVoltage
    )) {
      measurements.voltage = true;
    }

    // Current RMS (AC)
    if (emCluster.attributes.find(a => 
      a.name === 'rmsCurrent' || 
      a.name === 'acCurrentMultiplier' ||
      a.id === 0x0508 // rmsCurrent
    )) {
      measurements.current = true;
    }

    // Active Power (Watts)
    if (emCluster.attributes.find(a => 
      a.name === 'activePower' || 
      a.name === 'acPowerMultiplier' ||
      a.id === 0x050B // activePower
    )) {
      measurements.power = true;
    }

    return measurements;
  }

  /**
   * Détecte les mesures de batterie
   * @private
   */
  static _detectBatteryMeasurements(powerConfigCluster) {
    const measurements = {
      battery: false,
      batteryVoltage: false
    };

    if (!powerConfigCluster.attributes) return measurements;

    // Battery percentage
    if (powerConfigCluster.attributes.find(a => 
      a.name === 'batteryPercentageRemaining' ||
      a.id === 0x0021
    )) {
      measurements.battery = true;
    }

    // Battery voltage
    if (powerConfigCluster.attributes.find(a => 
      a.name === 'batteryVoltage' ||
      a.id === 0x0020
    )) {
      measurements.batteryVoltage = true;
    }

    return measurements;
  }

  /**
   * Détecte les mesures dans clusters Tuya
   * @private
   */
  static _detectTuyaMeasurements(tuyaCluster) {
    const measurements = {
      voltage: false,
      current: false,
      power: false,
      energy: false
    };

    // Tuya utilise des DataPoints custom
    // Chercher les DPs communs pour énergie
    if (!tuyaCluster.attributes) return measurements;

    const dpIds = tuyaCluster.attributes.map(a => a.id);

    // DPs courants Tuya:
    // 0x01 = switch state
    // 0x06 = current (mA)
    // 0x09 = power (W)
    // 0x0A = voltage (V)
    // 0x11 = energy (kWh)

    if (dpIds.includes(0x0A) || dpIds.includes(10)) {
      measurements.voltage = true;
    }

    if (dpIds.includes(0x06) || dpIds.includes(6)) {
      measurements.current = true;
    }

    if (dpIds.includes(0x09) || dpIds.includes(9)) {
      measurements.power = true;
    }

    if (dpIds.includes(0x11) || dpIds.includes(17)) {
      measurements.energy = true;
    }

    return measurements;
  }

  /**
   * Génère les KPIs recommandés
   * @private
   */
  static _generateKPIs(capabilities) {
    const kpis = {
      primary: [],    // KPIs principaux à afficher
      secondary: [],  // KPIs secondaires
      units: {},      // Unités de mesure
      formats: {}     // Formats d'affichage
    };

    const { powerSource, measurements } = capabilities;

    // Battery-powered devices
    if (powerSource === 'battery') {
      if (measurements.battery) {
        kpis.primary.push('measure_battery');
        kpis.units['measure_battery'] = '%';
        kpis.formats['measure_battery'] = 'percentage';
      }
      if (measurements.batteryVoltage) {
        kpis.secondary.push('measure_voltage.battery');
        kpis.units['measure_voltage.battery'] = 'V';
        kpis.formats['measure_voltage.battery'] = 'voltage';
      }
    }

    // Mains-powered devices
    if (powerSource === 'mains' || measurements.voltage) {
      if (measurements.power) {
        kpis.primary.push('measure_power');
        kpis.units['measure_power'] = 'W';
        kpis.formats['measure_power'] = 'power';
      }

      if (measurements.voltage) {
        kpis.primary.push('measure_voltage');
        kpis.units['measure_voltage'] = 'V';
        kpis.formats['measure_voltage'] = 'voltage';
      }

      if (measurements.current) {
        kpis.secondary.push('measure_current');
        kpis.units['measure_current'] = 'A';
        kpis.formats['measure_current'] = 'current';
      }

      if (measurements.energy) {
        kpis.primary.push('meter_power');
        kpis.units['meter_power'] = 'kWh';
        kpis.formats['meter_power'] = 'energy';
      }
    }

    return kpis;
  }

  /**
   * Génère les capabilities Homey recommandées
   * @param {Object} capabilities - Résultat de detectEnergyCapabilities
   * @returns {Array} Liste des capabilities Homey
   */
  static generateHomeyCapabilities(capabilities) {
    const homeyCapabilities = [];

    if (!capabilities || !capabilities.measurements) {
      return homeyCapabilities;
    }

    const { powerSource, measurements } = capabilities;

    // Battery
    if (powerSource === 'battery' && measurements.battery) {
      homeyCapabilities.push('measure_battery');
    }

    // Battery voltage
    if (measurements.batteryVoltage) {
      homeyCapabilities.push('measure_voltage.battery');
    }

    // AC Measurements
    if (measurements.voltage && powerSource !== 'battery') {
      homeyCapabilities.push('measure_voltage');
    }

    if (measurements.current) {
      homeyCapabilities.push('measure_current');
    }

    if (measurements.power) {
      homeyCapabilities.push('measure_power');
    }

    if (measurements.energy) {
      homeyCapabilities.push('meter_power');
    }

    return homeyCapabilities;
  }

  /**
   * Génère un rapport détaillé des capacités
   * @param {Object} node - Le node Zigbee
   * @returns {String} Rapport formaté
   */
  static generateReport(node) {
    const capabilities = this.detectEnergyCapabilities(node);
    
    let report = '╔════════════════════════════════════════╗\n';
    report += '║   ENERGY CAPABILITY DETECTION REPORT   ║\n';
    report += '╚════════════════════════════════════════╝\n\n';

    // Power Source
    report += `🔌 Power Source: ${capabilities.powerSource || 'Unknown'}\n`;
    report += `⚡ Consumption Mode: ${capabilities.consumptionMode || 'None'}\n\n`;

    // Measurements
    report += '📊 Detected Measurements:\n';
    Object.keys(capabilities.measurements).forEach(key => {
      const enabled = capabilities.measurements[key];
      const icon = enabled ? '✅' : '❌';
      report += `   ${icon} ${key}\n`;
    });

    // Clusters
    if (capabilities.clusters.length > 0) {
      report += `\n🔧 Active Clusters: ${capabilities.clusters.join(', ')}\n`;
    }

    // KPIs
    report += '\n📈 Recommended KPIs:\n';
    if (capabilities.kpis.primary && capabilities.kpis.primary.length > 0) {
      report += '   Primary:\n';
      capabilities.kpis.primary.forEach(kpi => {
        const unit = capabilities.kpis.units[kpi] || '';
        report += `   - ${kpi} (${unit})\n`;
      });
    }
    if (capabilities.kpis.secondary && capabilities.kpis.secondary.length > 0) {
      report += '   Secondary:\n';
      capabilities.kpis.secondary.forEach(kpi => {
        const unit = capabilities.kpis.units[kpi] || '';
        report += `   - ${kpi} (${unit})\n`;
      });
    }

    // Homey Capabilities
    const homeyCapabilities = this.generateHomeyCapabilities(capabilities);
    if (homeyCapabilities.length > 0) {
      report += '\n🏠 Homey Capabilities:\n';
      homeyCapabilities.forEach(cap => {
        report += `   - ${cap}\n`;
      });
    }

    return report;
  }
}

module.exports = EnergyCapabilityDetector;
