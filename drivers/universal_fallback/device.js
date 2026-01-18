'use strict';

const { ZigBeeDevice } = require('homey-zigbeedriver');

/**
 * UNIVERSAL FALLBACK DEVICE - v5.5.624
 * Intelligent auto-detection for unknown Tuya/Zigbee devices
 */

const CLUSTER_MAP = {
  6: ['onoff'], 8: ['dim'], 768: ['light_hue', 'light_saturation', 'light_temperature'],
  1026: ['measure_temperature'], 1029: ['measure_humidity'], 1024: ['measure_luminance'],
  1280: ['alarm_contact'], 1: ['measure_battery'], 2820: ['measure_power', 'measure_voltage'],
  258: ['windowcoverings_set'], 513: ['target_temperature']
};

const VALUE_RANGES = {
  measure_temperature: { min: -40, max: 100 },
  measure_humidity: { min: 0, max: 100 },
  measure_battery: { min: 0, max: 100 },
  measure_power: { min: 0, max: 10000 },
  measure_voltage: { min: 0, max: 300 },
  dim: { min: 0, max: 1 },
  windowcoverings_set: { min: 0, max: 1 }
};

class UniversalFallbackDevice extends ZigBeeDevice {

  async onNodeInit({ zclNode }) {
    this.log('[UNIVERSAL] ═══════════════════════════════════════════════════');
    this.log('[UNIVERSAL] �� Universal Fallback Device v5.5.624');
    
    const mfr = this.getSetting('zb_manufacturer_name') || 'Unknown';
    const model = this.getSetting('zb_modelId') || 'Unknown';
    this.log('[UNIVERSAL] Device: ' + mfr + ' / ' + model);

    this._detectedCaps = [];
    this._dpLog = {};
    this.zclNode = zclNode;

    await this._detectCapabilities(zclNode);
    await this._setupTuyaDP(zclNode);
    await this._setupZCLListeners(zclNode);
    
    this.log('[UNIVERSAL] ✅ Ready - Caps: ' + this._detectedCaps.join(', '));
    this.log('[UNIVERSAL] ═══════════════════════════════════════════════════');
  }

  async _detectCapabilities(zclNode) {
    this.log('[UNIVERSAL] 🔍 Detecting from clusters...');
    const clusters = [];
    
    for (const [epId, ep] of Object.entries(zclNode.endpoints || {})) {
      for (const clusterId of Object.keys(ep.clusters || {})) {
        const cid = parseInt(clusterId);
        if (!isNaN(cid)) clusters.push(cid);
      }
    }
    
    this.log('[UNIVERSAL] Clusters: ' + clusters.join(', '));
    this.setSettings({ detected_clusters: clusters.slice(0, 10).join(', ') }).catch(() => {});

    for (const cid of clusters) {
      const caps = CLUSTER_MAP[cid];
      if (caps) {
        for (const cap of caps) {
          if (!this._detectedCaps.includes(cap) && !this.hasCapability(cap)) {
            try {
              await this.addCapability(cap);
              this._detectedCaps.push(cap);
              this.log('[UNIVERSAL] ✅ +' + cap);
            } catch (e) { /* ignore */ }
          }
        }
      }
    }

    this.setSettings({ detected_capabilities: this._detectedCaps.join(', ') }).catch(() => {});
  }

  async _setupTuyaDP(zclNode) {
    const ep1 = zclNode?.endpoints?.[1];
    if (!ep1) return;

    const tuyaCluster = ep1.clusters?.tuya || ep1.clusters?.[61184] || ep1.clusters?.['61184'];
    if (!tuyaCluster) {
      this.log('[UNIVERSAL] No Tuya cluster');
      return;
    }

    this.log('[UNIVERSAL] 🔧 Tuya DP listener active');
    this.tuyaCluster = tuyaCluster;

    // Listen for DP reports
    if (typeof tuyaCluster.on === 'function') {
      tuyaCluster.on('response', this._handleTuyaResponse.bind(this));
      tuyaCluster.on('reporting', this._handleTuyaResponse.bind(this));
      tuyaCluster.on('datapoint', this._handleDP.bind(this));
    }

    // Raw frame handler
    zclNode.on('response', (endpoint, cluster, payload, frame) => {
      if (cluster === 61184 || cluster === 0xEF00) {
        this._parseRawTuyaFrame(frame);
      }
    });
  }

