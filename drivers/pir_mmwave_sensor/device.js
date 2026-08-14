'use strict';
const ZclBatteryMonitor = require('../../lib/battery/ZclBatteryMonitor');
const { Cluster, CLUSTER } = require('zigbee-clusters');
const TuyaZigbeeDevice = require('../../lib/tuya/TuyaZigbeeDevice');
const TuyaSpecificCluster = require('../../lib/TuyaSpecificCluster');
const SleepyInit = require('../../lib/utils/SleepyDeviceInit');
const { safeSetInterval, safeClearInterval } = require('../../lib/utils/safe-timers');

Cluster.addCluster(TuyaSpecificCluster);

const dataTypes = {
  raw: 0,
  bool: 1,
  value: 2,
  string: 3,
  enum: 4,
  bitmap: 5,
};

const convertMultiByteNumberPayloadToSingleDecimalNumber = (chunks) => {
  let value = 0;
  for (let i = 0; i < chunks.length; i++) {
    value = value << 8;
    value += chunks[i];
  }
  return value;
};

const getDataValue = (dpValue) => {
  switch (dpValue.datatype) {
    case dataTypes.raw:
      return dpValue.data;
    case dataTypes.bool:
      return dpValue.data[0] === 1;
    case dataTypes.value:
      return convertMultiByteNumberPayloadToSingleDecimalNumber(dpValue.data);
    case dataTypes.string: {
      let dataString = '';
      for (let i = 0; i < dpValue.data.length; ++i) {
        dataString += String.fromCharCode(dpValue.data[i]);
      }
      return dataString;
    }
    case dataTypes.enum:
      return dpValue.data[0];
    case dataTypes.bitmap:
      return convertMultiByteNumberPayloadToSingleDecimalNumber(dpValue.data);
    default:
      return null;
  }
};

/**
 * PIR mmWave Sensor — P127: TuyaZigbeeDevice + safe-timers
 * Multi-path: IAS Zone + Tuya DP + ZCL illuminance/battery
 */
class pir_mmwave_sensor extends TuyaZigbeeDevice {

  async onNodeInit({ zclNode }) {
    await super.onNodeInit({ zclNode });
    ZclBatteryMonitor.attach(this, zclNode);
    this.transactionID = 0;
    this.printNode();

    if (this.isFirstInit()) {
      const reportingPayload = [
        {
          endpointId: 1,
          cluster: CLUSTER.IAS_ZONE,
          attributeName: 'zoneStatus',
          minInterval: 5,
          maxInterval: 3600,
          minChange: 0,
        }, {
          endpointId: 1,
          cluster: CLUSTER.POWER_CONFIGURATION,
          attributeName: 'batteryPercentageRemaining',
          minInterval: 60,
          maxInterval: 21600,
          minChange: 1,
        }, {
          endpointId: 1,
          cluster: CLUSTER.ILLUMINANCE_MEASUREMENT,
          attributeName: 'measuredValue',
          minInterval: 60,
          maxInterval: 3600,
          minChange: 10,
        }
      ];
      SleepyInit.fireAndForget(this,
        this.configureAttributeReporting(reportingPayload),
        { name: 'configureAttributeReporting', timeoutMs: SleepyInit.ZCL_TIMEOUT_MS }
      ).then((res) => {
        if (res && res !== 'timeout') { this.log('Attribute reporting configured'); }
      });
    }

    const ep1 = zclNode.endpoints[1];
    if (ep1?.clusters?.[CLUSTER.IAS_ZONE.NAME]) {
      ep1.clusters[CLUSTER.IAS_ZONE.NAME]
        .on('attr.zoneStatus', this.onZoneStatusAttributeReport.bind(this));
    }
    if (ep1?.clusters?.[CLUSTER.POWER_CONFIGURATION.NAME]) {
      ep1.clusters[CLUSTER.POWER_CONFIGURATION.NAME]
        .on('attr.batteryPercentageRemaining', this.handleBatteryPercentageReport.bind(this));
    }
    if (ep1?.clusters?.[CLUSTER.ILLUMINANCE_MEASUREMENT.NAME]) {
      ep1.clusters[CLUSTER.ILLUMINANCE_MEASUREMENT.NAME]
        .on('attr.measuredValue', this.onIlluminanceMeasuredAttributeReport.bind(this));
    }

    try {
      const tuya = ep1?.clusters?.tuya;
      if (tuya) {
        tuya.on('response', (value) => this.processResponse(value));
        tuya.on('reporting', (value) => this.processResponse(value));
        tuya.on('datapoint', (value) => this.processResponse(value));
      }
    } catch (e) {
      this.log('[PIR-MMWAVE] Tuya cluster optional:', e.message);
    }

    this.log('Reading battery level directly...');
    try {
      const batteryData = await ep1.clusters.powerConfiguration.readAttributes(['batteryPercentageRemaining', 'batteryVoltage']);
      this.log('Battery read result:', batteryData);
      if (batteryData && batteryData.batteryPercentageRemaining !== undefined) {
        this.handleBatteryPercentageReport(batteryData.batteryPercentageRemaining);
      }
      this.batteryInterval = safeSetInterval(this, async () => {
        if (this._destroyed) { return; }
        try {
          const battery = await ep1.clusters.powerConfiguration.readAttributes(['batteryPercentageRemaining']);
          if (battery && battery.batteryPercentageRemaining !== undefined) {
            this.handleBatteryPercentageReport(battery.batteryPercentageRemaining);
          }
        } catch (error) {
          this.log('Periodic battery read failed:', error.message);
        }
      }, 30 * 60 * 1000);
    } catch (error) {
      this.log('Initial battery read failed:', error.message);
      this.handleBatteryPercentageReport(200);
    }
  }

