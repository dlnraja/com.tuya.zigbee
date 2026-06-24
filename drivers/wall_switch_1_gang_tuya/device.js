const PhysicalButtonMixin = require('../../lib/mixins/PhysicalButtonMixin');
const VirtualButtonMixin = require('../../lib/mixins/VirtualButtonMixin');
'use strict';

const { debug, Cluster } = require('zigbee-clusters');
const TuyaSpecificCluster = require('../../lib/TuyaSpecificCluster');
const TuyaSpecificClusterDevice = require("../../lib/TuyaSpecificClusterDevice");
const TuyaOnOffCluster = require('../../lib/TuyaOnOffCluster');
const {getDataValue} = require('./helpers');

Cluster.addCluster(TuyaSpecificCluster);
Cluster.addCluster(TuyaOnOffCluster)


class wall_switch_1_gang_tuya extends TuyaSpecificClusterDevice {

  /**
   * v9.7.4: _setGangOnOff for switch_multi_gang flow card compatibility.
   * Single-gang: always writes DP 1.
   */
  async _setGangOnOff(gang, value) {
    this.log(`[FLOW] _setGangOnOff: gang=${gang} value=${value}`);
    await this.writeBool(1, value);
  }

  async onNodeInit({ zclNode }) {
    await super.onNodeInit({ zclNode });

    this.printNode();
/*     debug(true);
    this.enableDebug(); */

    await zclNode.endpoints[1].clusters.basic.readAttributes(['manufacturerName', 'zclVersion', 'appVersion', 'modelId', 'powerSource', 'attributeReportingStatus'])
    .catch(err => {
      this.error('Error when reading device attributes ', err);
    });

    this.registerCapabilityListener('onoff', async (onOff) => {
      try{
      await this.writeBool(1, onOff)
      this.log('device on/off set', onOff)
      } catch (e) {
        this.log("Failed to set on/off", e);
      }
    });

    zclNode.endpoints[1].clusters.tuya.on("reporting", value => this.processResponse(value));
    zclNode.endpoints[1].clusters.tuya.on("response", value => this.processResponse(value));

    this.log("🚀 Wall switch booted up!")

  }

async processResponse(data) {
  const dp = data.dp;
  const parsedValue = getDataValue(data);

          this.log('Wall switch on/off received', parsedValue);
          try {
            await this['safeSetCapabilityValue']('onoff', parsedValue);
          } catch (e) {
              this.log("Failed to set on/off", e);
          }
  }

  onDeleted() {
    super.onDeleted();
    this.log('1 Gang Wall GPP Switch removed');
  }

}

module.exports = wall_switch_1_gang_tuya;
