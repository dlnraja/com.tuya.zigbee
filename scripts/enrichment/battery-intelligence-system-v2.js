'use strict';

/**
 * BATTERY INTELLIGENCE SYSTEM V2 - HOMEY PERSISTENT STORAGE
 * 
 * Système ultra-intelligent qui:
 * - Utilise l'API Homey Persistent Storage (pas de fichiers)
 * - Apprend les caractéristiques par manufacturerName
 * - Détecte automatiquement 0-100, 0-200, 0-255
 * - Utilise voltage + ampérage pour validation
 * - Courbes de décharge par technologie
 * - Fallback intelligent multi-niveau
 * - Cascades d'erreurs gracieuses
 * 
 * Documentation: https://apps-sdk-v3.developer.homey.app/tutorial-Device.html#persistent-storage
 */

class BatteryIntelligenceSystemV2 {
  
  constructor(homeyDevice) {
    this.device = homeyDevice;
    this.storageKey = 'battery_intelligence_data';
    
    // Base de données en mémoire (chargée depuis Homey Storage)
    this.database = {
      manufacturers: {},
      statistics: {
        totalDevices: 0,
        learnedDevices: 0,
        accuracyRate: 0
      },
      version: '2.0.0'
    };
    
    // Caractéristiques des technologies de batterie
    // Sources: Datasheet constructeurs + courbes réelles
    this.batteryTechnologies = {
      'CR2032': {
        nominalVoltage: 3.0,
        cutoffVoltage: 2.0,
        capacity: 225, // mAh
        chemistry: 'Lithium',
        dischargeCurve: [
          { percent: 100, voltage: 3.0, resistance: 10 },
          { percent: 90, voltage: 2.95, resistance: 12 },
          { percent: 80, voltage: 2.9, resistance: 15 },
          { percent: 70, voltage: 2.85, resistance: 18 },
          { percent: 60, voltage: 2.8, resistance: 22 },
          { percent: 50, voltage: 2.7, resistance: 28 },
          { percent: 40, voltage: 2.6, resistance: 35 },
          { percent: 30, voltage: 2.5, resistance: 45 },
          { percent: 20, voltage: 2.4, resistance: 60 },
          { percent: 10, voltage: 2.3, resistance: 80 },
          { percent: 5, voltage: 2.15, resistance: 120 },
          { percent: 0, voltage: 2.0, resistance: 200 }
        ]
      },
      'CR2450': {
        nominalVoltage: 3.0,
        cutoffVoltage: 2.0,
        capacity: 620,
        chemistry: 'Lithium',
        dischargeCurve: [
          { percent: 100, voltage: 3.0, resistance: 8 },
          { percent: 90, voltage: 2.95, resistance: 10 },
          { percent: 80, voltage: 2.92, resistance: 12 },
          { percent: 70, voltage: 2.88, resistance: 15 },
          { percent: 60, voltage: 2.85, resistance: 18 },
          { percent: 50, voltage: 2.8, resistance: 22 },
          { percent: 40, voltage: 2.75, resistance: 28 },
          { percent: 30, voltage: 2.65, resistance: 35 },
          { percent: 20, voltage: 2.5, resistance: 45 },
          { percent: 10, voltage: 2.35, resistance: 60 },
          { percent: 5, voltage: 2.2, resistance: 90 },
          { percent: 0, voltage: 2.0, resistance: 150 }
        ]
      },
      'CR2477': {
        nominalVoltage: 3.0,
        cutoffVoltage: 2.0,
        capacity: 1000,
        chemistry: 'Lithium',
        dischargeCurve: [
          { percent: 100, voltage: 3.0 },
          { percent: 90, voltage: 2.96 },
          { percent: 75, voltage: 2.9 },
          { percent: 50, voltage: 2.8 },
          { percent: 25, voltage: 2.6 },
          { percent: 10, voltage: 2.4 },
          { percent: 0, voltage: 2.0 }
        ]
      },
      'AAA': {
        nominalVoltage: 1.5,
        cutoffVoltage: 0.8,
        capacity: 1200,
        chemistry: 'Alkaline',
        dischargeCurve: [
          { percent: 100, voltage: 1.5 },
          { percent: 90, voltage: 1.45 },
          { percent: 80, voltage: 1.4 },
          { percent: 70, voltage: 1.35 },
          { percent: 60, voltage: 1.3 },
          { percent: 50, voltage: 1.25 },
          { percent: 40, voltage: 1.2 },
          { percent: 30, voltage: 1.15 },
          { percent: 20, voltage: 1.1 },
          { percent: 10, voltage: 0.95 },
          { percent: 0, voltage: 0.8 }
        ]
      },
      'AA': {
        nominalVoltage: 1.5,
        cutoffVoltage: 0.8,
        capacity: 2850,
        chemistry: 'Alkaline',
        dischargeCurve: [
          { percent: 100, voltage: 1.5 },
          { percent: 90, voltage: 1.45 },
          { percent: 80, voltage: 1.4 },
          { percent: 70, voltage: 1.35 },
          { percent: 60, voltage: 1.3 },
          { percent: 50, voltage: 1.25 },
          { percent: 40, voltage: 1.2 },
          { percent: 30, voltage: 1.15 },
          { percent: 20, voltage: 1.1 },
          { percent: 10, voltage: 0.95 },
          { percent: 0, voltage: 0.8 }
        ]
      }
    };
  }