  onZoneStatusAttributeReport(status) {
    if (this._destroyed) { return; }
    this.log('Motion status: ', status.alarm1);
    this.safeSetCapabilityValue('alarm_motion', status.alarm1).catch(this._boundError || ((e) => { try { this.error(e); } catch (_) {} }));
  }

  handleBatteryPercentageReport(batteryPercentageRemaining) {
    const UnifiedBatteryHandler = require('../../lib/battery/UnifiedBatteryHandler');
    const batteryThreshold = this.getSetting('batteryThreshold') || 20;
    const batteryLevel = UnifiedBatteryHandler.normalizeZigbeeValue(batteryPercentageRemaining, {
      manufacturer: this.getSetting?.('zb_manufacturer_name') || '',
      batteryType: 'CR2032',
    });
    if (batteryLevel == null) { return; }
    this.log('Battery raw:', batteryPercentageRemaining, '→', batteryLevel, '%');
    this.safeSetCapabilityValue('measure_battery', batteryLevel).catch(this._boundError || ((e) => { try { this.error(e); } catch (_) {} }));
    this.safeSetCapabilityValue('alarm_battery', batteryLevel < batteryThreshold).catch(this._boundError || ((e) => { try { this.error(e); } catch (_) {} }));
  }

  onIlluminanceMeasuredAttributeReport(measuredValue) {
    const luxValue = Math.round(Math.pow(10, (measuredValue - 1) / 10000));
    this.log('measure_luminance | Illuminance (lux):', luxValue);
    this.safeSetCapabilityValue('measure_luminance', luxValue).catch(this._boundError || ((e) => { try { this.error(e); } catch (_) {} }));
  }

  async processResponse(data) {
    const dp = data.dp;
    const measuredValue = getDataValue(data);
    this.log('Tuya DP:', dp, 'Value:', measuredValue);

    switch (dp) {
      case 1:
        if (typeof measuredValue === 'boolean') {
          this.safeSetCapabilityValue('alarm_motion', measuredValue).catch(this._boundError || ((e) => { try { this.error(e); } catch (_) {} }));
        } else if (typeof measuredValue === 'number') {
          this.safeSetCapabilityValue('alarm_motion', measuredValue === 1).catch(this._boundError || ((e) => { try { this.error(e); } catch (_) {} }));
        }
        break;
      case 106:
        if (typeof measuredValue === 'number') {
          this.safeSetCapabilityValue('measure_luminance', measuredValue).catch(this._boundError || ((e) => { try { this.error(e); } catch (_) {} }));
        }
        break;
      case 110:
        if (typeof measuredValue === 'number') {
          this.safeSetCapabilityValue('measure_battery', measuredValue).catch(this._boundError || ((e) => { try { this.error(e); } catch (_) {} }));
          const batteryThreshold = this.getSetting('batteryThreshold') || 20;
          this.safeSetCapabilityValue('alarm_battery', measuredValue < batteryThreshold).catch(this._boundError || ((e) => { try { this.error(e); } catch (_) {} }));
        }
        break;
      default:
        this.log(`Unknown Tuya DP: ${dp} = ${measuredValue}`);
        break;
    }
  }

  async onSettings({ newSettings, changedKeys }) {
    this.log('Settings changed:', changedKeys);
    for (const key of changedKeys) {
      const value = newSettings[key];
      switch (key) {
        case 'fading_time':
          await this.writeTuyaData(102, dataTypes.value, value);
          break;
        case 'motion_detection_sensitivity':
          await this.writeTuyaData(2, dataTypes.value, value);
          break;
        case 'illuminance_interval':
          await this.writeTuyaData(107, dataTypes.value, value);
          break;
        case 'indicator':
          await this.writeTuyaData(108, dataTypes.bool, value ? 1 : 0);
          break;
        default:
          break;
      }
    }
  }

  async writeTuyaData(dp, dataType, value) {
    try {
      let data;
      let length;
      switch (dataType) {
        case dataTypes.bool:
          data = Buffer.alloc(1);
          data.writeUInt8(value ? 0x01 : 0x00, 0);
          length = 1;
          break;
        case dataTypes.value:
          data = Buffer.alloc(4);
          data.writeUInt32BE(value, 0);
          length = 4;
          break;
        case dataTypes.enum:
          data = Buffer.alloc(1);
          data.writeUInt8(value, 0);
          length = 1;
          break;
        default:
          throw new Error(`Unsupported data type: ${dataType}`);
      }
      await this.zclNode.endpoints[1].clusters.tuya.datapoint({
        status: 0,
        transid: this.transactionID++,
        dp,
        datatype: dataType,
        length,
        data
      });
      this.log(`Sent Tuya DP${dp}:`, value);
    } catch (error) {
      this.error(`Failed Tuya DP${dp}:`, error);
      throw error;
    }
  }

  onDeleted() {
    this._destroyed = true;
    if (this.batteryInterval) {
      try { safeClearInterval(this, this.batteryInterval); } catch (_) {
        try { clearInterval(this.batteryInterval); } catch (__) {}
      }
      this.batteryInterval = null;
    }
    super.onDeleted();
    this.log('PIR MMWave Sensor removed');
  }
}

module.exports = pir_mmwave_sensor;
