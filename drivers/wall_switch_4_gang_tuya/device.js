'use strict';

const { Cluster } = require('zigbee-clusters');
const TuyaSpecificCluster = require('../../lib/TuyaSpecificCluster');
const TuyaSpecificClusterDevice = require("../../lib/TuyaSpecificClusterDevice");
const { getDataValue } = require('../../lib/TuyaHelpers');
const { V1_MULTI_SWITCH_DATA_POINTS } = require('../../lib/TuyaDataPoints');

Cluster.addCluster(TuyaSpecificCluster);

class wall_switch_4_gang_tuya extends TuyaSpecificClusterDevice {

  get mainsPowered() { return true; }

  get gangCount() { return 4; }

  /**
   * v9.7.4: _setGangOnOff for switch_multi_gang flow card compatibility.
   * Maps gang number to the correct Tuya DP and sends the command.
   * Each sub-device instance overrides its gang via _gangNumber.
   */
  async _setGangOnOff(gang, value) {
    const dpMap = {
      1: V1_MULTI_SWITCH_DATA_POINTS.onOffSwitchOne,
      2: V1_MULTI_SWITCH_DATA_POINTS.onOffSwitchTwo,
      3: V1_MULTI_SWITCH_DATA_POINTS.onOffSwitchThree,
      4: V1_MULTI_SWITCH_DATA_POINTS.onOffSwitchFour,
    };
    const dp = dpMap[gang] || V1_MULTI_SWITCH_DATA_POINTS.onOffSwitchOne;
    this.log(`[FLOW] _setGangOnOff: gang=${gang} dp=${dp} value=${value}`);
    await this.writeBool(dp, value);
  }

  async onNodeInit({ zclNode }) {
    this.printNode();

    const { subDeviceId } = this.getData();
    this.log('Sub device ID:', subDeviceId);
    this._gangNumber = subDeviceId === 'secondGang' ? 2
      : subDeviceId === 'thirdGang' ? 3
      : subDeviceId === 'fourthGang' ? 4
      : 1;
    this._isSubDevice = Boolean(subDeviceId);

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

      // v10.6.2 FIX: listeners for the declared button.1..4 maintenance buttons.
      // TuyaSpecificClusterDevice registers no capability listeners for them, so
      // pressing a button in the app UI logged "Missing Capability Listener:
      // Button N" (diag Gmail 16/07/2026). Pressing button.N toggles Tuya DP N.
      // Sub-devices only carry the onoff capability (hasCapability guard).
      const gangDps = {
        1: V1_MULTI_SWITCH_DATA_POINTS.onOffSwitchOne,
        2: V1_MULTI_SWITCH_DATA_POINTS.onOffSwitchTwo,
        3: V1_MULTI_SWITCH_DATA_POINTS.onOffSwitchThree,
        4: V1_MULTI_SWITCH_DATA_POINTS.onOffSwitchFour,
      };
      for (const [gang, dp] of Object.entries(gangDps)) {
        const cap = `button.${gang}`;
        if (!this.hasCapability(cap)) {continue;}
        this.registerCapabilityListener(cap, async () => {
          const next = !this._dpStates?.[dp];
          this.log(`${cap} pressed (UI) — DP${dp} → ${next}`);
          try {
            await this.writeBool(dp, next);
          } catch (err) {
            this.error(`Error when toggling DP${dp}:`, err);
            throw err;
          }
          return true;
        });
      }

  }

  async _setupGang(zclNode, gangName, dpOnOff) {
    // Register capability listener for on/off for each gang
    this.registerCapabilityListener('onoff', async (value) => {
      if (typeof this.markAppCommand === 'function') {this.markAppCommand();}
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

    // Track last known DP states (used by the button.N UI listeners)
    this._dpStates = this._dpStates || {};
    this._dpStates[dp] = parsedValue;

    // Differentiate between gangs by DP
    // WHY(P2332): pass (gang, on|off) so mixin path works; legacy bool still OK
    switch (dp) {
      case V1_MULTI_SWITCH_DATA_POINTS.onOffSwitchOne:
        this.log('Received on/off for first gang:', parsedValue);
        if (!this.isSubDevice()) {
          if (typeof this._triggerPhysicalFlow === 'function') {
            this._triggerPhysicalFlow(1, parsedValue ? 'on' : 'off');
          }
          await this['safeSetCapabilityValue']('onoff', parsedValue).catch(this._boundError || ((e) => { try { this.error(e); } catch (_) {} }));
        }
        break;

      case V1_MULTI_SWITCH_DATA_POINTS.onOffSwitchTwo:
        this.log('Received on/off for second gang:', parsedValue);
        if (subDeviceId === 'secondGang') {
          if (typeof this._triggerPhysicalFlow === 'function') {
            this._triggerPhysicalFlow(2, parsedValue ? 'on' : 'off');
          }
          await this['safeSetCapabilityValue']('onoff', parsedValue).catch(this._boundError || ((e) => { try { this.error(e); } catch (_) {} }));
        }
        break;

      case V1_MULTI_SWITCH_DATA_POINTS.onOffSwitchThree:
        this.log('Received on/off for third gang:', parsedValue);
        if (subDeviceId === 'thirdGang') {
          if (typeof this._triggerPhysicalFlow === 'function') {
            this._triggerPhysicalFlow(3, parsedValue ? 'on' : 'off');
          }
          await this['safeSetCapabilityValue']('onoff', parsedValue).catch(this._boundError || ((e) => { try { this.error(e); } catch (_) {} }));
        }
        break;

      case V1_MULTI_SWITCH_DATA_POINTS.onOffSwitchFour:
        this.log('Received on/off for fourth gang:', parsedValue);
        if (subDeviceId === 'fourthGang') {
          if (typeof this._triggerPhysicalFlow === 'function') {
            this._triggerPhysicalFlow(4, parsedValue ? 'on' : 'off');
          }
          await this['safeSetCapabilityValue']('onoff', parsedValue).catch(this._boundError || ((e) => { try { this.error(e); } catch (_) {} }));
        }
        break;

      default:
        this.log('Unhandled DP:', dp, 'with value:', parsedValue);
    }
  }

  onDeleted() {
    super.onDeleted();
    this.log('4 Gang Wall Switch removed');
  }
}

module.exports = wall_switch_4_gang_tuya;
