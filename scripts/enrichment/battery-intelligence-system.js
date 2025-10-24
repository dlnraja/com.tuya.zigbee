'use strict';

const fs = require('fs').promises;
const path = require('path');

/**
 * BATTERY INTELLIGENCE SYSTEM
 * 
 * Système intelligent qui apprend les caractéristiques de batterie par manufacturerName
 * - Détecte automatiquement si la valeur est 0-100 ou 0-200
 * - Utilise le voltage pour affiner la détection
 * - Courbes de décharge par technologie de batterie
 * - Persistance des données apprises
 */
class BatteryIntelligenceSystem {
  
  constructor() {
    this.databasePath = path.join(__dirname, '..', 'references', 'battery_intelligence_db.json');
    this.database = {
      manufacturers: {},
      statistics: {
        totalDevices: 0,
        learnedDevices: 0,
        accuracyRate: 0
      }
    };
    
    // Caractéristiques des technologies de batterie
    this.batteryTechnologies = {
      'CR2032': {
        nominalVoltage: 3.0,
        cutoffVoltage: 2.0,
        capacity: 225, // mAh
        dischargeCurve: [
          { percent: 100, voltage: 3.0 },
          { percent: 90, voltage: 2.9 },
          { percent: 75, voltage: 2.8 },
          { percent: 50, voltage: 2.7 },
          { percent: 25, voltage: 2.5 },
          { percent: 10, voltage: 2.3 },
          { percent: 0, voltage: 2.0 }
        ]
      },
      'CR2450': {
        nominalVoltage: 3.0,
        cutoffVoltage: 2.0,
        capacity: 620,
        dischargeCurve: [
          { percent: 100, voltage: 3.0 },
          { percent: 90, voltage: 2.95 },
          { percent: 75, voltage: 2.85 },
          { percent: 50, voltage: 2.75 },
          { percent: 25, voltage: 2.6 },
          { percent: 10, voltage: 2.4 },
          { percent: 0, voltage: 2.0 }
        ]
      },
      'AAA': {
        nominalVoltage: 1.5,
        cutoffVoltage: 0.8,
        capacity: 1200,
        dischargeCurve: [
          { percent: 100, voltage: 1.5 },
          { percent: 90, voltage: 1.4 },
          { percent: 75, voltage: 1.35 },
          { percent: 50, voltage: 1.25 },
          { percent: 25, voltage: 1.1 },
          { percent: 10, voltage: 0.95 },
          { percent: 0, voltage: 0.8 }
        ]
      },
      'AA': {
        nominalVoltage: 1.5,
        cutoffVoltage: 0.8,
        capacity: 2850,
        dischargeCurve: [
          { percent: 100, voltage: 1.5 },
          { percent: 90, voltage: 1.4 },
          { percent: 75, voltage: 1.35 },
          { percent: 50, voltage: 1.25 },
          { percent: 25, voltage: 1.1 },
          { percent: 10, voltage: 0.95 },
          { percent: 0, voltage: 0.8 }
        ]
      }
    };
  }

  /**
   * Charge la base de données
   */
  async load() {
    try {
      const data = await fs.readFile(this.databasePath, 'utf8');
      this.database = JSON.parse(data);
      console.log('✅ Battery Intelligence DB loaded:', Object.keys(this.database.manufacturers).length, 'manufacturers');
    } catch (err) {
      console.log('ℹ️  Creating new Battery Intelligence DB');
      await this.save();
    }
  }

  /**
   * Sauvegarde la base de données
   */
  async save() {
    try {
      const dir = path.dirname(this.databasePath);
      await fs.mkdir(dir, { recursive: true });
      await fs.writeFile(this.databasePath, JSON.stringify(this.database, null, 2));
      console.log('✅ Battery Intelligence DB saved');
    } catch (err) {
      console.error('❌ Failed to save Battery Intelligence DB:', err.message);
    }
  }

  /**
   * Calcule le pourcentage de batterie à partir du voltage
   */
  calculatePercentFromVoltage(voltage, batteryType) {
    const tech = this.batteryTechnologies[batteryType];
    if (!tech) return null;

    // Voltage hors limites
    if (voltage >= tech.nominalVoltage) return 100;
    if (voltage <= tech.cutoffVoltage) return 0;

    // Interpolation linéaire sur la courbe de décharge
    const curve = tech.dischargeCurve;
    for (let i = 0; i < curve.length - 1; i++) {
      const current = curve[i];
      const next = curve[i + 1];
      
      if (voltage >= next.voltage && voltage <= current.voltage) {
        const ratio = (voltage - next.voltage) / (current.voltage - next.voltage);
        return Math.round(next.percent + ratio * (current.percent - next.percent));
      }
    }

    return null;
  }

  /**
   * Analyse intelligente d'une valeur de batterie
   * Retourne: { percent, confidence, needsLearning, dataType }
   */
  analyzeValue(rawValue, manufacturerName, voltage = null, batteryType = null) {
    const value = parseInt(rawValue);
    
    // Vérifier si on a déjà appris ce manufacturer
    const learned = this.database.manufacturers[manufacturerName];
    
    if (learned && learned.confirmed) {
      // On a une configuration confirmée
      return this.applyLearnedBehavior(value, learned, voltage, batteryType);
    }

    // Mode apprentissage
    return this.learnBehavior(value, manufacturerName, voltage, batteryType);
  }

