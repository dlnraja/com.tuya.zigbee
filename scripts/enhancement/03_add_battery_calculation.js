#!/usr/bin/env node

/**
 * AJOUT HELPER BATTERIE ADAPTATIF
 * 
 * Crée un helper pour calculer le % batterie selon le type choisi
 */

const fs = require('fs');
const path = require('path');

const libDir = path.join(__dirname, '..', '..', 'lib');
const helperPath = path.join(libDir, 'BatteryCalculator.js');

console.log('\n🔋 CRÉATION BATTERY CALCULATOR\n');

const batteryCalculatorCode = `'use strict';

/**
 * BATTERY CALCULATOR - Calcul adaptatif par type
 * 
 * Calcule le pourcentage de batterie selon le type de batterie utilisé
 * Prend en compte les voltage ranges spécifiques à chaque type
 */

class BatteryCalculator {
  /**
   * Voltage ranges par type de batterie
   * 
   * Format: {
   *   min: voltage minimum (0% batterie)
   *   max: voltage maximum (100% batterie)
   * }
   */
  static VOLTAGE_RANGES = {
    'CR2032': {
      min: 2.0,  // En dessous = batterie morte
      max: 3.0,  // Voltage nominal neuf
      nominal: 3.0
    },
    'CR2450': {
      min: 2.0,
      max: 3.0,
      nominal: 3.0
    },
    'CR123A': {
      min: 2.0,
      max: 3.0,
      nominal: 3.0
    },
    'AAA': {
      min: 2.0,  // 2x AAA en série (1.0V × 2)
      max: 3.0,  // 2x AAA neuves (1.5V × 2)
      nominal: 3.0
    },
    'AA': {
      min: 2.0,  // 2x AA en série
      max: 3.0,  // 2x AA neuves
      nominal: 3.0
    },
    'INTERNAL': {
      min: 3.0,  // Rechargeable Li-ion typical
      max: 4.2,
      nominal: 3.7
    },
    'OTHER': {
      min: 2.0,
      max: 3.0,
      nominal: 3.0
    }
  };
  
  /**
   * Calcule le pourcentage de batterie
   * 
   * @param {number} voltage - Voltage mesuré (en V)
   * @param {string} batteryType - Type de batterie (CR2032, AAA, etc.)
   * @returns {number} Pourcentage 0-100
   */
  static calculatePercentage(voltage, batteryType = 'CR2032') {
    const range = this.VOLTAGE_RANGES[batteryType] || this.VOLTAGE_RANGES['CR2032'];
    
    if (voltage >= range.max) return 100;
    if (voltage <= range.min) return 0;
    
    // Calcul linéaire
    const percentage = ((voltage - range.min) / (range.max - range.min)) * 100;
    
    // Arrondir et limiter 0-100
    return Math.max(0, Math.min(100, Math.round(percentage)));
  }
  
  /**
   * Calcule avec courbe de décharge (plus précis)
   * 
   * Les batteries ne se déchargent pas linéairement
   * Utilise une courbe de décharge typique
   */
  static calculatePercentageWithCurve(voltage, batteryType = 'CR2032') {
    const range = this.VOLTAGE_RANGES[batteryType] || this.VOLTAGE_RANGES['CR2032'];
    
    if (voltage >= range.max) return 100;
    if (voltage <= range.min) return 0;
    
    // Normaliser voltage (0-1)
    const normalized = (voltage - range.min) / (range.max - range.min);
    
    // Courbe de décharge typique (exponentielle)
    // Les batteries button cells gardent ~90% voltage jusqu'à 50% capacité
    let percentage;
    
    if (batteryType.startsWith('CR')) {
      // Button cells: plateau puis chute rapide
      if (normalized > 0.8) {
        percentage = 50 + (normalized - 0.8) * 250; // 80-100% voltage = 50-100% capacité
      } else {
        percentage = normalized * 62.5; // 0-80% voltage = 0-50% capacité
      }
    } else if (batteryType === 'AAA' || batteryType === 'AA') {
      // Alkaline: déclin plus linéaire
      percentage = Math.pow(normalized, 0.8) * 100;
    } else if (batteryType === 'INTERNAL') {
      // Li-ion: très linéaire
      percentage = normalized * 100;
    } else {
      // Default: linéaire
      percentage = normalized * 100;
    }
    
    return Math.max(0, Math.min(100, Math.round(percentage)));
  }
  
  /**
   * Détecte si batterie est faible
   * 
   * @param {number} voltage - Voltage mesuré
   * @param {string} batteryType - Type de batterie
   * @param {number} threshold - Seuil en % (défaut 20%)
   * @returns {boolean} True si batterie faible
   */
  static isLow(voltage, batteryType = 'CR2032', threshold = 20) {
    const percentage = this.calculatePercentageWithCurve(voltage, batteryType);
    return percentage <= threshold;
  }
  
  /**
   * Get voltage range pour un type
   * 
   * @param {string} batteryType - Type de batterie
   * @returns {object} {min, max, nominal}
   */
  static getRange(batteryType) {
    return this.VOLTAGE_RANGES[batteryType] || this.VOLTAGE_RANGES['CR2032'];
  }
}

module.exports = BatteryCalculator;
`;

