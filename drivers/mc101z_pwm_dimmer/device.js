'use strict';

const { Cluster } = require('zigbee-clusters');
const TuyaSpecificCluster = require('../../lib/TuyaSpecificCluster');
const TuyaSpecificClusterDevice = require('../../lib/TuyaSpecificClusterDevice');
const { getDataValue } = require('../../lib/TuyaHelpers');
const { toTuyaBrightness, fromTuyaBrightness } = require('../../lib/tuya/TuyaBrightnessScale');

Cluster.addCluster(TuyaSpecificCluster);

const DP_ONOFF = 1;
const DP_BRIGHTNESS = 3;

class MC101ZPWMDimmerDevice extends TuyaSpecificClusterDevice {

  get mainsPowered() { return true; }

  async onNodeInit({ zclNode }) {
    this.printNode();

    if (typeof this._ensureTuyaIo === 'function') {
      await this._ensureTuyaIo(zclNode);
    }

    this.registerCapabilityListener('onoff', async (value) => {
      this.log('onoff:', value);
      await this.writeBool(DP_ONOFF, value);
    });

    this.registerCapabilityListener('dim', async (value) => {
      const brightness = toTuyaBrightness(value);
      this.log('brightness:', brightness);

      if (brightness > 0 && !this.getCapabilityValue('onoff')) {
        await this.writeBool(DP_ONOFF, true);
        await this.safeSetCapabilityValue('onoff', true);
      }

      await this.writeData32(DP_BRIGHTNESS, brightness);

      if (brightness === 0) {
        await this.writeBool(DP_ONOFF, false);
        await this.safeSetCapabilityValue('onoff', false);
      }
    });

    if (!this.hasListenersAttached) {
      const tuya = (typeof this._resolveTuyaCluster === 'function'
        ? this._resolveTuyaCluster(zclNode)
        : null)
        || zclNode?.endpoints?.[1]?.clusters?.tuya
        || zclNode?.endpoints?.[1]?.clusters?.[0xEF00];

      if (tuya?.on) {
        const process = async (value) => {
          try {
            await this.processDatapoint(value);
          } catch (err) {
            this.error('Error processing datapoint:', err);
          }
        };

        tuya.on('reporting', process);
        tuya.on('response', process);
        this.hasListenersAttached = true;
      } else {
        this.log('[MC101Z] Tuya cluster unavailable; passive RX via DeviceIO');
      }
    }
  }

  async processDatapoint(data) {
    const dp = data.dp;
    const parsedValue = getDataValue(data);

    this.log(`Processing DP ${dp}, Data Type: ${data.datatype}, Parsed Value:`, parsedValue);

    switch (dp) {
      case DP_ONOFF:
        await this.safeSetCapabilityValue(
          'onoff',
          parsedValue === true || parsedValue === 1,
        );
        break;

      case DP_BRIGHTNESS:
        await this.safeSetCapabilityValue(
          'dim',
          fromTuyaBrightness(parsedValue),
        );
        break;

      default:
        this.log('Unhandled DP:', dp, 'with value:', parsedValue);
    }
  }

  onDeleted() {
    super.onDeleted();
    this.log('MC101Z PWM Dimmer removed');
  }
}

module.exports = MC101ZPWMDimmerDevice;
