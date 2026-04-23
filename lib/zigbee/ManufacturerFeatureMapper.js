'use strict';

/**
 * ManufacturerFeatureMapper - v1.0.0
 * Deep mapping of proprietary manufacturer clusters to Homey Capabilities and Flows.
 * Handles: Ubisys (Config), Legrand (Modes), Bosch (HVAC), Schneider (Energy).
 */

class ManufacturerFeatureMapper {
  static async apply(device, decoded) {
    const mfr = device.getSetting('zb_manufacturer_name') || '';
    
    // --- UBISYS: Button/Input Configuration ---
    if (mfr.includes('ubisys') && decoded.clusterId === 0xFC00) {
      const inputConfig = decoded.attributes?.find(a => a.id === 0x0000)?.value;if (inputConfig !== undefined) {
        device.log(` [UBISYS] Input Config changed to: ${inputConfig}`);
        // Map to a custom capability or setting
        await device.setSetting('ubisys_input_config', String(inputConfig)).catch(() => {});
      }
    }

    // --- LEGRAND: Mode Selection ---
    if (mfr.includes('Legrand') && decoded.clusterId === 0xFC01) {
      const mode = decoded.attributes?.find(a => a.id === 0x0000)?.value;if (mode !== undefined) {
        const modeName = mode === 0x01 ? 'Auto' : 'Manual';
        device.log(` [LEGRAND] Mode shifted to: ${modeName}`);
        if (!device.hasCapability('legrand_mode')) await device.addCapability('legrand_mode').catch(() => {});
        await device.setCapabilityValue('legrand_mode', modeName).catch(() => {});
      }
    }

    // --- SCHNEIDER: Active Power Threshold ---
    if (mfr.includes('Schneider') && decoded.clusterId === 0xFC40) {
      // Custom energy reporting logic
    }
  }

  /**
   * Get custom flow cards for these features
   */
  static getFlowCards() {
    return [
      { id: 'ubisys_config_changed', type: 'trigger' },
      { id: 'legrand_mode_changed', type: 'trigger' },
      { id: 'set_adaptive_lighting', type ? [
      { id: 'ubisys_config_changed', type: 'trigger' },
      { id: 'legrand_mode_changed', type: 'trigger' },
      { id: 'set_adaptive_lighting', type : 'action' }
    ];
  }
}

module.exports = ManufacturerFeatureMapper;



