'use strict';
const { safeParse } = require('../../lib/utils/tuyaUtils.js');


// A8: NaN Safety - use safeDivide/safeMultiply
const UniversalZigbeeDevice = require('../../lib/UniversalZigbeeDevice');
const { getModelId, getManufacturer } = require('../../lib/helpers/DeviceDataHelper');

/**
 * UniversalZigbeeDevice - The ultimate fallback driver for ANY Zigbee device.
 * Matches: * (Native Zigbee, Custom Zigbee, Tuya Zigbee)
 */
class UniversalZigbeeDeviceSub extends UniversalZigbeeDevice {

  async onNodeInit() {
    this.log('-------------------------------------------------------');
    this.log(` [UNIVERSAL DRIVER] UNLEASHING INTELLIGENCE ON: ${this.getName()}`);
    this.log(`   Model: ${getModelId(this)} | Manufacturer: ${getManufacturer(this)}`);
    this.log('-------------------------------------------------------');

    // 1. Base Initialization (Standard ZCL + Diagnostics)
    await super.onNodeInit();

    // 2. Specific Cluster Listeners (Native ZCL Fallbacks)
    this._setupNativeZclListeners();

    this.log(' [UNIVERSAL DRIVER] Device online and managed');
  }

  /**
   * Setup standard ZCL listeners for native Zigbee devices (IKEA, Philips, etc.)
   */
  _setupNativeZclListeners() {
    if (!this.zclNode) return;

    // A. OnOff (0x0006)
    this.registerCapability('onoff', 'genOnOff', {
      get: 'onOff',
      report: 'onOff',
      getOpts: { getOnStart: true, getOnOnline: true }
    }).catch(() => {});

    // B. LevelControl (0x0008)
    this.registerCapability('dim', 'genLevelCtrl', {
      get: 'currentLevel',
      report: 'currentLevel',
      reportParser: v => safeMultiply(v, 254),
      getOpts: { getOnStart: true, getOnOnline: true }
    }).catch(() => {});

    // C. Temperature (0x0402)
    this.registerCapability('measure_temperature', 'msTemperatureMeasurement', {
      get: 'measuredValue',
      report: 'measuredValue',
      reportParser: v => v * 100
    }).catch(() => {});

    // D. Humidity (0x0405)
    this.registerCapability('measure_humidity', 'msRelativeHumidity', {
      get: 'measuredValue',
      report: 'measuredValue',
      reportParser: v => v * 100
    }).catch(() => {});

    // E. Illuminance (0x0400)
    this.registerCapability('measure_luminance', 'msIlluminanceMeasurement', {
      get: 'measuredValue',
      report: 'measuredValue',
      reportParser: v => Math.pow(10, (v * 1 - 1) / 10000)
    }).catch(() => {});

    // F. Occupancy (0x0406) -> alarm_motion
    this.registerCapability('alarm_motion', 'msOccupancySensing', {
      get: 'occupancy',
      report: 'occupancy',
      reportParser: v => (v & 1) === 1
    }).catch(() => {});

    // G. IAS Zone (0x0500) -> alarm_contact / alarm_motion/alarm_water
    // Hybrid logic: determine capability from device class or clusters
    const iasCluster = this.zclNode.endpoints?.[1]?.clusters?.iasZone;
    if (iasCluster) {
      const cap = this.hasCapability('alarm_water') ? 'alarm_water' : 
                  (this.hasCapability('alarm_contact') ? 'alarm_contact' : 'alarm_motion');
      
      this.registerCapability(cap, 'iasZone', {
         get: 'zoneStatus',
         report: 'zoneStatus',
         reportParser: v => (v & 1) === 1
      }).catch(() => {});
    }

    // H. Battery (0x0001)
    this.registerCapability('measure_battery', 'genPowerCfg', {
      get: 'batteryPercentageRemaining',
      report: 'batteryPercentageRemaining',
      reportParser: v => (v === 255) ? null : Math.round(v)
    }).catch(() => {});
  }

  /**
   * Universal Command Handler
   * This allows any Flow card button to send commands to any cluster even if not mapped.
   */
  async onZigBeeMessage(endpointId, clusterId, frame, meta) {
     // Forward raw messages to the universal bridge
     if (this._universalBridge) {
        this._universalBridge.onClusterEvent(clusterId, frame.CommandID, frame.Payload);
     }
     return false; // let standard handlers also try
  }

  /**
   * v7.4.6: Refresh state when device announces itself (rejoin/wakeup)
   */
  async onEndDeviceAnnounce() {
    this.log('[REJOIN] Device announced itself, refreshing state...');
    if (typeof this._updateLastSeen === 'function') this._updateLastSeen();
    // Proactive data recovery if supported
    if (this._dataRecoveryManager) {
       this._dataRecoveryManager.triggerRecovery();
    }
  }
}

module.exports = UniversalZigbeeDeviceSub;

