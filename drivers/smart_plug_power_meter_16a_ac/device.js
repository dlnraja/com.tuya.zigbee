'use strict';

const { ZigBeeDevice } = require('homey-zigbeedriver');
const { CLUSTER } = require('zigbee-clusters');

/**
 * Smart Plug Power Meter 16a Ac
 * 
 * UNBRANDED Architecture
 * Generated: 2025-10-12
 * Supports: Tuya
 */
class SmartPlugPowerMeter16aAcDevice extends ZigBeeDevice {

  async onNodeInit({ zclNode }) {
    this.log('smart_plug_power_meter_16a_ac initialized');
    this.log('Device:', this.getData());

    await super.onNodeInit({ zclNode });

    // Register capabilities
    await this.registerCapabilities();

    await this.setAvailable();
  }

  async registerCapabilities() {
    // onoff
    if (this.hasCapability('onoff')) {
      try {
        this.registerCapability('onoff', CLUSTER.ON_OFF, {
      get: 'onOff',
      report: 'onOff',
      set: 'toggle',
      setParser: value => ({ })
    });
        this.log('✅ onoff registered');
      } catch (err) {
        this.error('onoff failed:', err);
      }
    }

    // measure_power
    if (this.hasCapability('measure_power')) {
      try {
        this.registerCapability('measure_power', CLUSTER.ELECTRICAL_MEASUREMENT, {
      get: 'activePower',
      report: 'activePower',
      reportParser: value => value / 10
    });
        this.log('✅ measure_power registered');
      } catch (err) {
        this.error('measure_power failed:', err);
      }
    }

    // measure_voltage
    if (this.hasCapability('measure_voltage')) {
      try {
        this.registerCapability('measure_voltage', CLUSTER.ELECTRICAL_MEASUREMENT, {
      get: 'rmsVoltage',
      report: 'rmsVoltage',
      reportParser: value => value / 10
    });
        this.log('✅ measure_voltage registered');
      } catch (err) {
        this.error('measure_voltage failed:', err);
      }
    }

    // measure_current
    if (this.hasCapability('measure_current')) {
      try {
        this.registerCapability('measure_current', CLUSTER.ELECTRICAL_MEASUREMENT, {
      get: 'rmsCurrent',
      report: 'rmsCurrent',
      reportParser: value => value / 1000
    });
        this.log('✅ measure_current registered');
      } catch (err) {
        this.error('measure_current failed:', err);
      }
    }

    // meter_power
    if (this.hasCapability('meter_power')) {
      try {
        this.registerCapability('meter_power', CLUSTER.METERING, {
      get: 'currentSummDelivered',
      report: 'currentSummDelivered',
      reportParser: value => value / 1000
    });
        this.log('✅ meter_power registered');
      } catch (err) {
        this.error('meter_power failed:', err);
      }
    }
  }

  async onDeleted() {
    this.log('smart_plug_power_meter_16a_ac deleted');
  }

}

module.exports = SmartPlugPowerMeter16aAcDevice;
