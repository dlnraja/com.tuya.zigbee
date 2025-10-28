'use strict';

const TuyaSpecificDevice = require('../../lib/TuyaSpecificDevice');

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

class PIRSensor3in1 extends TuyaSpecificDevice {
  
  /**
   * onNodeInit est hérité de TuyaSpecificDevice
   * Détection automatique:
   * - Clusters Zigbee standards (si disponibles)
   * - DataPoints Tuya custom
   * - Energy/Battery capabilities
   * - Multi-endpoint (si applicable)
   */

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
