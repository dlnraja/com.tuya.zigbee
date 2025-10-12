'use strict';

const { ZigBeeDevice } = require('homey-zigbeedriver');
const { CLUSTER } = require('zigbee-clusters');

/**
 * Doorbell Camera Ac
 * 
 * UNBRANDED Architecture
 * Generated: 2025-10-12
 * Supports: Philips
 */
class DoorbellCameraAcDevice extends ZigBeeDevice {

  async onNodeInit({ zclNode }) {
    this.log('doorbell_camera_ac initialized');
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

    // alarm_motion
    if (this.hasCapability('alarm_motion')) {
      try {
        this.registerCapability('alarm_motion', CLUSTER.OCCUPANCY_SENSING, {
      get: 'occupancy',
      report: 'occupancy',
      reportParser: value => (value & 1) === 1
    });
        this.log('✅ alarm_motion registered');
      } catch (err) {
        this.error('alarm_motion failed:', err);
      }
    }
  }

  async onDeleted() {
    this.log('doorbell_camera_ac deleted');
  }

}

module.exports = DoorbellCameraAcDevice;
