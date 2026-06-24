const PhysicalButtonMixin = require('../../lib/mixins/PhysicalButtonMixin');
const VirtualButtonMixin = require('../../lib/mixins/VirtualButtonMixin');
'use strict';

const { debug, Cluster } = require('zigbee-clusters');
const TuyaSpecificCluster = require('../../lib/TuyaSpecificCluster');
const TuyaSpecificClusterDevice = require("../../lib/TuyaSpecificClusterDevice");
const { getDataValue } = require('../../lib/TuyaHelpers');
const { V1_MULTI_SWITCH_DATA_POINTS } = require('../../lib/TuyaDataPoints');

Cluster.addCluster(TuyaSpecificCluster);

class wall_switch_5_gang_tuya extends TuyaSpecificClusterDevice {

  /**
   * v9.7.4: _setGangOnOff for switch_multi_gang flow card compatibility.
   * Maps gang number to the correct Tuya DP and sends the command.
   */
  async _setGangOnOff(gang, value) {
    const dpMap = {
      1: V1_MULTI_SWITCH_DATA_POINTS.onOffSwitchOne,
      2: V1_MULTI_SWITCH_DATA_POINTS.onOffSwitchTwo,
      3: V1_MULTI_SWITCH_DATA_POINTS.onOffSwitchThree,
      4: V1_MULTI_SWITCH_DATA_POINTS.onOffSwitchFour,
      5: V1_MULTI_SWITCH_DATA_POINTS.onOffSwitchFive,
    };
    const dp = dpMap[gang] || V1_MULTI_SWITCH_DATA_POINTS.onOffSwitchOne;
    this.log(`[FLOW] _setGangOnOff: gang=${gang} dp=${dp} value=${value}`);
    await this.writeBool(dp, value);
  }

  async onNodeInit({ zclNode }) {
    this.printNode();
/*     debug(true);
    this.enableDebug(); */

    const { subDeviceId } = this.getData();
    this.log('Sub device ID:', subDeviceId);

    // Setup capability listeners and event handlers for each gang
    if (this.isSubDevice()) {
      // Handle each subdevice based on the subDeviceId
      switch (subDeviceId) {
        case 'secondGang':
          await this._setupGang(zclNode, 'second gang', V1_MULTI_SWITCH_DATA_POINTS.onOffSwitchTwo);
          break;
        case 'thirdGang':
          await this._setupGang(zclNode, 'third gang', V1_MULTI_SWITCH_DATA_POINTS.onOffSwitchThree);
          break;
        case 'fourthGang':
          await this._setupGang(zclNode, 'fourth gang', V1_MULTI_SWITCH_DATA_POINTS.onOffSwitchFour);
          break;
        case 'fifthGang':
          await this._setupGang(zclNode, 'fifth gang', V1_MULTI_SWITCH_DATA_POINTS.onOffSwitchFive);
          break;
      }
    } else {
      // Main device for the first gang
      await this._setupGang(zclNode, 'first gang', V1_MULTI_SWITCH_DATA_POINTS.onOffSwitchOne);
    }

      zclNode.endpoints[1].clusters.tuya.on("reporting", async (value) => {
        try {
          await this.processDatapoint(value);
        } catch (err) {
          this.error('Error processing datapoint:', err);
        }
      });

      zclNode.endpoints[1].clusters.tuya.on("response", async (value) => {
        try {
          await this.processDatapoint(value);
        } catch (err) {
          this.error('Error processing datapoint:', err);
        }
      });

  }

  async _setupGang(zclNode, gangName, dpOnOff) {
    // Register capability listener for on/off for each gang
    this.registerCapabilityListener('onoff', async (value) => {
      if (typeof this.markAppCommand === 'function') this.markAppCommand();
      this.log(`${gangName} on/off:`, value);
      try {
        await this.writeBool(dpOnOff, value);
      } catch (err) {
        this.error(`Error when writing onOff for ${gangName}:`, err);
        throw err;
      }
    });
  }

  // Process DP reports and update Homey accordingly
  async processDatapoint(data) {
    const dp = data.dp;
    const parsedValue = getDataValue(data);
    const dataType = data.datatype;
    const { subDeviceId } = this.getData(); 
    this.log(`Processing DP ${dp}, Data Type: ${dataType}, Parsed Value:`, parsedValue);

    // Differentiate between gangs by DP
    switch (dp) {
      case V1_MULTI_SWITCH_DATA_POINTS.onOffSwitchOne:
        this.log('Received on/off for first gang:', parsedValue);
        if (!this.isSubDevice()) {
          if (typeof this._triggerPhysicalFlow === 'function') this._triggerPhysicalFlow(parsedValue);
          await this['safeSetCapabilityValue']('onoff', parsedValue).catch(this.error);
        }
        break;

      case V1_MULTI_SWITCH_DATA_POINTS.onOffSwitchTwo:
        this.log('Received on/off for second gang:', parsedValue);
        if (subDeviceId === 'secondGang') {
          if (typeof this._triggerPhysicalFlow === 'function') this._triggerPhysicalFlow(parsedValue);
          await this['safeSetCapabilityValue']('onoff', parsedValue).catch(this.error);
        }
        break;

      case V1_MULTI_SWITCH_DATA_POINTS.onOffSwitchThree:
        this.log('Received on/off for third gang:', parsedValue);
        if (subDeviceId === 'thirdGang') {
          if (typeof this._triggerPhysicalFlow === 'function') this._triggerPhysicalFlow(parsedValue);
          await this['safeSetCapabilityValue']('onoff', parsedValue).catch(this.error);
        }
        break;

      case V1_MULTI_SWITCH_DATA_POINTS.onOffSwitchFour:
        this.log('Received on/off for fourth gang:', parsedValue);
        if (subDeviceId === 'fourthGang') {
          if (typeof this._triggerPhysicalFlow === 'function') this._triggerPhysicalFlow(parsedValue);
          await this['safeSetCapabilityValue']('onoff', parsedValue).catch(this.error);
        }
        break;

      case V1_MULTI_SWITCH_DATA_POINTS.onOffSwitchFive:
        this.log('Received on/off for fifth gang:', parsedValue);
        if (subDeviceId === 'fifthGang') {
          if (typeof this._triggerPhysicalFlow === 'function') this._triggerPhysicalFlow(parsedValue);
          await this['safeSetCapabilityValue']('onoff', parsedValue).catch(this.error);
        }
        break;

      default:
        this.log('Unhandled DP:', dp, 'with value:', parsedValue);
    }
  }

  onDeleted() {
    super.onDeleted();
    this.log('5 Gang Wall Switch removed');
  }
}

module.exports = wall_switch_5_gang_tuya;
