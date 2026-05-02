'use strict';

const { safeDivide, safeMultiply, safeParse } = require('../../lib/utils/tuyaUtils.js');
const { CLUSTERS } = require('../../lib/constants/ZigbeeConstants.js');
const { ZigBeeDevice } = require('homey-zigbeedriver');
const { CLUSTER } = require('zigbee-clusters');
const { syncDeviceTime } = require('../../lib/tuya/TuyaTimeSync');
const DeviceFingerprintDB = require('../../lib/tuya/DeviceFingerprintDB');

/**
 * UNIVERSAL FALLBACK DEVICE - v5.8.6
 */

const CLUSTER_MAP = {
  6: ['onoff'], 
  8: ['dim'], 
  768: ['light_hue', 'light_saturation', 'light_temperature'],
  1026: ['measure_temperature'], 
  1029: ['measure_humidity'], 
  1024: ['measure_luminance'],
  1280: ['alarm_contact'], 
  1: ['measure_battery'], 
  2820: ['measure_power', 'measure_voltage'],
  258: ['windowcoverings_set'], 
  513: ['target_temperature']
};

class UniversalFallbackDevice extends ZigBeeDevice {

  async onNodeInit({ zclNode }) {
    this.log('[UNIVERSAL] Universal Fallback Device v5.8.6');
    
    const mfr = this.getSetting('zb_manufacturer_name') || 'Unknown';
    const model = this.getSetting('zb_model_id') || 'Unknown';
    this.zclNode = zclNode;

    this._z2mConfig = DeviceFingerprintDB.getFingerprint(mfr);
    this._z2mDpMap = DeviceFingerprintDB.getDPMapping(mfr);

    await this._detectCapabilities(zclNode);
    await this._registerSDK3Capabilities(zclNode);
    await this._setupTuyaDP(zclNode);
    await this._setupZCLListeners(zclNode);
    await this._setupTimeSync(zclNode);
    
    this.log('[UNIVERSAL] Ready');
  }

  async _detectCapabilities(zclNode) {
    this._detectedCaps = [];
    
    if (this._z2mConfig?.capabilities) {
      for (const cap of this._z2mConfig.capabilities) {
        if (!this.hasCapability(cap)) {
          try { 
            await this.addCapability(cap); 
            this._detectedCaps.push(cap); 
          } catch (e) {}
        }
      }
    }
    
    for (const [epId, ep] of Object.entries(zclNode.endpoints || {})) {
      for (const clusterId of Object.keys(ep.clusters || {})) {
        const cid = parseInt(clusterId);
        const caps = CLUSTER_MAP[cid];
        if (caps) {
          for (const cap of caps) {
            if (!this.hasCapability(cap)) {
              try {
                await this.addCapability(cap);
                this._detectedCaps.push(cap);
              } catch (e) {}
            }
          }
        }
      }
    }
  }

  async _registerSDK3Capabilities(zclNode) {
    const ep1 = zclNode?.endpoints?.[1];
    if (!ep1) return;

    if (this.hasCapability('onoff') && ep1.clusters?.onOff) {
      this.registerCapability('onoff', CLUSTER.ON_OFF);
    }

    if (this.hasCapability('dim') && ep1.clusters?.levelControl) {
      this.registerCapability('dim', CLUSTER.LEVEL_CONTROL);
    }

    if (this.hasCapability('measure_temperature') && ep1.clusters?.temperatureMeasurement) {
      this.registerCapability('measure_temperature', CLUSTER.TEMPERATURE_MEASUREMENT);
    }

    if (this.hasCapability('measure_humidity') && ep1.clusters?.relativeHumidity) {
      this.registerCapability('measure_humidity', CLUSTER.RELATIVE_HUMIDITY);
    }

    if (this.hasCapability('measure_luminance') && ep1.clusters?.illuminanceMeasurement) {
      this.registerCapability('measure_luminance', CLUSTER.ILLUMINANCE_MEASUREMENT);
    }

    if (this.hasCapability('measure_battery') && ep1.clusters?.powerConfiguration) {
      this.registerCapability('measure_battery', CLUSTER.POWER_CONFIGURATION, {
        get: 'batteryPercentageRemaining',
        report: 'batteryPercentageRemaining',
        reportParser: value => Math.round(value / 2),
      });
    }
  }

  async _setupTuyaDP(zclNode) {
    const ep1 = zclNode?.endpoints?.[1];
    const tuyaCluster = ep1?.clusters?.tuya || ep1?.clusters?.[CLUSTERS.TUYA_EF00];
    if (!tuyaCluster) return;

    this.tuyaCluster = tuyaCluster;
    tuyaCluster.on('response', this._handleTuyaResponse.bind(this));
    tuyaCluster.on('reporting', this._handleTuyaResponse.bind(this));
    tuyaCluster.on('datapoint', this._handleDP.bind(this));
  }

  _handleTuyaResponse(data) {
    if (!data) return;
    const dp = data.dp || data.dpId;
    const value = data.value;
    if (dp !== undefined) this._handleDP(dp, value);
  }

  _handleDP(dp, value) {
    if (this._z2mDpMap && this._z2mDpMap[dp]) {
      const capability = this._z2mDpMap[dp];
      this._setCapSafe(capability, value);
      return;
    }
    
    // Fallback logic
    switch (dp) {
      case 1: this._setCapSafe('onoff', !!value); break;
      case 2: this._setCapSafe('onoff.gang2', !!value); break;
      case 24: this._setCapSafe('measure_temperature', value / 10); break;
      case 25: this._setCapSafe('measure_humidity', value); break;
    }
  }

  _setCapSafe(cap, value) {
    if (this.hasCapability(cap)) {
      this.setCapabilityValue(cap, value).catch(() => {});
    }
  }

  async _setupZCLListeners(zclNode) {
    const ep1 = zclNode?.endpoints?.[1];
    if (!ep1) return;

    if (ep1.clusters.onOff) {
      ep1.clusters.onOff.on('attr.onOff', (val) => this._setCapSafe('onoff', val));
    }
  }

  async _setupTimeSync(zclNode) {
    syncDeviceTime(this).catch(() => {});
  }

  async onSettings({ oldSettings, newSettings, changedKeys }) {
    return true;
  }

  onDeleted() {
    this.log('[UNIVERSAL] Device deleted');
  }
}

module.exports = UniversalFallbackDevice;
