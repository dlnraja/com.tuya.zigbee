'use strict';

const { ZigBeeDevice } = require('homey-zigbeedriver');
const { CLUSTER } = require('zigbee-clusters');

/**
 * Alarm Siren Chime Ac
 * 
 * UNBRANDED Architecture
 * Generated: 2025-10-12
 * Supports: Philips
 */
class AlarmSirenChimeAcDevice extends ZigBeeDevice {

  async onNodeInit({ zclNode }) {
    this.log('alarm_siren_chime_ac initialized');
    this.log('Device:', this.getData());

    await super.onNodeInit({ zclNode });

    // Register capabilities
    await this.registerCapabilities();

    await this.setAvailable();
  }

  async registerCapabilities() {
    // alarm_generic
    if (this.hasCapability('alarm_generic')) {
      try {
        this.registerCapability('alarm_generic', CLUSTER.IAS_ZONE, {
      zoneType: 'alarm',
      get: 'zoneStatus',
      report: 'zoneStatus'
    });
        this.log('✅ alarm_generic registered');
      } catch (err) {
        this.error('alarm_generic failed:', err);
      }
    }
  }

  async onDeleted() {
    this.log('alarm_siren_chime_ac deleted');
  }

}

module.exports = AlarmSirenChimeAcDevice;
