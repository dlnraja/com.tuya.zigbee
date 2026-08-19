'use strict';

const { Cluster } = require('zigbee-clusters');
const TuyaSpecificCluster = require('../../lib/TuyaSpecificCluster');
const TuyaSpecificClusterDevice = require('../../lib/TuyaSpecificClusterDevice');
const { getDataValue } = require('../../lib/TuyaHelpers');
const { V1_SINGLE_GANG_DIMMER_SWITCH_DATA_POINTS } = require('../../lib/TuyaDataPoints');
const { toTuyaBrightness, fromTuyaBrightness } = require('../../lib/tuya/TuyaBrightnessScale');

Cluster.addCluster(TuyaSpecificCluster);

class wall_dimmer_tuya extends TuyaSpecificClusterDevice {

  get mainsPowered() { return true; }

  async onNodeInit({ zclNode }) {
    await super.onNodeInit({ zclNode });
    this.printNode();

    if (this.mainsPowered) {
      if (this.hasCapability('measure_battery')) {
        await this.removeCapability('measure_battery').catch(() => {});
      }
      if (this.hasCapability('alarm_battery')) {
        await this.removeCapability('alarm_battery').catch(() => {});
      }
    }

    await this._readDeviceAttributes(zclNode);
    await this._setupGang(zclNode);

    if (!this.hasListenersAttached) {
      const tuya = zclNode?.endpoints?.[1]?.clusters?.tuya
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
        this.log('[WALL-DIMMER] Tuya EF00 cluster missing — cannot attach DP listeners');
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
    this.registerCapabilityListener('onoff', async (value) => {
      if (typeof this.markAppCommand === 'function') {this.markAppCommand();}
      this.log('onoff:', value);
      try {
        await this.writeBool(V1_SINGLE_GANG_DIMMER_SWITCH_DATA_POINTS.onOff, value);
      } catch (err) {
        this.error('Error when writing onOff:', err);
        throw err;
      }
    });

    this.registerCapabilityListener('dim', async (value) => {
      if (typeof this.markAppCommand === 'function') {this.markAppCommand();}
      const brightness = toTuyaBrightness(value);
      this.log('brightness:', brightness);

      try {
        if (brightness > 0 && !this.getCapabilityValue('onoff')) {
          this.log('Dim level is greater than 0, turning on device');
          await this.writeBool(V1_SINGLE_GANG_DIMMER_SWITCH_DATA_POINTS.onOff, true);
          await this['safeSetCapabilityValue']('onoff', true);
        }

        await this.writeData32(V1_SINGLE_GANG_DIMMER_SWITCH_DATA_POINTS.brightness, brightness);

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

  async processDatapoint(data) {
    const dp = data.dp;
    const parsedValue = getDataValue(data);
    const dataType = data.datatype;
    this.log(`Processing DP ${dp}, Data Type: ${dataType}, Parsed Value:`, parsedValue);

    switch (dp) {
      case V1_SINGLE_GANG_DIMMER_SWITCH_DATA_POINTS.onOff:
        this.log('Received on/off:', parsedValue);
        await this['safeSetCapabilityValue']('onoff', parsedValue === true || parsedValue === 1).catch(this.error);
        break;

      case V1_SINGLE_GANG_DIMMER_SWITCH_DATA_POINTS.brightness:
        this.log('Received dim level:', parsedValue);
        await this['safeSetCapabilityValue']('dim', fromTuyaBrightness(parsedValue)).catch(this.error);
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