  /**
   * Applique le comportement appris
   */
  applyLearnedBehavior(value, learned, voltage, batteryType) {
    let percent;
    let confidence = 0.9; // Haute confiance car appris

    if (learned.dataType === '0-100') {
      percent = Math.max(0, Math.min(100, value));
    } else if (learned.dataType === '0-200') {
      percent = Math.max(0, Math.min(100, value / 2));
    } else if (learned.dataType === '0-255') {
      percent = Math.max(0, Math.min(100, Math.round(value / 2.55)));
    }

    // Affiner avec le voltage si disponible
    if (voltage && batteryType) {
      const voltagePercent = this.calculatePercentFromVoltage(voltage, batteryType);
      if (voltagePercent !== null) {
        // Moyenne pondérée (70% valeur brute, 30% voltage)
        percent = Math.round(percent * 0.7 + voltagePercent * 0.3);
        confidence = 0.95; // Très haute confiance
      }
    }

    return {
      percent,
      confidence,
      needsLearning: false,
      dataType: learned.dataType,
      source: 'learned'
    };
  }

  /**
   * Apprend le comportement d'un nouveau manufacturer
   */
  learnBehavior(value, manufacturerName, voltage, batteryType) {
    let dataType;
    let percent;
    let confidence = 0.5; // Confiance moyenne (on apprend)

    // Initialiser l'entrée si elle n'existe pas
    if (!this.database.manufacturers[manufacturerName]) {
      this.database.manufacturers[manufacturerName] = {
        dataType: null,
        confirmed: false,
        samples: [],
        voltageSupported: false,
        batteryType: batteryType || 'unknown',
        firstSeen: new Date().toISOString()
      };
    }

    const mfg = this.database.manufacturers[manufacturerName];

    // Détecter le type de données
    if (value <= 100) {
      dataType = '0-100';
      percent = value;
    } else if (value <= 200) {
      dataType = '0-200';
      percent = value / 2;
    } else if (value <= 255) {
      dataType = '0-255';
      percent = Math.round(value / 2.55);
    } else {
      dataType = 'unknown';
      percent = Math.min(100, value);
      confidence = 0.3; // Faible confiance
    }

    // Utiliser le voltage pour confirmation
    if (voltage && batteryType) {
      const voltagePercent = this.calculatePercentFromVoltage(voltage, batteryType);
      if (voltagePercent !== null) {
        // Vérifier la cohérence
        const difference = Math.abs(percent - voltagePercent);
        if (difference < 10) {
          // Cohérent! On confirme le dataType
          confidence = 0.85;
          mfg.confirmed = true;
          mfg.dataType = dataType;
        } else if (difference > 30) {
          // Incohérent, le voltage est plus fiable
          percent = voltagePercent;
          confidence = 0.75;
          // Peut-être que le dataType est différent
          if (dataType === '0-200') {
            dataType = '0-100';
            percent = value; // Ne pas diviser
          }
        }
        mfg.voltageSupported = true;
      }
    }

    // Sauvegarder l'échantillon
    mfg.samples.push({
      value,
      voltage,
      detectedType: dataType,
      timestamp: new Date().toISOString()
    });

    // Auto-confirmation après 5 échantillons cohérents
    if (mfg.samples.length >= 5 && !mfg.confirmed) {
      const types = mfg.samples.map(s => s.detectedType);
      const allSame = types.every(t => t === types[0]);
      if (allSame) {
        mfg.confirmed = true;
        mfg.dataType = types[0];
        confidence = 0.9;
        console.log(`✅ Auto-confirmed battery type for ${manufacturerName}: ${mfg.dataType}`);
      }
    }

    // Limiter à 10 échantillons max
    if (mfg.samples.length > 10) {
      mfg.samples = mfg.samples.slice(-10);
    }

    return {
      percent: Math.round(percent),
      confidence,
      needsLearning: !mfg.confirmed,
      dataType,
      source: 'learning'
    };
  }

  /**
   * Récupère la configuration pour un manufacturer
   */
  getManufacturerConfig(manufacturerName) {
    return this.database.manufacturers[manufacturerName] || null;
  }

  /**
   * Confirme manuellement un type de données
   */
  async confirmDataType(manufacturerName, dataType) {
    if (!this.database.manufacturers[manufacturerName]) {
      this.database.manufacturers[manufacturerName] = {
        dataType,
        confirmed: true,
        samples: [],
        manuallyConfirmed: true,
        confirmedAt: new Date().toISOString()
      };
    } else {
      this.database.manufacturers[manufacturerName].dataType = dataType;
      this.database.manufacturers[manufacturerName].confirmed = true;
      this.database.manufacturers[manufacturerName].manuallyConfirmed = true;
      this.database.manufacturers[manufacturerName].confirmedAt = new Date().toISOString();
    }
    await this.save();
    console.log(`✅ Manually confirmed ${manufacturerName} as ${dataType}`);
  }

  /**
   * Génère un rapport statistique
   */
  generateReport() {
    const manufacturers = Object.entries(this.database.manufacturers);
    const confirmed = manufacturers.filter(([_, m]) => m.confirmed);
    const withVoltage = manufacturers.filter(([_, m]) => m.voltageSupported);
    
    const typeDistribution = {};
    confirmed.forEach(([_, m]) => {
      typeDistribution[m.dataType] = (typeDistribution[m.dataType] || 0) + 1;
    });

    return {
      totalManufacturers: manufacturers.length,
      confirmedManufacturers: confirmed.length,
      learningManufacturers: manufacturers.length - confirmed.length,
      withVoltageSupport: withVoltage.length,
      typeDistribution,
      accuracyRate: manufacturers.length > 0 ? 
        Math.round((confirmed.length / manufacturers.length) * 100) : 0
    };
  }
}

// Instance singleton
let instance = null;

module.exports = {
  getInstance: async () => {
    if (!instance) {
      instance = new BatteryIntelligenceSystem();
      await instance.load();
    }
    return instance;
  },
  BatteryIntelligenceSystem
};
