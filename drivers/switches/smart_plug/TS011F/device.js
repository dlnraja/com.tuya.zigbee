'use strict';

const BaseDevice = require('../../../common/BaseDevice');
const { CLUSTERS } = require('../../../common/constants');

class TS011FDevice extends BaseDevice {

  async registerCapabilities() {
    this.log('Registering capabilities for TS011F Smart Plug');

    // On/Off
    this.registerCapability('onoff', CLUSTERS.ON_OFF);

    // Power Measurement
    this.registerCapability('measure_power', CLUSTERS.ELECTRICAL_MEASUREMENT, {
      report: 'activePower',
      reportParser: value => value / 10,
      reportOpts: { minReportDelay: 5, maxReportDelay: 300, minReportChange: 10 },
      getOpts: { getOnOnline: true }
    });

    // Current Measurement
    this.registerCapability('measure_current', CLUSTERS.ELECTRICAL_MEASUREMENT, {
      report: 'rmsCurrent',
      reportParser: value => value / 1000,
      reportOpts: { minReportDelay: 5, maxReportDelay: 300, minReportChange: 10 },
      getOpts: { getOnOnline: true }
    });

    // Voltage Measurement
    this.registerCapability('measure_voltage', CLUSTERS.ELECTRICAL_MEASUREMENT, {
      report: 'rmsVoltage',
      reportParser: value => value / 10,
      reportOpts: { minReportDelay: 300, maxReportDelay: 900, minReportChange: 5 },
      getOpts: { getOnOnline: true }
    });

    // Energy Consumption
    this.registerCapability('meter_power', CLUSTERS.METERING, {
      report: 'currentSummDelivered',
      reportParser: value => {
        if (Buffer.isBuffer(value) && value.length >= 2) {
            return value.readUInt32BE(value.length - 4) / 100;
        }
        if (typeof value === 'number') {
            return value / 100;
        }
        this.log('Invalid meter_power value:', value);
        return null;
      },
      getOpts: { getOnOnline: true }
    });
  }

  async initializeDevice() {
    this.log('Configuring plug settings for TS011F');
    try {
      const endpoint = this.zclNode.endpoints[1];
      if (endpoint && endpoint.clusters[CLUSTERS.ELECTRICAL_MEASUREMENT]) {
        await endpoint.clusters[CLUSTERS.ELECTRICAL_MEASUREMENT].writeAttributes({
          acPowerMultiplier: 1,
          acPowerDivisor: 10,
          acCurrentMultiplier: 1,
          acCurrentDivisor: 1000,
          acVoltageMultiplier: 1,
          acVoltageDivisor: 10
        });
        this.log('Power monitoring multipliers/divisors configured');
      }
    } catch (error) {
      this.error('Failed to configure plug settings:', error);
    }
}

module.exports = TS011FDevice;
