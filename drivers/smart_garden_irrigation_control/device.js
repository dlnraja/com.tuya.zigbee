'use strict';

const ZclBatteryMonitor = require('../../lib/battery/ZclBatteryMonitor');
const Homey = require('homey');
const { ZigBeeDevice } = require('homey-zigbeedriver');
const { Cluster, debug, CLUSTER } = require('zigbee-clusters');
const TuyaSpecificCluster = require('../../lib/TuyaSpecificCluster');

Cluster.addCluster(TuyaSpecificCluster);

const DEFAULT_ONOFF_DURATION = 1000

class IrrigationController extends ZigBeeDevice {

  async onNodeInit({zclNode}) {
    // Primary battery path (attr listeners + initial read)
    ZclBatteryMonitor.attach(this, zclNode);

    this.printNode();

    this.registerCapability('onoff', CLUSTER.ON_OFF);

    this.registerCapabilityListener("onoff", async (value, options) => {
      this.log(`value ${value}`);
      this.log(`options ${options.duration}`);
      if (value && options.duration != undefined ){
        await zclNode.endpoints[1].clusters['onOff'].setOn();
        this._onOffTimeout = this.homey.setTimeout(async () => {
          if (this._destroyed) {return;}
          await zclNode.endpoints[1].clusters['onOff'].setOff();
        }, options.duration);
      } else if(value && options.duration === undefined){
        await zclNode.endpoints[1].clusters['onOff'].setOn();
      } else if(!value && options.duration === undefined){
        await zclNode.endpoints[1].clusters['onOff'].setOff();
      }
    });
  
    await this.configureAttributeReporting([
      {
          endpointId: 1,
          cluster: CLUSTER.POWER_CONFIGURATION,
          attributeName: 'batteryPercentageRemaining',
          minInterval: 60, // Minimum interval (1 minute)
          maxInterval: 21600, // Maximum interval (6 hours)
          minChange: 1, // Report changes greater than 1%
      }
    ]);
    // Battery % via ZclBatteryMonitor.attach (UnifiedBatteryHandler) — no naive /2 path
  }

  async onDeleted() {
    this._destroyed = true;
    await super.onDeleted();
    this.log('Smart irrigation controller removed');
  }

  onUninit() {
    if (this._onOffTimeout) {
      this.homey.clearTimeout(this._onOffTimeout);
    }
  }

}

module.exports = IrrigationController;
