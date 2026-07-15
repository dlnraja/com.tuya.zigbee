'use strict';

const { ZigBeeDriver } = require('homey-zigbeedriver');

class BoilerSwitchEnergyDriver extends ZigBeeDriver {

  async onInit() {
    await super.onInit();
    this.log('BoilerSwitchEnergyDriver initialized');
    this._registerFlowCards();
  }

  /**
   * v9.0.253 (P62): Wrap getDeviceTriggerCard/getConditionCard calls
   * to handle the "Invalid Flow Card ID" case gracefully. Previously
   * the driver would call these without try/catch on the wrapper
   * (only inside), causing 4x crash logs:
   *   - "Invalid Flow Card ID: boiler_switch_energy_turned_on" (4x)
   *   - "Invalid Flow Card ID: boiler_switch_energy_turned_off" (4x)
   *   - "boiler_switch_energy_turned_on" (4x)
   *   - "boiler_switch_energy_turned_off" (4x)
   *
   * The flow cards are NOT declared in any driver.flow.compose.json
   * (we checked — the driver dir has no such file). So we skip
   * registration entirely. This is the cleanest fix: don't try to
   * register flow cards that don't exist.
   */
  _registerFlowCards() {
    // No flow cards to register. The driver is a placeholder for
    // Sacred Couple routing (mfrs are placeholder, see mfs_db.json).
    // Future P62+ work: add a driver.flow.compose.json with the
    // proper flow cards if users request them.
    this.log('[FLOW] Boiler switch energy: no flow cards to register (placeholder driver)');
  }
}

module.exports = BoilerSwitchEnergyDriver;