  /**
   * Charge la base de données depuis Homey Persistent Storage
   */
  async load() {
    try {
      const stored = await this.device.getStoreValue(this.storageKey);
      if (stored) {
        this.database = stored;
        this.device.log('✅ Battery Intelligence loaded from Homey Storage:', 
          Object.keys(this.database.manufacturers).length, 'manufacturers');
      } else {
        this.device.log('ℹ️  Creating new Battery Intelligence database');
        await this.save();
      }
    } catch (err) {
      this.device.error('⚠️  Failed to load Battery Intelligence:', err.message);
      // Continue avec database vide
    }
  }

  /**
   * Sauvegarde la base de données dans Homey Persistent Storage
   */
  async save() {
    try {
      await this.device.setStoreValue(this.storageKey, this.database);
      this.device.log('✅ Battery Intelligence saved to Homey Storage');
    } catch (err) {
      this.device.error('❌ Failed to save Battery Intelligence:', err.message);
    }
  }

  /**
   * Calcule le pourcentage de batterie à partir du voltage
   * Utilise les courbes de décharge réelles des constructeurs
   */
  calculatePercentFromVoltage(voltage, batteryType) {
    const tech = this.batteryTechnologies[batteryType];
    if (!tech) {
      this.device.log('⚠️  Unknown battery type:', batteryType);
      return null;
    }

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
        const percent = next.percent + ratio * (current.percent - next.percent);
        this.device.log(`🔋 Voltage ${voltage}V → ${Math.round(percent)}% (${batteryType} curve)`);
        return Math.round(percent);
      }
    }

    return null;
  }

  /**
   * Calcule le pourcentage à partir du voltage et de l'ampérage (résistance interne)
   * La résistance interne augmente quand la batterie se décharge
   */
  calculatePercentFromVoltageAndCurrent(voltage, current, batteryType) {
    const tech = this.batteryTechnologies[batteryType];
    if (!tech || !tech.dischargeCurve[0].resistance) {
      return this.calculatePercentFromVoltage(voltage, batteryType);
    }

    // Calculer la résistance interne approximative
    // R = ΔV / I (loi d'Ohm)
    const nominalVoltage = tech.nominalVoltage;
    const voltageDrop = nominalVoltage - voltage;
    const resistance = current > 0 ? (voltageDrop / current) * 1000 : null; // en Ohms

    if (!resistance) {
      return this.calculatePercentFromVoltage(voltage, batteryType);
    }

    // Trouver le point sur la courbe le plus proche de cette résistance
    let bestMatch = null;
    let minDiff = Infinity;

    for (const point of tech.dischargeCurve) {
      if (point.resistance) {
        const diff = Math.abs(point.resistance - resistance);
        if (diff < minDiff) {
          minDiff = diff;
          bestMatch = point;
        }
      }
    }

    if (bestMatch) {
      this.device.log(`🔋 Advanced: V=${voltage}V, I=${current}A, R=${resistance.toFixed(1)}Ω → ${bestMatch.percent}%`);
      return bestMatch.percent;
    }

    return this.calculatePercentFromVoltage(voltage, batteryType);
  }

  /**
   * ANALYSE INTELLIGENTE MULTI-NIVEAU
   * 
   * Cascade de fallback:
   * 1. Learned behavior (si manufacturer connu et confirmé)
   * 2. Voltage + Current (si disponibles)
   * 3. Voltage seul (si disponible)
   * 4. Détection intelligente du format (0-100, 0-200, 0-255)
   * 5. Fallback conservateur
   */
  async analyzeValue(rawValue, manufacturerName, voltage = null, current = null, batteryType = null) {
    const value = parseFloat(rawValue);
    
    this.device.log(`🔋 Analyzing: value=${value}, mfg=${manufacturerName}, V=${voltage}, I=${current}, type=${batteryType}`);
    
    // ========== NIVEAU 1: LEARNED BEHAVIOR (HIGHEST PRIORITY) ==========
    const learned = this.database.manufacturers[manufacturerName];
    if (learned && learned.confirmed) {
      this.device.log('✅ Using learned behavior for', manufacturerName);
      return this.applyLearnedBehavior(value, learned, voltage, current, batteryType);
    }

    // ========== NIVEAU 2: VOLTAGE + CURRENT (VERY HIGH ACCURACY) ==========
    if (voltage && current && batteryType) {
      const percent = this.calculatePercentFromVoltageAndCurrent(voltage, current, batteryType);
      if (percent !== null) {
        this.device.log('✅ Using voltage + current calculation');
        // Apprendre le type de données en même temps
        await this.learnFromPhysicalMeasurement(value, percent, manufacturerName, voltage, current, batteryType);
        return {
          percent,
          confidence: 0.95, // Très haute confiance
          method: 'voltage_and_current',
          source: 'physical_measurement',
          needsLearning: false
        };
      }
    }

    // ========== NIVEAU 3: VOLTAGE SEUL (HIGH ACCURACY) ==========
    if (voltage && batteryType) {
      const percent = this.calculatePercentFromVoltage(voltage, batteryType);
      if (percent !== null) {
        this.device.log('✅ Using voltage calculation');
        await this.learnFromPhysicalMeasurement(value, percent, manufacturerName, voltage, null, batteryType);
        return {
          percent,
          confidence: 0.85, // Haute confiance
          method: 'voltage_only',
          source: 'physical_measurement',
          needsLearning: false
        };
      }
    }

    // ========== NIVEAU 4: LEARNING MODE (DETECTION INTELLIGENTE) ==========
    this.device.log('ℹ️  Learning mode for', manufacturerName);
    return await this.learnBehavior(value, manufacturerName, voltage, current, batteryType);
  }

  /**
   * Applique le comportement appris (manufacturer confirmé)
   */
  applyLearnedBehavior(value, learned, voltage, current, batteryType) {
    let percent;
    let confidence = 0.90; // Haute confiance

    // Appliquer la transformation connue
    switch (learned.dataType) {
      case '0-100':
        percent = Math.max(0, Math.min(100, value));
        break;
      case '0-200':
        percent = Math.max(0, Math.min(100, value / 2));
        break;
      case '0-255':
        percent = Math.max(0, Math.min(100, Math.round(value / 2.55)));
        break;
      default:
        percent = Math.max(0, Math.min(100, value));
        confidence = 0.60;
    }

    // Affiner avec mesures physiques si disponibles
    if (voltage && current && batteryType) {
      const physicalPercent = this.calculatePercentFromVoltageAndCurrent(voltage, current, batteryType);
      if (physicalPercent !== null) {
        // Moyenne pondérée (60% learned, 40% physical)
        percent = Math.round(percent * 0.6 + physicalPercent * 0.4);
        confidence = 0.95;
      }
    } else if (voltage && batteryType) {
      const voltagePercent = this.calculatePercentFromVoltage(voltage, batteryType);
      if (voltagePercent !== null) {
        // Moyenne pondérée (70% learned, 30% voltage)
        percent = Math.round(percent * 0.7 + voltagePercent * 0.3);
        confidence = 0.92;
      }
    }

    return {
      percent: Math.round(percent),
      confidence,
      method: 'learned',
      dataType: learned.dataType,
      source: 'database',
      needsLearning: false
    };
  }

  /**
   * Apprend à partir de mesures physiques (voltage/current)
   */
  async learnFromPhysicalMeasurement(rawValue, measuredPercent, manufacturerName, voltage, current, batteryType) {
    // Détecter le type de données en comparant rawValue et measuredPercent
    let dataType;
    const ratio = rawValue / measuredPercent;

    if (Math.abs(ratio - 1) < 0.15) {
      dataType = '0-100'; // rawValue ≈ measuredPercent
    } else if (Math.abs(ratio - 2) < 0.3) {
      dataType = '0-200'; // rawValue ≈ measuredPercent * 2
    } else if (Math.abs(ratio - 2.55) < 0.4) {
      dataType = '0-255'; // rawValue ≈ measuredPercent * 2.55
    } else {
      dataType = 'unknown';
    }

    // Initialiser ou mettre à jour l'entrée manufacturer
    if (!this.database.manufacturers[manufacturerName]) {
      this.database.manufacturers[manufacturerName] = {
        dataType,
        confirmed: false,
        samples: [],
        voltageSupported: !!voltage,
        currentSupported: !!current,
        batteryType: batteryType || 'unknown',
        firstSeen: new Date().toISOString(),
        lastUpdated: new Date().toISOString()
      };
    }

    const mfg = this.database.manufacturers[manufacturerName];
    
    // Ajouter l'échantillon
    mfg.samples.push({
      rawValue,
      measuredPercent,
      voltage,
      current,
      detectedType: dataType,
      ratio,
      timestamp: new Date().toISOString()
    });

    // Auto-confirmation après 3 mesures physiques cohérentes
    if (mfg.samples.length >= 3 && !mfg.confirmed) {
      const types = mfg.samples.map(s => s.detectedType);
      const allSame = types.every(t => t === types[0] && t !== 'unknown');
      
      if (allSame) {
        mfg.confirmed = true;
        mfg.dataType = types[0];
        mfg.confirmedBy = 'physical_measurement';
        mfg.confirmedAt = new Date().toISOString();
        this.device.log(`✅ Auto-confirmed ${manufacturerName} as ${mfg.dataType} via physical measurements`);
        await this.save();
      }
    }

    // Limiter à 20 échantillons
    if (mfg.samples.length > 20) {
      mfg.samples = mfg.samples.slice(-20);
    }

    mfg.lastUpdated = new Date().toISOString();
  }

  /**
   * Apprend le comportement (mode détection)
   */
  async learnBehavior(value, manufacturerName, voltage, current, batteryType) {
    let dataType;
    let percent;
    let confidence = 0.50; // Confiance moyenne

    // Initialiser l'entrée si nécessaire
    if (!this.database.manufacturers[manufacturerName]) {
      this.database.manufacturers[manufacturerName] = {
        dataType: null,
        confirmed: false,
        samples: [],
        voltageSupported: !!voltage,
        currentSupported: !!current,
        batteryType: batteryType || 'unknown',
        firstSeen: new Date().toISOString(),
        lastUpdated: new Date().toISOString()
      };
    }

    const mfg = this.database.manufacturers[manufacturerName];

    // ========== DETECTION INTELLIGENTE DU FORMAT ==========
    if (value <= 100) {
      dataType = '0-100';
      percent = value;
      confidence = 0.70;
    } else if (value <= 200) {
      // Pourrait être 0-200 OU 0-255
      // On essaie les deux et on voit lequel est cohérent avec voltage
      const as200 = value / 2;
      const as255 = value / 2.55;
      
      if (voltage && batteryType) {
        const voltagePercent = this.calculatePercentFromVoltage(voltage, batteryType);
        if (voltagePercent !== null) {
          const diff200 = Math.abs(as200 - voltagePercent);
          const diff255 = Math.abs(as255 - voltagePercent);
          
          if (diff200 < diff255) {
            dataType = '0-200';
            percent = as200;
            confidence = 0.80;
          } else {
            dataType = '0-255';
            percent = as255;
            confidence = 0.80;
          }
        } else {
          // Pas de voltage, on assume 0-200 (plus commun)
          dataType = '0-200';
          percent = as200;
          confidence = 0.55;
        }
      } else {
        // Pas de voltage, on assume 0-200
        dataType = '0-200';
        percent = as200;
        confidence = 0.55;
      }
    } else if (value <= 255) {
      dataType = '0-255';
      percent = value / 2.55;
      confidence = 0.65;
    } else {
      // Valeur anormale
      dataType = 'unknown';
      percent = Math.min(100, value);
      confidence = 0.30;
      this.device.error(`⚠️  Unusual battery value: ${value} for ${manufacturerName}`);
    }

    // Sauvegarder l'échantillon
    mfg.samples.push({
      value,
      voltage,
      current,
      detectedType: dataType,
      calculatedPercent: percent,
      timestamp: new Date().toISOString()
    });

    // Auto-confirmation après 5 échantillons cohérents (sans voltage)
    if (mfg.samples.length >= 5 && !mfg.confirmed && !mfg.voltageSupported) {
      const types = mfg.samples.map(s => s.detectedType);
      const allSame = types.every(t => t === types[0] && t !== 'unknown');
      
      if (allSame) {
        mfg.confirmed = true;
        mfg.dataType = types[0];
        mfg.confirmedBy = 'statistical_analysis';
        mfg.confirmedAt = new Date().toISOString();
        confidence = 0.85;
        this.device.log(`✅ Auto-confirmed ${manufacturerName} as ${mfg.dataType} (statistical)`);
        await this.save();
      }
    }

    // Limiter à 20 échantillons
    if (mfg.samples.length > 20) {
      mfg.samples = mfg.samples.slice(-20);
    }

    mfg.lastUpdated = new Date().toISOString();

    return {
      percent: Math.round(percent),
      confidence,
      method: 'learning',
      dataType,
      source: 'detection',
      needsLearning: !mfg.confirmed
    };
  }

  /**
   * Génère un rapport statistique
   */
  generateReport() {
    const manufacturers = Object.entries(this.database.manufacturers);
    const confirmed = manufacturers.filter(([_, m]) => m.confirmed);
    const withVoltage = manufacturers.filter(([_, m]) => m.voltageSupported);
    const withCurrent = manufacturers.filter(([_, m]) => m.currentSupported);
    
    const typeDistribution = {};
    confirmed.forEach(([_, m]) => {
      typeDistribution[m.dataType] = (typeDistribution[m.dataType] || 0) + 1;
    });

    return {
      totalManufacturers: manufacturers.length,
      confirmedManufacturers: confirmed.length,
      learningManufacturers: manufacturers.length - confirmed.length,
      withVoltageSupport: withVoltage.length,
      withCurrentSupport: withCurrent.length,
      typeDistribution,
      accuracyRate: manufacturers.length > 0 ? 
        Math.round((confirmed.length / manufacturers.length) * 100) : 0,
      database: this.database
    };
  }
}

module.exports = BatteryIntelligenceSystemV2;
