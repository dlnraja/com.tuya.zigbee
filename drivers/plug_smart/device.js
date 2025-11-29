'use strict';

const BaseHybridDevice = require('../../lib/devices/BaseHybridDevice');
const { CLUSTER } = require('zigbee-clusters');

/**
 * PlugSmartDevice - Smart Plug with Energy Monitoring
 *
 * Supports:
 * - TS011F: Standard ZCL (onOff, metering, electricalMeasurement)
 * - TS0121: Standard ZCL with energy
 * - TS0601: Tuya DP protocol
 *
 * Clusters used:
 * - 6 (genOnOff): On/Off control
 * - 1794 (seMetering): Energy consumption (kWh)
 * - 2820 (haElectricalMeasurement): Power, Voltage, Current
 */
class PlugSmartDevice extends BaseHybridDevice {

  async onNodeInit({ zclNode }) {
    this.log('[PLUG] Smart Plug initializing...');

    await super.onNodeInit({ zclNode }).catch(err => this.error(err));

    const endpoint = zclNode?.endpoints?.[1];

    // Setup On/Off
    if (endpoint?.clusters?.genOnOff || endpoint?.clusters?.onOff) {
      this.registerCapability('onoff', CLUSTER.ON_OFF);
      this.log('[PLUG] On/Off registered');
    }

    // Setup Energy Metering (seMetering cluster 1794)
    await this._setupEnergyMetering(endpoint);

    // Setup Electrical Measurement (haElectricalMeasurement cluster 2820)
    await this._setupElectricalMeasurement(endpoint);

    // Setup Tuya DP for TS0601 plugs
    const hasTuyaCluster = !!(endpoint?.clusters?.tuya || endpoint?.clusters?.[61184]);
    if (hasTuyaCluster) {
      await this._setupTuyaDPPlug();
    }

    this.log('[PLUG] Smart Plug initialized');
  }

  /**
   * Setup Energy Metering (seMetering cluster)
   * Provides: meter_power (kWh total consumption)
   */
  async _setupEnergyMetering(endpoint) {
    const meteringCluster = endpoint?.clusters?.seMetering || endpoint?.clusters?.metering || endpoint?.clusters?.[1794];

    if (!meteringCluster) {
      this.log('[PLUG] No metering cluster');
      return;
    }

    this.log('[PLUG] Setting up energy metering...');

    // Register meter_power capability
    if (this.hasCapability('meter_power')) {
      this.registerCapability('meter_power', CLUSTER.METERING, {
        get: 'currentSummationDelivered',
        report: 'currentSummationDelivered',
        reportParser: (value) => {
          // Convert to kWh (divisor is typically 1000 or 100)
          const divisor = this._meterDivisor || 1000;
          return value / divisor;
        }
      });
    }

    // Configure reporting
    try {
      await this.configureAttributeReporting([{
        endpointId: 1,
        cluster: CLUSTER.METERING,
        attributeName: 'currentSummationDelivered',
        minInterval: 60,
        maxInterval: 600,
        minChange: 1
      }]);
      this.log('[PLUG] Metering reporting configured');
    } catch (err) {
      this.log('[PLUG] Metering reporting failed:', err.message);
    }

    // Read divisor
    try {
      const attrs = await meteringCluster.readAttributes(['divisor', 'multiplier']);
      this._meterDivisor = attrs.divisor || 1000;
      this._meterMultiplier = attrs.multiplier || 1;
      this.log(`[PLUG] Meter divisor=${this._meterDivisor}, multiplier=${this._meterMultiplier}`);
    } catch (err) {
      this._meterDivisor = 1000;
    }
  }

