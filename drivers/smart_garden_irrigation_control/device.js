'use strict';

const ZclBatteryMonitor = require('../../lib/battery/ZclBatteryMonitor');
const TuyaZigbeeDevice = require('../../lib/tuya/TuyaZigbeeDevice');
const { Cluster, CLUSTER } = require('zigbee-clusters');
const TuyaSpecificCluster = require('../../lib/TuyaSpecificCluster');
const { safeSetTimeout, safeClearTimeout } = require('../../lib/utils/safe-timers');

Cluster.addCluster(TuyaSpecificCluster);

/**
 * P124 — TuyaZigbeeDevice + safe-timers (no bare setTimeout / destroyed race)
 */
class IrrigationController extends TuyaZigbeeDevice {

  async onNodeInit({ zclNode }) {
    await super.onNodeInit({ zclNode });
    ZclBatteryMonitor.attach(this, zclNode);

    this.printNode();

    this.registerCapability('onoff', CLUSTER.ON_OFF);

    this.registerCapabilityListener('onoff', async (value, options) => {
      this.log(`value ${value}`);
      this.log(`options ${options.duration}`);
      if (value && options.duration != undefined) {
        await zclNode.endpoints[1].clusters.onOff.setOn();
        if (this._onOffTimeout) safeClearTimeout(this, this._onOffTimeout);
        this._onOffTimeout = safeSetTimeout(this, async () => {
          if (this._destroyed) return;
          await zclNode.endpoints[1].clusters.onOff.setOff();
        }, options.duration);
      } else if (value && options.duration === undefined) {
        await zclNode.endpoints[1].clusters.onOff.setOn();
      } else if (!value && options.duration === undefined) {
        await zclNode.endpoints[1].clusters.onOff.setOff();
      }
    });

    await this.configureAttributeReporting([
      {
        endpointId: 1,
        cluster: CLUSTER.POWER_CONFIGURATION,
        attributeName: 'batteryPercentageRemaining',
        minInterval: 60,
        maxInterval: 21600,
        minChange: 1,
      },
    ]);
  }

  async onDeleted() {
    this._destroyed = true;
    if (this._onOffTimeout) {
      safeClearTimeout(this, this._onOffTimeout);
      this._onOffTimeout = null;
    }
    await super.onDeleted();
    this.log('Smart irrigation controller removed');
  }

  onUninit() {
    if (this._onOffTimeout) {
      safeClearTimeout(this, this._onOffTimeout);
      this._onOffTimeout = null;
    }
  }
}

module.exports = IrrigationController;
