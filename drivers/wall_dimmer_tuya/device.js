'use strict';

const PhysicalButtonMixin = require('../../lib/mixins/PhysicalButtonMixin');
const VirtualButtonMixin = require('../../lib/mixins/VirtualButtonMixin');
const { debug, Cluster } = require('zigbee-clusters');
const TuyaSpecificCluster = require('../../lib/TuyaSpecificCluster');
const TuyaSpecificClusterDevice = require("../../lib/TuyaSpecificClusterDevice");
const { getDataValue } = require('../../lib/TuyaHelpers');
const { V1_SINGLE_GANG_DIMMER_SWITCH_DATA_POINTS } = require('../../lib/TuyaDataPoints');

Cluster.addCluster(TuyaSpecificCluster);

class wall_dimmer_tuya extends TuyaSpecificClusterDevice {

  // v9.0.74: This device is mains-powered. Declare it so UnifiedBatteryHandler
  // does not add a false measure_battery capability (fixes false-battery reports).
  get mainsPowered() { return true; }

  async onNodeInit({ zclNode }) {
    this.printNode();

    // Forum silent-scan: BSEED/Tuya wall dimmers pair but stay mute when Homey
    // interview misses 0xEF00 — compensate before attaching listeners.
    if (typeof this._ensureTuyaIo === 'function') {
      await this._ensureTuyaIo(zclNode);
    }

    // Read and log device attributes
    await this._readDeviceAttributes(zclNode);

    // Setup capability listeners for on/off and dim
    await this._setupGang(zclNode);

    // Attach event listeners for Tuya-specific reports (manual state changes)
    if (!this.hasListenersAttached) {
      const tuya = (typeof this._resolveTuyaCluster === 'function'
        ? this._resolveTuyaCluster(zclNode)
        : null)
        || zclNode?.endpoints?.[1]?.clusters?.tuya
        || zclNode?.endpoints?.[1]?.clusters?.[0xEF00];

      if (tuya?.on) {
        tuya.on('reporting', async (value) => {
          try {
            this.log('Received reporting:', value);
            await this.processDatapoint(value);
          } catch (err) {
            this.error('Error processing datapoint:', err);
          }
        });

        tuya.on('response', async (value) => {
          try {
            this.log('Received response:', value);
            await this.processDatapoint(value);
          } catch (err) {
            this.error('Error processing datapoint:', err);
          }
        });
        this.hasListenersAttached = true;
      } else {
        this.log('[WALL-DIMMER] Tuya cluster missing after compensation — passive I/O armed');
        this.io?._enablePassiveTuyaListen?.({});
      }
    }
  }

  async _readDeviceAttributes(zclNode) {
    try {
      await zclNode.endpoints[1].clusters.basic.readAttributes(['manufacturerName', 'zclVersion', 'appVersion', 'modelId', 'powerSource', 'attributeReportingStatus']);
    } catch (err) {
      this.error('Error when reading device attributes:', err);
    }
  }

  async _setupGang(zclNode) {
    // Register capability listeners
    this.registerCapabilityListener('onoff', async (value) => {
      this.log('onoff:', value);
      try {
        await this.writeBool(V1_SINGLE_GANG_DIMMER_SWITCH_DATA_POINTS.onOff, value);
      } catch (err) {
        this.error('Error when writing onOff:', err);
        throw err;
      }
    });

    this.registerCapabilityListener('dim', async (value) => {
      const brightness = Math.floor(value * 1000); // Scale to 0-1000
      this.log('brightness:', brightness);
      
      try {
        // If dim value is greater than 0 and the device is off, turn it on
        if (brightness > 0 && !this.getCapabilityValue('onoff')) {
          this.log('Dim level is greater than 0, turning on device');
          await this.writeBool(V1_SINGLE_GANG_DIMMER_SWITCH_DATA_POINTS.onOff, true);
          await this['safeSetCapabilityValue']('onoff', true);
        }
    
        // Set the brightness
        await this.writeData32(V1_SINGLE_GANG_DIMMER_SWITCH_DATA_POINTS.brightness, brightness);
    
        // Turning off device if dim level is 0
        if (brightness === 0) {
          this.log('Dim level is 0, turning off device');
          await this.writeBool(V1_SINGLE_GANG_DIMMER_SWITCH_DATA_POINTS.onOff, false);
          await this['safeSetCapabilityValue']('onoff', false);
        }
      } catch (err) {
        this.error('Error when writing brightness:', err);
        throw err;
      }
    });
    
    
  }

  // Process DP reports and update Homey accordingly
  async processDatapoint(data) {
    const dp = data.dp;
    const parsedValue = getDataValue(data);
    const dataType = data.datatype;
    this.log(`Processing DP ${dp}, Data Type: ${dataType}, Parsed Value:`, parsedValue);

    switch (dp) {
      case V1_SINGLE_GANG_DIMMER_SWITCH_DATA_POINTS.onOff:
        this.log('Received on/off:', parsedValue);
        await this['safeSetCapabilityValue']('onoff', parsedValue === true || parsedValue === 1).catch(this._boundError || ((e) => { try { this.error(e); } catch (_) {} }));
        break;

      case V1_SINGLE_GANG_DIMMER_SWITCH_DATA_POINTS.brightness:
        this.log('Received dim level:', parsedValue);
        await this['safeSetCapabilityValue']('dim', parsedValue / 1000).catch(this._boundError || ((e) => { try { this.error(e); } catch (_) {} }));
        break;

      default:
        this.log('Unhandled DP:', dp, 'with value:', parsedValue);
    }
  }

  onDeleted() {
    super.onDeleted();
    this.log('Wall Dimmer removed');
  }

}

module.exports = wall_dimmer_tuya;