  /**
   * Setup Electrical Measurement (haElectricalMeasurement cluster)
   * Provides: measure_power (W), measure_voltage (V), measure_current (A)
   */
  async _setupElectricalMeasurement(endpoint) {
    const elecCluster = endpoint?.clusters?.haElectricalMeasurement ||
      endpoint?.clusters?.electricalMeasurement ||
      endpoint?.clusters?.[2820];

    if (!elecCluster) {
      this.log('[PLUG] No electrical measurement cluster');
      return;
    }

    this.log('[PLUG] Setting up electrical measurement...');

    // Active Power (W)
    if (this.hasCapability('measure_power')) {
      this.registerCapability('measure_power', CLUSTER.ELECTRICAL_MEASUREMENT, {
        get: 'activePower',
        report: 'activePower',
        reportParser: (value) => {
          // Some devices report in 0.1W, others in W
          const divisor = this._powerDivisor || 1;
          return value / divisor;
        }
      });
    }

    // RMS Voltage (V)
    if (this.hasCapability('measure_voltage')) {
      this.registerCapability('measure_voltage', CLUSTER.ELECTRICAL_MEASUREMENT, {
        get: 'rmsVoltage',
        report: 'rmsVoltage',
        reportParser: (value) => {
          const divisor = this._voltageDivisor || 1;
          return value / divisor;
        }
      });
    }

    // RMS Current (A)
    if (this.hasCapability('measure_current')) {
      this.registerCapability('measure_current', CLUSTER.ELECTRICAL_MEASUREMENT, {
        get: 'rmsCurrent',
        report: 'rmsCurrent',
        reportParser: (value) => {
          // Convert mA to A
          const divisor = this._currentDivisor || 1000;
          return value / divisor;
        }
      });
    }

    // Configure reporting for power
    try {
      await this.configureAttributeReporting([{
        endpointId: 1,
        cluster: CLUSTER.ELECTRICAL_MEASUREMENT,
        attributeName: 'activePower',
        minInterval: 10,
        maxInterval: 300,
        minChange: 1
      }]);
      this.log('[PLUG] Power reporting configured');
    } catch (err) {
      this.log('[PLUG] Power reporting failed:', err.message);
    }

    // Read divisors
    try {
      const attrs = await elecCluster.readAttributes([
        'acPowerDivisor', 'acVoltageDivisor', 'acCurrentDivisor'
      ]);
      this._powerDivisor = attrs.acPowerDivisor || 1;
      this._voltageDivisor = attrs.acVoltageDivisor || 1;
      this._currentDivisor = attrs.acCurrentDivisor || 1000;
      this.log(`[PLUG] Divisors: power=${this._powerDivisor}, voltage=${this._voltageDivisor}, current=${this._currentDivisor}`);
    } catch (err) {
      // Use defaults
    }
  }

  /**
   * Setup Tuya DP for TS0601 smart plugs
   *
   * DP Mapping:
   * - DP 1: switch (on/off)
   * - DP 9: countdown
   * - DP 17: current (A * 1000)
   * - DP 18: power (W * 10)
   * - DP 19: voltage (V * 10)
   * - DP 20: energy (kWh * 100)
   */
  async _setupTuyaDPPlug() {
    this.log('[PLUG] Setting up Tuya DP...');

    if (this.tuyaEF00Manager) {
      this.tuyaEF00Manager.on('dpReport', ({ dpId, value }) => {
        this._handlePlugDP(dpId, value);
      });
    }

    // Register onoff listener for TS0601
    if (this.hasCapability('onoff')) {
      this.registerCapabilityListener('onoff', async (value) => {
        await this._sendTuyaDP(1, 'bool', value);
      });
    }
  }

  /**
   * Handle incoming Tuya DP for plugs
   */
  _handlePlugDP(dpId, value) {
    this.log(`[PLUG] DP${dpId} = ${value}`);

    switch (dpId) {
      case 1: // Switch
        if (this.hasCapability('onoff')) {
          this.setCapabilityValue('onoff', Boolean(value)).catch(this.error);
        }
        break;

      case 17: // Current (mA)
        if (this.hasCapability('measure_current')) {
          this.setCapabilityValue('measure_current', value / 1000).catch(this.error);
        }
        break;

      case 18: // Power (W * 10)
        if (this.hasCapability('measure_power')) {
          this.setCapabilityValue('measure_power', value / 10).catch(this.error);
        }
        break;

      case 19: // Voltage (V * 10)
        if (this.hasCapability('measure_voltage')) {
          this.setCapabilityValue('measure_voltage', value / 10).catch(this.error);
        }
        break;

      case 20: // Energy (kWh * 100)
        if (this.hasCapability('meter_power')) {
          this.setCapabilityValue('meter_power', value / 100).catch(this.error);
        }
        break;
    }
  }

  /**
   * Send Tuya DP command
   */
  async _sendTuyaDP(dp, dataType, value) {
    if (this.tuyaEF00Manager) {
      await this.tuyaEF00Manager.setData(dp, value);
    }
  }

  async onDeleted() {
    this.log('[PLUG] Smart Plug deleted');
    await super.onDeleted().catch(err => this.error(err));
  }
}

module.exports = PlugSmartDevice;