// Créer lib/ si n'existe pas
if (!fs.existsSync(libDir)) {
  fs.mkdirSync(libDir, { recursive: true });
}

// Écrire le helper
fs.writeFileSync(helperPath, batteryCalculatorCode);

console.log(`✅ BatteryCalculator créé: ${helperPath}`);

// Créer exemple d'utilisation dans device.js
const exampleUsage = `
/**
 * EXEMPLE UTILISATION DANS DEVICE.JS
 */

const BatteryCalculator = require('../../lib/BatteryCalculator');

class MultiBatteryDevice extends ZigBeeDevice {
  
  async onNodeInit() {
    // ... autres inits
    
    // Register battery capability
    this.registerCapability('measure_battery', CLUSTER.POWER_CONFIGURATION, {
      reportParser: value => {
        const voltage = value / 10; // millivolts to volts
        
        // Get user's battery type choice from settings
        const batteryType = this.getSetting('battery_type') || 'CR2032';
        
        // Calculate percentage with adaptive calculation
        const percentage = BatteryCalculator.calculatePercentageWithCurve(
          voltage,
          batteryType
        );
        
        this.log(\`Battery: \${voltage}V (\${batteryType}) = \${percentage}%\`);
        
        return percentage;
      }
    });
    
    // Listen for battery type changes
    this.registerSetting('battery_type', async (newValue, oldValue) => {
      this.log(\`Battery type changed: \${oldValue} → \${newValue}\`);
      
      // Re-read battery to recalculate with new type
      try {
        const { batteryVoltage } = await this.zclNode.endpoints[1].clusters.powerConfiguration.readAttributes(['batteryVoltage']);
        const voltage = batteryVoltage / 10;
        const percentage = BatteryCalculator.calculatePercentageWithCurve(voltage, newValue);
        
        await this.setCapabilityValue('measure_battery', percentage);
      } catch (err) {
        this.error('Failed to recalculate battery:', err);
      }
    });
  }
}

module.exports = MultiBatteryDevice;
`;

const examplePath = path.join(libDir, 'BatteryCalculator.example.js');
fs.writeFileSync(examplePath, exampleUsage);

console.log(`✅ Exemple d'utilisation créé: ${examplePath}`);

console.log(`\n📚 DOCUMENTATION:`);
console.log(`\n   Voltage Ranges:`);
console.log(`   - CR2032:  2.0V - 3.0V (button cell)`);
console.log(`   - CR2450:  2.0V - 3.0V (button cell large)`);
console.log(`   - AAA:     2.0V - 3.0V (2× 1.5V in series)`);
console.log(`   - AA:      2.0V - 3.0V (2× 1.5V in series)`);
console.log(`   - INTERNAL: 3.0V - 4.2V (Li-ion rechargeable)`);

console.log(`\n   Méthodes:`);
console.log(`   - calculatePercentage(voltage, type)         → Linéaire`);
console.log(`   - calculatePercentageWithCurve(voltage, type) → Courbe réaliste`);
console.log(`   - isLow(voltage, type, threshold)            → Boolean`);
console.log(`   - getRange(type)                             → {min, max, nominal}`);

console.log(`\n✅ Terminé\n`);