  _handleTuyaResponse(data) {
    if (!data) return;
    const dp = data.dp || data.dpId || data.datapoint;
    const value = data.value ?? data.data;
    if (dp !== undefined) this._handleDP(dp, value, data.dataType);
  }

  _handleDP(dp, value, dataType) {
    const enableLog = this.getSetting('enable_dp_logging') !== false;
    if (enableLog) {
      this.log('[UNIVERSAL] 📥 DP' + dp + ' = ' + JSON.stringify(value) + ' (type: ' + dataType + ')');
    }

    // Track for settings
    this._dpLog[dp] = { value, type: dataType, ts: Date.now() };
    const dpStr = Object.keys(this._dpLog).map(k => 'DP' + k + '=' + this._dpLog[k].value).join(', ');
    this.setSettings({ tuya_datapoints: dpStr.slice(0, 100) }).catch(() => {});

    // Intelligent DP mapping
    this._mapDPToCapability(dp, value, dataType);
  }

  _mapDPToCapability(dp, value, dataType) {
    // Common DP patterns for Tuya devices
    const dpMaps = {
      // On/Off (DP 1-6 for multi-gang)
      1: () => this._setCapSafe('onoff', value === 1 || value === true),
      2: () => this._setCapSafe('onoff.gang2', value === 1 || value === true) || this._handleDP2(value),
      3: () => this._setCapSafe('onoff.gang3', value === 1 || value === true) || this._handleDP3(value),
      4: () => this._setCapSafe('onoff.gang4', value === 1 || value === true) || this._handleBattery(value),
      
      // Temperature (various scales)
      24: () => this._setTemp(value),
      18: () => this._setTemp(value),
      
      // Humidity
      25: () => this._setHumidity(value),
      19: () => this._setHumidity(value),
      
      // Brightness/Dim
      10: () => this._setDim(value),
      
      // Battery (various)
      15: () => this._handleBattery(value),
      
      // Cover position
      7: () => this._setPosition(value),
    };

    const handler = dpMaps[dp];
    if (handler) handler();
  }

  _handleDP2(value) {
    // DP2 can be humidity or brightness depending on device
    if (typeof value === 'number') {
      if (value >= 0 && value <= 100) {
        if (this.hasCapability('measure_humidity')) {
          this._setHumidity(value);
        } else if (this.hasCapability('dim')) {
          this._setDim(value * 10); // 0-100 to 0-1000
        }
      }
    }
  }

  _handleDP3(value) {
    // DP3 can be temp or brightness
    if (typeof value === 'number' && this.hasCapability('measure_temperature')) {
      this._setTemp(value);
    }
  }

  _setTemp(value) {
    if (!this.hasCapability('measure_temperature')) return;
    let temp = value;
    if (temp > 1000) temp = temp / 100;
    else if (temp > 100) temp = temp / 10;
    if (temp >= -40 && temp <= 100) {
      this.setCapabilityValue('measure_temperature', temp).catch(() => {});
    }
  }

  _setHumidity(value) {
    if (!this.hasCapability('measure_humidity')) return;
    let hum = value;
    if (hum > 100) hum = hum / 10;
    if (hum >= 0 && hum <= 100) {
      this.setCapabilityValue('measure_humidity', Math.round(hum)).catch(() => {});
    }
  }

  _setDim(value) {
    if (!this.hasCapability('dim')) return;
    let dim = value;
    if (dim > 1) dim = dim / 1000; // Tuya uses 0-1000
    if (dim >= 0 && dim <= 1) {
      this.setCapabilityValue('dim', dim).catch(() => {});
    }
  }

