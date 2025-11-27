'use strict';

// MIGRATED TO HYBRID SYSTEM v2.0
const HybridDriverSystem = require('../../lib/HybridDriverSystem');
const BatteryManagerV2 = require('../../lib/battery/BatteryManagerV2');

/**
 * pir_sensor_3in1 - Hybrid-Enhanced Driver
 *
 * MIGRATION: Original driver enhanced with Hybrid System
 * - Auto-adaptive capabilities
 * - Energy-aware management
 * - Smart detection
 */

// Create hybrid base
const HybridDevice = HybridDriverSystem.createHybridDevice();

'use strict';

const TuyaSpecificDevice = require('../../lib/tuya/TuyaSpecificDevice');

/**
 * PIR 3-IN-1 SENSOR
 * 
 * Device hybride avec:
 * - Motion detection (PIR)
 * - Temperature sensor
 * - Humidity sensor  
 * - Illuminance sensor (certains modèles)
 * - Battery powered
 * 
 * Utilise cluster Tuya custom (0xEF00) avec DataPoints
 * 
 * Manufacturers:
 * - HOBEIAN (ZG-204ZV)
 * - _TZE200_* variants
 * 
 * TOUT EST AUTO-DÉTECTÉ par TuyaSpecificDevice!
 */

class PIRSensor3in1 extends HybridDevice {
  
  /**
   * onNodeInit est hérité de TuyaSpecificDevice
   * Détection automatique:
   * - Clusters Zigbee standards (si disponibles)
   * - DataPoints Tuya custom
   * - Energy/Battery capabilities
   * - Multi-endpoint (si applicable)
   */
  
  /**
   * DP Mapping pour PIR 3-in-1 sensors
   * INSPIRÉ DE: Johan Bendz + Homey community research
   */
  get dpMapping() {
    return {
      alarm_motion: { 
        dp: 1, 
        parser: v => v === true || v === 'active' || v === 1 
      },
      measure_temperature: { 
        dp: 2, 
        parser: v => v / 10 // Tuya sends temp * 10
      },
      measure_humidity: { 
        dp: 3 // Already in %
      },
      measure_luminance: { 
        dp: 4 // Lux value
      },
      measure_battery: { 
        dp: 15 // Battery %
      }
    };
  }

  /**
   * onSettings pour configuration device
   */
  async onSettings({ newSettings, changedKeys }) {
    this.log('Settings changed:', changedKeys);

    // Si PIR sensitivity changée
    if (changedKeys.includes('pir_sensitivity')) {
      const sensitivity = newSettings.pir_sensitivity;
      this.log('Setting PIR sensitivity to:', sensitivity);
      
      try {
        // DP 2 = PIR Sensitivity (pour la plupart des modèles)
        await this.sendDataPoint(2, 0x02, sensitivity);
        this.log('✓ PIR sensitivity updated');
      } catch (err) {
        this.error('Failed to set PIR sensitivity:', err);
        throw new Error(this.homey.__('errors.setting_failed'));
      }
    }

    return true;
  }
}

module.exports = PIRSensor3in1;


module.exports = PIRSensor3in1;
