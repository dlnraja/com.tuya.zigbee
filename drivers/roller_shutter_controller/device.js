'use strict';

const { ZigBeeDevice } = require('homey-zigbeedriver');

class RollerShutterControllerDevice extends ZigBeeDevice {

  async onNodeInit({ zclNode }) {
    
    // Register capabilities
    if (this.hasCapability('windowcoverings_set')) {
      this.registerCapability('windowcoverings_set', 'genLevelCtrl', {
        set: 'moveToLevelWithOnOff',
        setParser(value) {
          return {
            level: Math.round(value * 254),
            transtime: 1
          };
        }
      });
    }

    if (this.hasCapability('windowcoverings_state')) {
      this.registerCapability('windowcoverings_state', 'genLevelCtrl');
    }

    // Battery reporting
    if (this.hasCapability('alarm_battery')) {
      this.registerCapability('alarm_battery', 'genPowerCfg', {
        get: 'batteryPercentageRemaining',
        report: 'batteryPercentageRemaining',
        getOpts: {
          getOnStart: true,
        },
        reportParser: value => value < 20
      });
    }

    await super.onNodeInit({ zclNode });
  }

}

module.exports = RollerShutterControllerDevice;
