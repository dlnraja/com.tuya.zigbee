'use strict';

const Homey = require('homey');
const IRCodeLibrary = require('../../lib/ir/IRCodeLibrary');

/**
 * Virtual IR Remote Device
 * v5.13.0: Premium virtual remote that links to a physical IR Blaster.
 */
class IrRemoteDevice extends Homey.Device {

  onInit() {
    this.log('Virtual IR Remote initialized');

    // Register capability listeners
    this.registerCapabilityListener('onoff', this.onCapabilityOnOff.bind(this));

    // v9.0.411 (P92.119): IR test button — resend the Power command through
    // the associated blaster as a connectivity test.
    if (this.hasCapability('button.ir_test')) {
      this.registerCapabilityListener('button.ir_test', async () => {
        this.log('[IR] button.ir_test → sending Power as connectivity test');
        try {
          await this._sendRemoteCommand(this.getSetting('ir_brand'), this.getSetting('ir_category'), 'Power');
        } catch (e) {
          this.log(`[IR] ir_test failed: ${e.message}`);
        }
        return true;
      });
    }

    // v9.0.416 (P92.124): onoff.ir_learn — puts the ASSOCIATED blaster in
    // learn mode straight from the virtual remote (was a dead capability).
    if (this.hasCapability('onoff.ir_learn')) {
      this.registerCapabilityListener('onoff.ir_learn', async (value) => {
        try {
          const blasterId = this.getSetting('blaster_id');
          const blaster = this.homey.drivers.getDriver('ir_blaster').getDevices()
            .find((d) => d.getData().id === blasterId);
          if (!blaster) { throw new Error('Associated IR Blaster not found'); }
          if (value) {
            this.log('[IR] ir_learn ON → blaster learn mode (30s)');
            await blaster._enableAdvancedLearnMode(30);
          } else if (typeof blaster._disableLearnMode === 'function') {
            this.log('[IR] ir_learn OFF → blaster learn mode disabled');
            await blaster._disableLearnMode();
          }
        } catch (e) {
          this.log(`[IR] ir_learn failed: ${e.message}`);
        }
        return true;
      });
    }

    // Volume / Channel / Temp logic based on class
    this._initializeExtraCapabilities();
  }

  onCapabilityOnOff(value) {
    const brand = this.getSetting('ir_brand');
    const category = this.getSetting('ir_category');
    const command = value ? 'Power' : 'Power'; // Many remotes use same toggle
    
    this.log(`Virtual Remote Command: ${brand} ${category} ${command}`);
    return this._sendRemoteCommand(brand, category, command);
  }

  /**
   * Send command via associated blaster
   */
  _sendRemoteCommand(brand, category, command) {
    const blasterId = this.getSetting('blaster_id');
    const blaster = this.homey.drivers.getDriver('ir_blaster').getDevices().find(d => d.getData().id === blasterId);
    
    if (!blaster) {
      throw new Error('Associated IR Blaster not found. Please repair the remote.');
    }

    const irData = IRCodeLibrary.getCode(brand, category, command);
    if (irData && irData.code) {
      return blaster.sendIRCode(irData.code);
    }

    // Try learned codes
    const learnedCodes = blaster.getStoreValue('learned_codes') || {};
    const key = `${brand}_${category}_${command}`;
    if (learnedCodes[key]) {
      return blaster.sendIRCode(learnedCodes[key]);
    }

    throw new Error(`Command "${command}" not found for ${brand} ${category}`);
  }

  _initializeExtraCapabilities() {
    // Dynamic capability management based on category (v5.13+)
    const category = this.getSetting('ir_category');
    
    if (category === 'TV') {
      // Logic for volume_up/down flow cards
    } else if (category === 'AC') {
      // Logic for target_temperature
    }
  }

}

module.exports = IrRemoteDevice;