  _handleBattery(value) {
    if (!this.hasCapability('measure_battery')) return;
    let bat = value;
    if (bat > 100) bat = bat / 2; // Some use 0-200
    if (bat >= 0 && bat <= 100) {
      this.setCapabilityValue('measure_battery', Math.round(bat)).catch(() => {});
    }
  }

  _setPosition(value) {
    if (!this.hasCapability('windowcoverings_set')) return;
    let pos = value / 100;
    if (pos >= 0 && pos <= 1) {
      this.setCapabilityValue('windowcoverings_set', pos).catch(() => {});
    }
  }

  _setCapSafe(cap, value) {
    if (this.hasCapability(cap)) {
      this.setCapabilityValue(cap, value).catch(() => {});
      return true;
    }
    return false;
  }

  _parseRawTuyaFrame(frame) {
    if (!frame?.data) return;
    try {
      const buf = frame.data;
      if (buf.length < 7) return;
      const dp = buf[2];
      const dataType = buf[3];
      const len = (buf[4] << 8) | buf[5];
      let value;
      
      if (dataType === 1) { // Boolean
        value = buf[6] === 1;
      } else if (dataType === 2) { // Number
        value = 0;
        for (let i = 0; i < len; i++) value = (value << 8) | buf[6 + i];
      } else if (dataType === 3) { // String
        value = buf.slice(6, 6 + len).toString('utf8');
      } else if (dataType === 4) { // Enum
        value = buf[6];
      }

      this._handleDP(dp, value, dataType);
    } catch (e) { /* ignore parse errors */ }
  }

  async _setupZCLListeners(zclNode) {
    const ep1 = zclNode?.endpoints?.[1];
    if (!ep1) return;

    // OnOff cluster
    if (ep1.clusters?.onOff) {
      ep1.clusters.onOff.on('attr.onOff', (value) => {
        this._setCapSafe('onoff', value);
      });
    }

    // Level control (dim)
    if (ep1.clusters?.levelControl) {
      ep1.clusters.levelControl.on('attr.currentLevel', (value) => {
        this._setCapSafe('dim', value / 254);
      });
    }

    // Temperature
    if (ep1.clusters?.temperatureMeasurement) {
      ep1.clusters.temperatureMeasurement.on('attr.measuredValue', (value) => {
        this._setCapSafe('measure_temperature', value / 100);
      });
    }

    // Humidity
    if (ep1.clusters?.relativeHumidity) {
      ep1.clusters.relativeHumidity.on('attr.measuredValue', (value) => {
        this._setCapSafe('measure_humidity', value / 100);
      });
    }

    // Battery
    if (ep1.clusters?.powerConfiguration) {
      ep1.clusters.powerConfiguration.on('attr.batteryPercentageRemaining', (value) => {
        this._setCapSafe('measure_battery', value / 2);
      });
    }

    // IAS Zone (alarms)
    if (ep1.clusters?.iasZone) {
      ep1.clusters.iasZone.on('attr.zoneStatus', (status) => {
        const alarm1 = (status & 1) !== 0;
        const alarm2 = (status & 2) !== 0;
        this._setCapSafe('alarm_contact', alarm1 || alarm2);
        this._setCapSafe('alarm_motion', alarm1 || alarm2);
        this._setCapSafe('alarm_water', alarm1 || alarm2);
      });
    }

    this.log('[UNIVERSAL] ZCL listeners active');
  }

  async onSettings({ oldSettings, newSettings, changedKeys }) {
    if (changedKeys.includes('force_device_class')) {
      const newClass = newSettings.force_device_class;
      if (newClass && newClass !== 'auto') {
        this.log('[UNIVERSAL] Forcing device class: ' + newClass);
        await this.setClass(newClass).catch(() => {});
      }
    }
    return true;
  }

  onDeleted() {
    this.log('[UNIVERSAL] Device deleted');
  }
}

module.exports = UniversalFallbackDevice;
